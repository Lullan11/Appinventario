// Configuración
const API_URL = "https://inventario-api-gw73.onrender.com";
const API_CRONOGRAMAS = `${API_URL}/cronogramas`;
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/dzkccjhn9/raw/upload`;
const UPLOAD_PRESET = 'inventario';

let documentos = [];
let documentoAEliminar = null;

// ✅ Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Iniciando módulo de cronogramas');

    // Verificar autenticación
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../index.html';
        return;
    }

    // Cargar información del usuario
    cargarInfoUsuario();

    await cargarDocumentos();
    configurarEventos();
});

// ✅ Cargar información del usuario
function cargarInfoUsuario() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');

    if (userName) userName.textContent = usuario.nombre || 'Usuario';
    if (userRole) {
        userRole.textContent = usuario.rol || 'Técnico';
        // Color según rol
        if (usuario.rol === 'administrador') {
            userRole.style.backgroundColor = '#dc2626';
            userRole.style.color = 'white';
        } else if (usuario.rol === 'supervisor') {
            userRole.style.backgroundColor = '#3b82f6';
            userRole.style.color = 'white';
        }
    }
}

// ✅ Cargar documentos
async function cargarDocumentos() {
    try {
        mostrarCargando(true);

        const response = await fetch(API_CRONOGRAMAS);
        if (!response.ok) throw new Error('Error cargando documentos');

        documentos = await response.json();
        console.log(`✅ ${documentos.length} documentos cargados`);

        // DEBUG: Ver estructura
        if (documentos.length > 0) {
            console.log('📋 Primer documento:', documentos[0]);
        }

        mostrarDocumentos(documentos);

    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('Error cargando documentos', true);
        document.getElementById('lista-documentos').innerHTML = `
            <div class="col-span-3 text-center py-10 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-4"></i>
                <p>Error al cargar documentos</p>
                <button onclick="cargarDocumentos()" class="mt-4 text-[#639A33] hover:underline">
                    Reintentar
                </button>
            </div>
        `;
    } finally {
        mostrarCargando(false);
    }
}

// ✅ Mostrar documentos en la lista
function mostrarDocumentos(lista) {
    const container = document.getElementById('lista-documentos');
    const sinDocumentos = document.getElementById('sin-documentos');

    if (lista.length === 0) {
        container.innerHTML = '';
        sinDocumentos.classList.remove('hidden');
        return;
    }

    sinDocumentos.classList.add('hidden');

    container.innerHTML = lista.map(doc => {
        // Escapar comillas para evitar errores de JavaScript
        const nombreSeguro = doc.nombre_documento.replace(/'/g, "\\'").replace(/"/g, '\\"');
        const descripcionSegura = (doc.descripcion || 'Sin descripción').replace(/'/g, "\\'").replace(/"/g, '\\"');
        const urlSegura = doc.documento_url.replace(/'/g, "\\'").replace(/"/g, '\\"');
        const docId = doc.id;

        // SOLUCIÓN DEFINITIVA PARA LA FECHA
        let fecha = 'Sin fecha';
        if (doc.fecha_subida) {
            try {
                // Método 1: Parsear manualmente la fecha (más confiable)
                const fechaStr = doc.fecha_subida;
                
                // Si la fecha viene como "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss.sssZ"
                if (fechaStr.includes('T')) {
                    // Extraer solo la parte de la fecha (antes de la T)
                    const fechaParte = fechaStr.split('T')[0];
                    const partes = fechaParte.split('-');
                    if (partes.length === 3) {
                        const año = parseInt(partes[0]);
                        const mes = parseInt(partes[1]) - 1; // Meses en JS son 0-11
                        const dia = parseInt(partes[2]);
                        
                        // Crear fecha UTC (sin problemas de zona horaria)
                        const fechaUTC = new Date(Date.UTC(año, mes, dia));
                        fecha = fechaUTC.toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            timeZone: 'UTC' // Forzar UTC
                        });
                    }
                } else if (fechaStr.includes('-')) {
                    // Ya viene como "YYYY-MM-DD"
                    const partes = fechaStr.split('-');
                    if (partes.length === 3) {
                        const año = parseInt(partes[0]);
                        const mes = parseInt(partes[1]) - 1;
                        const dia = parseInt(partes[2]);
                        
                        const fechaUTC = new Date(Date.UTC(año, mes, dia));
                        fecha = fechaUTC.toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            timeZone: 'UTC'
                        });
                    }
                }
                
                // Si aún no tenemos fecha formateada, usar método alternativo
                if (fecha === 'Sin fecha') {
                    // Método alternativo: Cortar la fecha y mostrar como está
                    const fechaCortada = fechaStr.split('T')[0];
                    const [año, mes, dia] = fechaCortada.split('-');
                    
                    // Formatear manualmente
                    const meses = [
                        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
                    ];
                    fecha = `${parseInt(dia)} de ${meses[parseInt(mes) - 1]} de ${año}`;
                }
                
            } catch (e) {
                console.error('Error formateando fecha:', e, 'Fecha original:', doc.fecha_subida);
                // Último recurso: mostrar la fecha como viene
                fecha = doc.fecha_subida.split('T')[0] || doc.fecha_subida;
            }
        }

        const tamaño = formatoTamaño(doc.documento_tamaño || 0);

        return `
            <div class="documento-card bg-white rounded-lg shadow p-5">
                <div class="flex items-start gap-4 mb-4">
                    <div class="file-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-lg mb-1 truncate">${doc.nombre_documento}</h3>
                        <p class="text-gray-600 text-sm mb-2">${doc.descripcion || 'Sin descripción'}</p>
                        <div class="flex items-center gap-4 text-sm text-gray-500">
                            <span><i class="far fa-calendar mr-1"></i> ${fecha}</span>
                            <span><i class="fas fa-weight-hanging mr-1"></i> ${tamaño}</span>
                            <span><i class="fas fa-user mr-1"></i> ${doc.subido_por || 'Usuario'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="flex gap-2">
                    <button onclick="verDocumento('${urlSegura}', '${nombreSeguro}')"
                            class="flex-1 bg-blue-100 text-blue-700 py-2 rounded hover:bg-blue-200 transition-colors">
                        <i class="fas fa-eye mr-2"></i> Ver
                    </button>
                    <button onclick="descargarArchivo('${urlSegura}', '${nombreSeguro}.pdf')"
                            class="flex-1 bg-green-100 text-green-700 py-2 rounded hover:bg-green-200 transition-colors">
                        <i class="fas fa-download mr-2"></i> Descargar
                    </button>
                    <button onclick="solicitarEliminarDocumento('${docId}', '${nombreSeguro}')"
                            class="flex-1 bg-red-100 text-red-700 py-2 rounded hover:bg-red-200 transition-colors">
                        <i class="fas fa-trash mr-2"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ✅ Solicitar eliminación de documento
function solicitarEliminarDocumento(id, nombre) {
    if (!id) {
        console.error('ID inválido para eliminar:', id);
        mostrarMensaje('Error: ID del documento no válido', true);
        return;
    }

    documentoAEliminar = id;

    const mensaje = document.getElementById('mensaje-confirmacion');
    if (mensaje) {
        mensaje.textContent = `¿Estás seguro de que deseas eliminar el cronograma "${nombre}"?`;
    }

    const modal = document.getElementById('modal-confirmar-eliminar');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// ✅ Cerrar modal de confirmación
function cerrarModalConfirmar() {
    documentoAEliminar = null;
    const modal = document.getElementById('modal-confirmar-eliminar');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// ✅ Confirmar y ejecutar eliminación
async function confirmarEliminacion() {
    if (!documentoAEliminar) {
        mostrarMensaje('No se ha seleccionado ningún documento para eliminar', true);
        cerrarModalConfirmar();
        return;
    }

    try {
        mostrarMensaje('Eliminando documento...');

        // Eliminar de la base de datos
        const deleteResponse = await fetch(`${API_CRONOGRAMAS}/${documentoAEliminar}`, {
            method: 'DELETE'
        });

        if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            throw new Error(`Error eliminando documento: ${errorText}`);
        }

        // Éxito
        mostrarMensaje('✅ Documento eliminado correctamente');
        cerrarModalConfirmar();
        await cargarDocumentos();

    } catch (error) {
        console.error('Error eliminando:', error);
        mostrarMensaje('Error al eliminar documento: ' + error.message, true);
    } finally {
        documentoAEliminar = null;
    }
}

// ✅ Filtrar documentos
function filtrarDocumentos() {
    const busqueda = document.getElementById('buscar-documento').value.toLowerCase();

    if (!busqueda) {
        mostrarDocumentos(documentos);
        return;
    }

    const filtrados = documentos.filter(doc =>
        doc.nombre_documento.toLowerCase().includes(busqueda) ||
        (doc.descripcion && doc.descripcion.toLowerCase().includes(busqueda)) ||
        (doc.subido_por && doc.subido_por.toLowerCase().includes(busqueda))
    );

    mostrarDocumentos(filtrados);
}

// ✅ Mostrar modal para subir
function mostrarModalSubir() {
    const modal = document.getElementById('modal-subir');
    const form = document.getElementById('form-subir');

    if (form) form.reset();
    document.getElementById('nombre-archivo').classList.add('hidden');
    document.getElementById('area-arrastrar').classList.remove('hidden');

    modal.classList.remove('hidden');
}

// ✅ Cerrar modal de subir
function cerrarModalSubir() {
    document.getElementById('modal-subir').classList.add('hidden');
}

// ✅ Mostrar nombre del archivo seleccionado
function mostrarNombreArchivo() {
    const input = document.getElementById('archivo-documento');
    const file = input.files[0];

    if (file) {
        document.getElementById('texto-nombre-archivo').textContent = file.name;
        document.getElementById('nombre-archivo').classList.remove('hidden');
        document.getElementById('area-arrastrar').classList.add('hidden');
    }
}

// ✅ Limpiar archivo seleccionado
function limpiarArchivo() {
    document.getElementById('archivo-documento').value = '';
    document.getElementById('nombre-archivo').classList.add('hidden');
    document.getElementById('area-arrastrar').classList.remove('hidden');
}

// ✅ Subir documento
async function subirDocumento() {
    const nombre = document.getElementById('nombre-documento').value;
    const descripcion = document.getElementById('descripcion-documento').value;
    const archivoInput = document.getElementById('archivo-documento');
    const archivo = archivoInput.files[0];

    if (!archivo) {
        mostrarMensaje('Selecciona un archivo PDF', true);
        return;
    }

    if (archivo.type !== 'application/pdf') {
        mostrarMensaje('Solo se permiten archivos PDF', true);
        return;
    }

    if (archivo.size > 10 * 1024 * 1024) {
        mostrarMensaje('El archivo es muy grande (máx. 10MB)', true);
        return;
    }

    try {
        // Deshabilitar botón
        const btn = document.getElementById('btn-subir');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Subiendo...';

        mostrarMensaje('Subiendo documento...');

        // 1. Subir a Cloudinary
        const formData = new FormData();
        formData.append('file', archivo);
        formData.append('upload_preset', UPLOAD_PRESET);

        const cloudinaryRes = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData
        });

        if (!cloudinaryRes.ok) {
            const errorText = await cloudinaryRes.text();
            throw new Error(`Error subiendo a Cloudinary: ${errorText}`);
        }

        const cloudinaryData = await cloudinaryRes.json();

        // 2. Guardar en base de datos
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

        const documentoData = {
            nombre_documento: nombre,
            descripcion: descripcion,
            documento_url: cloudinaryData.secure_url,
            documento_public_id: cloudinaryData.public_id,
            documento_nombre_original: archivo.name,
            documento_tamaño: archivo.size,
            subido_por: usuario.nombre || 'Usuario'
        };

        const dbRes = await fetch(API_CRONOGRAMAS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(documentoData)
        });

        if (!dbRes.ok) {
            const errorText = await dbRes.text();
            throw new Error(`Error guardando en base de datos: ${errorText}`);
        }

        // 3. Éxito
        mostrarMensaje('✅ Documento subido correctamente');
        cerrarModalSubir();
        await cargarDocumentos();

    } catch (error) {
        console.error('Error subiendo:', error);
        mostrarMensaje('Error al subir documento: ' + error.message, true);
    } finally {
        // Restaurar botón
        const btn = document.getElementById('btn-subir');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-upload mr-2"></i>Subir Documento';
        }
    }
}

// ✅ Ver documento
function verDocumento(url, nombre) {
    const modal = document.getElementById('modal-ver');
    const titulo = document.getElementById('modal-titulo');
    const visor = document.getElementById('visor-pdf');

    if (!modal || !titulo || !visor) {
        mostrarMensaje('Error al abrir el visor', true);
        return;
    }

    titulo.textContent = nombre;
    visor.src = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

    // Guardar datos para descargar
    visor.dataset.url = url;
    visor.dataset.nombre = nombre;

    modal.classList.remove('hidden');
}

// ✅ Cerrar modal de ver
function cerrarModalVer() {
    const modal = document.getElementById('modal-ver');
    const visor = document.getElementById('visor-pdf');

    if (visor) visor.src = '';
    if (modal) modal.classList.add('hidden');
}

// ✅ Descargar documento
function descargarDocumento() {
    const visor = document.getElementById('visor-pdf');
    if (!visor || !visor.dataset.url) {
        mostrarMensaje('No hay documento para descargar', true);
        return;
    }

    const url = visor.dataset.url;
    const nombre = visor.dataset.nombre || 'documento';

    descargarArchivo(url, `${nombre}.pdf`);
}

// ✅ Descargar archivo (función general)
async function descargarArchivo(url, nombreArchivo) {
    try {
        mostrarMensaje('Preparando descarga...');

        const response = await fetch(url);
        if (!response.ok) throw new Error('Error obteniendo archivo');

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

        mostrarMensaje('✅ Descarga iniciada');

    } catch (error) {
        console.error('Error descargando:', error);

        // Fallback: abrir en nueva pestaña
        window.open(url, '_blank');
        mostrarMensaje('Documento abierto en nueva pestaña');
    }
}

// ✅ Abrir en nueva pestaña
function abrirEnNuevaPestana() {
    const visor = document.getElementById('visor-pdf');
    if (!visor || !visor.dataset.url) {
        mostrarMensaje('No hay documento para abrir', true);
        return;
    }

    const url = visor.dataset.url;
    window.open(url, '_blank');
}

// ✅ Configurar eventos
function configurarEventos() {
    // Configurar búsqueda
    const buscarInput = document.getElementById('buscar-documento');
    if (buscarInput) {
        buscarInput.addEventListener('input', filtrarDocumentos);
    }

    // Configurar área de arrastrar y soltar
    const areaArrastrar = document.getElementById('area-arrastrar');
    const inputArchivo = document.getElementById('archivo-documento');

    if (areaArrastrar && inputArchivo) {
        // Hacer clic en el área para seleccionar archivo
        areaArrastrar.addEventListener('click', () => {
            inputArchivo.click();
        });

        // Mostrar nombre del archivo cuando se selecciona
        inputArchivo.addEventListener('change', mostrarNombreArchivo);

        // Arrastrar y soltar
        areaArrastrar.addEventListener('dragover', (e) => {
            e.preventDefault();
            areaArrastrar.style.backgroundColor = '#f0f9ff';
        });

        areaArrastrar.addEventListener('dragleave', () => {
            areaArrastrar.style.backgroundColor = '';
        });

        areaArrastrar.addEventListener('drop', (e) => {
            e.preventDefault();
            areaArrastrar.style.backgroundColor = '';

            if (e.dataTransfer.files.length) {
                inputArchivo.files = e.dataTransfer.files;
                mostrarNombreArchivo();
            }
        });
    }

    // Configurar botón de subir
    const btnSubir = document.getElementById('btn-subir');
    if (btnSubir) {
        btnSubir.addEventListener('click', subirDocumento);
    }
}

// ✅ Funciones auxiliares
function mostrarCargando(mostrar) {
    const container = document.getElementById('lista-documentos');
    if (mostrar) {
        container.innerHTML = `
            <div class="col-span-3 text-center py-10">
                <i class="fas fa-spinner fa-spin text-3xl text-[#639A33] mb-4"></i>
                <p>Cargando documentos...</p>
            </div>
        `;
    }
}

function formatoTamaño(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function mostrarMensaje(texto, esError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = texto;
    toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${esError ? 'bg-red-100 text-red-800 border-l-4 border-red-500' : 'bg-green-100 text-green-800 border-l-4 border-green-500'}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ✅ Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '../index.html';
}

// ✅ Hacer funciones disponibles globalmente
window.mostrarModalSubir = mostrarModalSubir;
window.cerrarModalSubir = cerrarModalSubir;
window.verDocumento = verDocumento;
window.cerrarModalVer = cerrarModalVer;
window.descargarDocumento = descargarDocumento;
window.abrirEnNuevaPestana = abrirEnNuevaPestana;
window.descargarArchivo = descargarArchivo;
window.limpiarArchivo = limpiarArchivo;
window.filtrarDocumentos = filtrarDocumentos;
window.logout = logout;
window.solicitarEliminarDocumento = solicitarEliminarDocumento;
window.cerrarModalConfirmar = cerrarModalConfirmar;
window.confirmarEliminacion = confirmarEliminacion;