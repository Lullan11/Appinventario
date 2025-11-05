// Configuración
const CLOUDINARY_CONFIG = {
    cloudName: 'dzkccjhn9',
    uploadPreset: 'inventario'
};

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}`;
const CLOUDINARY_RAW_UPLOAD = `${CLOUDINARY_UPLOAD_URL}/raw/upload`;
const API_BASE_URL = 'https://inventario-api-gw73.onrender.com';

// Variables globales
let consultorioSeleccionado = null;
let areaEspecialSeleccionada = null;
let historialChequeos = [];
let tipoInformeCompletoSeleccionado = 'completo';

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    console.log('🔄 Iniciando sistema de chequeos...');
    
    cargarFechaActual();
    configurarEventos();
    configurarTabs();
    cargarHistorialDesdeBD();
});

// ========================= FUNCIONES PRINCIPALES =========================

// Cargar historial desde BD
async function cargarHistorialDesdeBD() {
    try {
        console.log('📂 Cargando historial desde BD...');
        const res = await fetch(`${API_BASE_URL}/chequeos`);
        
        if (!res.ok) {
            throw new Error('Error al cargar historial');
        }
        
        historialChequeos = await res.json();
        console.log(`✅ Historial cargado: ${historialChequeos.length} registros`);
        cargarHistorialEnTabla();
        
        // Inicializar selects después de cargar el historial
        inicializarSelectsFechas();
        configurarInformesCompletos();
        
    } catch (err) {
        console.error('❌ Error cargando historial:', err);
        mostrarMensaje('Error cargando historial de chequeos', true);
    }
}

// Guardar chequeo en BD - VERSIÓN CORREGIDA
async function guardarChequeoEnBD(chequeoData) {
    try {
        console.log('📤 Guardando chequeo en BD...', {
            tipo: chequeoData.tipo,
            nombre: chequeoData.nombre,
            responsable: chequeoData.responsable,
            equipos_chequeados: chequeoData.equipos_chequeados
        });
        
        const res = await fetch(`${API_BASE_URL}/chequeos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(chequeoData)
        });

        if (!res.ok) {
            let errorMessage = 'Error al guardar chequeo';
            try {
                const errorData = await res.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `Error ${res.status}: ${res.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const result = await res.json();
        console.log('✅ Chequeo guardado en BD:', result.chequeo.id);
        return result.chequeo;
        
    } catch (error) {
        console.error('❌ Error guardando en BD:', error);
        throw error;
    }
}

// Subir PDF a Cloudinary y guardar en BD - VERSIÓN CORREGIDA
async function subirPDFCompletado(pdfBlob, tipo, equiposData) {
    try {
        mostrarMensaje('📤 Subiendo PDF...', false);

        // 1. Subir PDF a Cloudinary
        const archivo = new File([pdfBlob], `chequeo_${tipo}_${Date.now()}.pdf`, { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', archivo);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('resource_type', 'raw');

        console.log('☁️ Subiendo PDF a Cloudinary...');
        const cloudinaryResponse = await fetch(CLOUDINARY_RAW_UPLOAD, {
            method: 'POST',
            body: formData
        });

        if (!cloudinaryResponse.ok) {
            throw new Error(`Error ${cloudinaryResponse.status} al subir PDF a Cloudinary`);
        }

        const cloudinaryData = await cloudinaryResponse.json();
        console.log('✅ PDF subido a Cloudinary:', cloudinaryData.secure_url);

        // 2. Preparar datos para guardar en BD - SIN id_usuario
        const nombre = tipo === 'consultorio' ? 
            `Consultorio ${consultorioSeleccionado}` : 
            obtenerNombreArea(areaEspecialSeleccionada);

        const responsable = tipo === 'consultorio' ?
            document.getElementById('responsable-chequeo').value :
            document.getElementById('responsable-chequeo-area').value;

        const validadoPor = tipo === 'consultorio' ?
            document.getElementById('validado-por').value :
            document.getElementById('validado-por-area').value;

        const observaciones = tipo === 'consultorio' ?
            document.getElementById('observaciones-generales').value :
            document.getElementById('observaciones-generales-area').value;

        const chequeoData = {
            tipo: tipo,
            nombre: nombre,
            responsable: responsable,
            validado_por: validadoPor,
            archivo_url: cloudinaryData.secure_url,
            archivo_public_id: cloudinaryData.public_id,
            observaciones: observaciones || '',
            equipos_chequeados: equiposData.filter(e => e.chequeado).length,
            datos_equipos: equiposData,
            mes: new Date().getMonth() + 1,
            año: new Date().getFullYear()
        };

        console.log('💾 Datos para guardar en BD:', chequeoData);

        // 3. Guardar en BD
        const chequeoBD = await guardarChequeoEnBD(chequeoData);

        // 4. Actualizar interfaz
        historialChequeos.unshift(chequeoBD);
        cargarHistorialEnTabla();
        resetearFormulario(tipo);

        mostrarMensaje('✅ Chequeo guardado correctamente', false);
        return chequeoBD;

    } catch (error) {
        console.error('❌ Error en subirPDFCompletado:', error);
        mostrarMensaje('❌ Error al guardar chequeo: ' + error.message, true);
        throw error;
    }
}

// Eliminar chequeo
async function eliminarChequeo(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este chequeo?')) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/chequeos/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            throw new Error('Error al eliminar chequeo');
        }

        historialChequeos = historialChequeos.filter(chequeo => chequeo.id !== id);
        cargarHistorialEnTabla();
        
        mostrarMensaje('✅ Chequeo eliminado correctamente', false);
        
    } catch (err) {
        console.error('❌ Error eliminando chequeo:', err);
        mostrarMensaje('Error al eliminar chequeo', true);
    }
}

// ========================= MODALES DE HISTORIAL INDIVIDUAL =========================

// Función para mostrar historial de un consultorio específico
function mostrarHistorialConsultorio() {
    if (!consultorioSeleccionado) {
        mostrarMensaje('❌ Selecciona un consultorio primero', true);
        return;
    }
    
    const nombreConsultorio = `Consultorio ${consultorioSeleccionado}`;
    const chequeosFiltrados = historialChequeos.filter(chequeo => 
        chequeo.tipo === 'consultorio' && chequeo.nombre === nombreConsultorio
    );
    
    mostrarHistorialEnModal(chequeosFiltrados, `Historial - ${nombreConsultorio}`);
}

// Función para mostrar historial de un área específica
function mostrarHistorialArea() {
    if (!areaEspecialSeleccionada) {
        mostrarMensaje('❌ Selecciona un área primero', true);
        return;
    }
    
    const nombreArea = obtenerNombreArea(areaEspecialSeleccionada);
    const chequeosFiltrados = historialChequeos.filter(chequeo => 
        chequeo.tipo === 'area' && chequeo.nombre === nombreArea
    );
    
    mostrarHistorialEnModal(chequeosFiltrados, `Historial - ${nombreArea}`);
}

// Función principal para mostrar historial en modal
function mostrarHistorialEnModal(chequeos, titulo) {
    // Crear modal si no existe
    let modal = document.getElementById('modal-historial');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-historial';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-11/12 max-w-6xl max-h-[90vh] flex flex-col">
                <div class="flex justify-between items-center p-6 border-b">
                    <h3 class="text-xl font-semibold text-gray-800" id="modal-titulo">${titulo}</h3>
                    <button onclick="cerrarModalHistorial()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto flex-1">
                    <div class="mb-4">
                        <p class="text-gray-600" id="modal-subtitulo">
                            ${chequeos.length} registros encontrados
                        </p>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Responsable</th>
                                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Validado Por</th>
                                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Equipos</th>
                                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="modal-historial-body" class="bg-white divide-y divide-gray-200">
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <span class="text-sm text-gray-600" id="modal-contador">
                        Mostrando ${chequeos.length} registros
                    </span>
                    <button onclick="cerrarModalHistorial()" 
                            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Actualizar título y contenido
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-subtitulo').textContent = `${chequeos.length} registros encontrados`;
    
    // Cargar tabla
    cargarTablaModal(chequeos);
    
    // Mostrar modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Cargar tabla en el modal
function cargarTablaModal(chequeos) {
    const tbody = document.getElementById('modal-historial-body');
    const contador = document.getElementById('modal-contador');
    
    if (chequeos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-clipboard-list text-3xl mb-2 block"></i>
                    No hay registros para mostrar
                </td>
            </tr>
        `;
        contador.textContent = 'No hay registros';
        return;
    }

    tbody.innerHTML = chequeos.map(chequeo => {
        const fecha = new Date(chequeo.fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 whitespace-nowrap">${fecha}</td>
                <td class="px-4 py-3">${chequeo.responsable}</td>
                <td class="px-4 py-3">${chequeo.validado_por || 'No especificado'}</td>
                <td class="px-4 py-3">
                    <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                        ${chequeo.equipos_chequeados} equipos
                    </span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex gap-2">
                        <button onclick="previsualizarPDF('${chequeo.archivo_url}')" 
                                class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button onclick="descargarChequeo('${chequeo.archivo_url}', 'chequeo_${chequeo.tipo}_${chequeo.id}.pdf')" 
                                class="text-green-600 hover:text-green-800 text-sm flex items-center gap-1 px-3 py-1 rounded border border-green-200 hover:bg-green-50 transition-colors">
                            <i class="fas fa-download"></i> Descargar
                        </button>
                        <button onclick="eliminarChequeoModal(${chequeo.id})" 
                                class="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 px-3 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    contador.textContent = `Mostrando ${chequeos.length} registros`;
}

// Eliminar chequeo desde el modal
async function eliminarChequeoModal(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este chequeo?')) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/chequeos/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            throw new Error('Error al eliminar chequeo');
        }

        // Actualizar historial global
        historialChequeos = historialChequeos.filter(chequeo => chequeo.id !== id);
        
        // Cerrar modal y mostrar mensaje
        cerrarModalHistorial();
        cargarHistorialEnTabla();
        
        mostrarMensaje('✅ Chequeo eliminado correctamente', false);
        
    } catch (err) {
        console.error('❌ Error eliminando chequeo:', err);
        mostrarMensaje('Error al eliminar chequeo', true);
    }
}

// Cerrar modal
function cerrarModalHistorial() {
    const modal = document.getElementById('modal-historial');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', function(e) {
    const modal = document.getElementById('modal-historial');
    if (modal && e.target === modal) {
        cerrarModalHistorial();
    }
});

// Cerrar modal con ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModalHistorial();
    }
});

// ========================= FUNCIONES DE INTERFAZ =========================

// Cargar historial en tabla
function cargarHistorialEnTabla() {
    const tbody = document.getElementById('historial-chequeos-body');
    
    if (!tbody) {
        console.log('❌ No se encontró la tabla de historial');
        return;
    }

    if (historialChequeos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-clipboard-list text-3xl mb-2 block"></i>
                    No hay chequeos registrados
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = historialChequeos.map(chequeo => {
        const fecha = new Date(chequeo.fecha).toLocaleDateString('es-ES');
        const tipoIcon = chequeo.tipo === 'consultorio' ? 'fa-door-closed' : 'fa-microscope';
        const tipoColor = chequeo.tipo === 'consultorio' ? 'blue' : 'green';

        return `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-4 py-3">${fecha}</td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <i class="fas ${tipoIcon} text-${tipoColor}-500"></i>
                        <span>${chequeo.nombre}</span>
                    </div>
                </td>
                <td class="px-4 py-3">${chequeo.responsable}</td>
                <td class="px-4 py-3">
                    <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        ${chequeo.equipos_chequeados} equipos
                    </span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex gap-2">
                        <button onclick="previsualizarPDF('${chequeo.archivo_url}')" 
                                class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button onclick="descargarChequeo('${chequeo.archivo_url}', 'chequeo_${chequeo.tipo}_${chequeo.id}.pdf')" 
                                class="text-green-600 hover:text-green-800 text-sm flex items-center gap-1 px-2 py-1 rounded border border-green-200 hover:bg-green-50">
                            <i class="fas fa-download"></i> Descargar
                        </button>
                        <button onclick="eliminarChequeo(${chequeo.id})" 
                                class="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 px-2 py-1 rounded border border-red-200 hover:bg-red-50">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Previsualizar PDF
function previsualizarPDF(url) {
    window.open(url, '_blank');
}

// Descargar chequeo
async function descargarChequeo(url, nombreArchivo) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        mostrarMensaje('✅ Chequeo descargado', false);
        
    } catch (error) {
        console.error('❌ Error descargando:', error);
        mostrarMensaje('❌ Error al descargar', true);
    }
}

// ========================= FUNCIONES AUXILIARES =========================

function obtenerNombreArea(area) {
    const areas = {
        'espirometria': 'Espirometría',
        'audiometria': 'Audiometría', 
        'optometria': 'Optometría',
        'psicologia': 'Psicología'
    };
    return areas[area] || area;
}

function resetearFormulario(tipo) {
    if (tipo === 'consultorio') {
        document.getElementById('responsable-chequeo').value = '';
        document.getElementById('validado-por').value = '';
        document.getElementById('observaciones-generales').value = '';
        
        document.querySelectorAll('#lista-chequeo-consultorio input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.closest('.checkbox-item').classList.remove('checked');
        });
        
    } else {
        document.getElementById('responsable-chequeo-area').value = '';
        document.getElementById('validado-por-area').value = '';
        document.getElementById('observaciones-generales-area').value = '';
        
        document.querySelectorAll('#lista-chequeo-area input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.closest('.checkbox-item').classList.remove('checked');
        });
    }
}

function cargarFechaActual() {
    const fecha = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
    
    document.querySelectorAll('#fecha-actual, #fecha-actual-area').forEach(elemento => {
        elemento.textContent = fecha;
    });
}

function mostrarMensaje(texto, esError = false) {
    const mensajesExistentes = document.querySelectorAll('.mensaje-temporal');
    mensajesExistentes.forEach(msg => msg.remove());

    const mensaje = document.createElement('div');
    mensaje.className = `mensaje-temporal fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${
        esError ? 'bg-red-100 text-red-800 border-l-4 border-red-500' : 'bg-green-100 text-green-800 border-l-4 border-green-500'
    }`;
    mensaje.textContent = texto;

    document.body.appendChild(mensaje);

    setTimeout(() => {
        if (mensaje.parentNode) {
            mensaje.parentNode.removeChild(mensaje);
        }
    }, 3000);
}

// ========================= CONFIGURACIÓN DE EVENTOS =========================

function configurarTabs() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
            
            button.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.remove('hidden');
            
            if (targetTab === 'historial-chequeos') {
                cargarHistorialEnTabla();
            }
        });
    });
}

function configurarEventos() {
    // Consultorios
    document.querySelectorAll('.consultorio-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.consultorio-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            consultorioSeleccionado = card.getAttribute('data-consultorio');
            mostrarListaChequeoConsultorio();
        });
    });

    // Áreas especiales
    document.querySelectorAll('.area-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.area-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            areaEspecialSeleccionada = card.getAttribute('data-area');
            mostrarListaChequeoArea();
        });
    });

    // Checkboxes
    document.addEventListener('change', function (e) {
        if (e.target.type === 'checkbox') {
            const item = e.target.closest('.checkbox-item');
            if (item) {
                item.classList.toggle('checked', e.target.checked);
            }
        }
    });

    // Botones de generación PDF
    document.getElementById('btn-generar-pdf')?.addEventListener('click', generarYSubirPDFConsultorio);
    document.getElementById('btn-generar-pdf-area')?.addEventListener('click', generarYSubirPDFArea);

    // Botones de historial - ACTUALIZADOS para usar modales individuales
    document.getElementById('btn-ver-historial-consultorio')?.addEventListener('click', mostrarHistorialConsultorio);
    document.getElementById('btn-ver-historial-area')?.addEventListener('click', mostrarHistorialArea);

    // Configurar informes mensuales
    configurarInformesMensuales();
}

function configurarInformesMensuales() {
    // Cambio entre consultorio y área
    document.querySelectorAll('input[name="tipo-informe"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const tipo = this.value;
            document.getElementById('consultorio-informe-container').classList.toggle('hidden', tipo !== 'consultorio');
            document.getElementById('area-informe-container').classList.toggle('hidden', tipo !== 'area');
        });
    });

    // Llenar selects de consultorios y áreas
    llenarSelectConsultorios();
    llenarSelectAreas();
}

function configurarInformesCompletos() {
    // Selección de tipo de informe completo
    document.querySelectorAll('.tipo-informe-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.tipo-informe-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            tipoInformeCompletoSeleccionado = this.getAttribute('data-tipo');
            actualizarInfoInformeCompleto();
        });
    });

    // Inicializar información del informe
    actualizarInfoInformeCompleto();
}

function actualizarInfoInformeCompleto() {
    const titulo = document.getElementById('titulo-informe-completo');
    const descripcion = document.getElementById('descripcion-informe-completo');
    
    const info = {
        'todos-consultorios': {
            titulo: 'Informe de Todos los Consultorios',
            descripcion: 'Incluye todos los chequeos de consultorios del mes seleccionado'
        },
        'todas-areas': {
            titulo: 'Informe de Todas las Áreas Especiales',
            descripcion: 'Incluye todos los chequeos de áreas especiales del mes seleccionado'
        },
        'completo': {
            titulo: 'Informe Completo Mensual',
            descripcion: 'Incluye todos los chequeos (consultorios + áreas) del mes seleccionado'
        }
    };

    const infoSeleccionada = info[tipoInformeCompletoSeleccionado] || info.completo;
    titulo.textContent = infoSeleccionada.titulo;
    descripcion.textContent = infoSeleccionada.descripcion;
}

function llenarSelectConsultorios() {
    const select = document.getElementById('select-consultorio-informe');
    if (!select) return;
    
    select.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
        const option = document.createElement('option');
        option.value = `Consultorio ${i}`;
        option.textContent = `Consultorio ${i}`;
        select.appendChild(option);
    }
}

function llenarSelectAreas() {
    const select = document.getElementById('select-area-informe');
    if (!select) return;
    
    const areas = [
        { value: 'Espirometría', nombre: 'Espirometría' },
        { value: 'Audiometría', nombre: 'Audiometría' },
        { value: 'Optometría', nombre: 'Optometría' },
        { value: 'Psicología', nombre: 'Psicología' }
    ];
    
    select.innerHTML = '';
    areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area.value;
        option.textContent = area.nombre;
        select.appendChild(option);
    });
}

// ========================= INICIALIZACIÓN DE SELECTS CORREGIDA =========================

function inicializarSelectsFechas() {
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Llenar selects de meses
    document.querySelectorAll('#select-mes-informe, #select-mes-informe-completo').forEach(select => {
        select.innerHTML = '';
        meses.forEach((mes, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = mes;
            option.selected = (index + 1) === (new Date().getMonth() + 1);
            select.appendChild(option);
        });
    });

    // Llenar selects de años - SOLO AÑOS CON HISTORIAL
    llenarSelectAnios('select-anio-informe');
    llenarSelectAnios('select-anio-informe-completo');
}

function llenarSelectAnios(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Obtener años únicos del historial
    const añosUnicos = [...new Set(historialChequeos.map(chequeo => chequeo.año))];
    
    // Si no hay años en el historial, usar solo el año actual
    if (añosUnicos.length === 0) {
        añosUnicos.push(new Date().getFullYear());
    }

    // Ordenar años de más reciente a más antiguo
    añosUnicos.sort((a, b) => b - a);

    select.innerHTML = '';
    añosUnicos.forEach(año => {
        const option = document.createElement('option');
        option.value = año;
        option.textContent = año;
        option.selected = año === new Date().getFullYear();
        select.appendChild(option);
    });
}

function mostrarListaChequeoConsultorio() {
    const container = document.getElementById('lista-chequeo-consultorio');
    const titulo = document.getElementById('consultorio-seleccionado');
    
    if (container && titulo) {
        titulo.textContent = `Consultorio ${consultorioSeleccionado}`;
        container.classList.remove('hidden');
        resetearFormulario('consultorio');
    }
}

function mostrarListaChequeoArea() {
    const container = document.getElementById('lista-chequeo-area');
    const titulo = document.getElementById('area-seleccionada');
    const equiposContainer = document.getElementById('equipos-area-container');
    
    if (container && titulo && equiposContainer) {
        titulo.textContent = obtenerNombreArea(areaEspecialSeleccionada);
        container.classList.remove('hidden');
        resetearFormulario('area');
        cargarEquiposAreaEspecial(areaEspecialSeleccionada, equiposContainer);
    }
}

function cargarEquiposAreaEspecial(area, container) {
    const equiposPorArea = {
        'espirometria': ['Espirómetro'],
        'audiometria': ['Audiómetro', 'Cabina Audiométrica', 'Equipo de organos'],
        'optometria': [
            'Autorref-Keratómetro', 'Forópter', 'Lámpara de Hendidura', 'Lensómetro',
            'Oftalmoscopio', 'Pantalla Tangente', 'Proyector Opto Tipos', 'Retinoscopio',
            'Test Ishihara', 'Transluminador', 'Unidad de Refracción', 'Visiómetro', 'Caja de lentes de prueba'
        ],
        'psicologia': ['Polireactímetro 1', 'Polireactímetro 2']
    };

    const equipos = equiposPorArea[area] || [];
    
    let html = `<h4 class="font-semibold text-gray-800 mb-4 text-lg">Equipos del Área</h4><div class="space-y-3">`;
    
    equipos.forEach(equipo => {
        html += `
            <div class="checkbox-item bg-white border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <input type="checkbox" id="${equipo.toLowerCase().replace(/\s+/g, '-')}" 
                               class="h-5 w-5 text-[#639A33] focus:ring-[#639A33] rounded">
                        <label for="${equipo.toLowerCase().replace(/\s+/g, '-')}" class="text-gray-700 font-medium">${equipo}</label>
                    </div>
                    <div class="flex space-x-2">
                        <select class="estado-equipo border border-gray-300 rounded px-3 py-1 text-sm">
                            <option value="optimo">Óptimo</option>
                            <option value="regular">Regular</option>
                            <option value="defectuoso">Defectuoso</option>
                        </select>
                        <input type="text" placeholder="Observaciones" class="observaciones border border-gray-300 rounded px-3 py-1 text-sm w-40">
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

// ========================= FUNCIONES DE GENERACIÓN PDF =========================

function obtenerDatosEquiposCompletos(tipo) {
    const contenedor = tipo === 'consultorio' ? 
        document.getElementById('lista-chequeo-consultorio') : 
        document.getElementById('lista-chequeo-area');
    
    const equiposData = [];
    const items = contenedor.querySelectorAll('.checkbox-item');
    
    items.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const label = item.querySelector('label').textContent;
        const estado = item.querySelector('.estado-equipo').value;
        const observaciones = item.querySelector('.observaciones').value;
        
        equiposData.push({
            equipo: label,
            estado: estado,
            observaciones: observaciones || 'Sin observaciones',
            chequeado: checkbox.checked
        });
    });
    
    return equiposData;
}

async function generarYSubirPDFConsultorio() {
    if (!consultorioSeleccionado) {
        mostrarMensaje('❌ Selecciona un consultorio primero', true);
        return;
    }

    const responsable = document.getElementById('responsable-chequeo').value;
    const validadoPor = document.getElementById('validado-por').value;

    if (!responsable || !validadoPor) {
        mostrarMensaje('❌ Completa todos los campos requeridos', true);
        return;
    }

    try {
        mostrarMensaje('📄 Generando PDF...', false);
        
        const equiposData = obtenerDatosEquiposCompletos('consultorio');
        const pdfBlob = await generarPDFConsultorioBlob();
        await subirPDFCompletado(pdfBlob, 'consultorio', equiposData);
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('❌ Error al procesar: ' + error.message, true);
    }
}

async function generarYSubirPDFArea() {
    if (!areaEspecialSeleccionada) {
        mostrarMensaje('❌ Selecciona un área primero', true);
        return;
    }

    const responsable = document.getElementById('responsable-chequeo-area').value;
    const validadoPor = document.getElementById('validado-por-area').value;

    if (!responsable || !validadoPor) {
        mostrarMensaje('❌ Completa todos los campos requeridos', true);
        return;
    }

    try {
        mostrarMensaje('📄 Generando PDF...', false);
        
        const equiposData = obtenerDatosEquiposCompletos('area');
        const pdfBlob = await generarPDFAreaBlob();
        await subirPDFCompletado(pdfBlob, 'area', equiposData);
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('❌ Error al procesar: ' + error.message, true);
    }
}

// Generar PDF para consultorio
async function generarPDFConsultorioBlob() {
    const responsable = document.getElementById('responsable-chequeo').value;
    const validadoPor = document.getElementById('validado-por').value;
    const observaciones = document.getElementById('observaciones-generales').value;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // Encabezado
    doc.setFillColor(1, 152, 59);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA DE CHEQUEO DIARIO - CONSULTORIO', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Consultorio ${consultorioSeleccionado}`, pageWidth / 2, 18, { align: 'center' });
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, 23, { align: 'center' });

    yPosition = 35;

    // Información del responsable y validado por
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN GENERAL:', 15, yPosition);

    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Responsable: ${responsable}`, 20, yPosition);

    yPosition += 5;
    doc.text(`Validado por: ${validadoPor}`, 20, yPosition);

    yPosition += 5;
    if (observaciones) {
        doc.text(`Observaciones: ${observaciones}`, 20, yPosition);
        yPosition += 7;
    } else {
        yPosition += 2;
    }

    // Tabla de equipos
    const headers = [['Equipo', 'Estado', 'Observaciones', 'Chequeado']];
    const rows = [];

    const equipos = document.querySelectorAll('#lista-chequeo-consultorio .checkbox-item');
    equipos.forEach(item => {
        const label = item.querySelector('label').textContent;
        const estado = item.querySelector('.estado-equipo').value;
        const observaciones = item.querySelector('.observaciones').value || '-';
        const checked = item.querySelector('input[type="checkbox"]').checked;

        rows.push([
            label,
            estado.toUpperCase(),
            observaciones,
            checked ? 'SÍ' : 'NO'
        ]);
    });

    // Agregar tabla
    doc.autoTable({
        startY: yPosition + 5,
        head: headers,
        body: rows,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [1, 152, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        margin: { left: 15, right: 15 }
    });

    // Pie de página
    const finalY = doc.lastAutoTable.finalY + 10;
    if (finalY < pageHeight - 20) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado el: ${new Date().toLocaleString('es-ES')} - Sistema de Gestión de Inventarios IPS Progresando`,
            pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    return doc.output('blob');
}

// Generar PDF para área especial
async function generarPDFAreaBlob() {
    const responsable = document.getElementById('responsable-chequeo-area').value;
    const validadoPor = document.getElementById('validado-por-area').value;
    const observaciones = document.getElementById('observaciones-generales-area').value;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // Encabezado
    doc.setFillColor(99, 154, 51);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA DE CHEQUEO DIARIO - ÁREA ESPECIAL', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Área: ${obtenerNombreArea(areaEspecialSeleccionada)}`, pageWidth / 2, 18, { align: 'center' });
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, 23, { align: 'center' });

    yPosition = 35;

    // Información del responsable y validado por
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN GENERAL:', 15, yPosition);

    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Responsable: ${responsable}`, 20, yPosition);

    yPosition += 5;
    doc.text(`Validado por: ${validadoPor}`, 20, yPosition);

    yPosition += 5;
    if (observaciones) {
        doc.text(`Observaciones: ${observaciones}`, 20, yPosition);
        yPosition += 7;
    } else {
        yPosition += 2;
    }

    // Tabla de equipos
    const headers = [['Equipo', 'Estado', 'Observaciones', 'Chequeado']];
    const rows = [];

    const equipos = document.querySelectorAll('#lista-chequeo-area .checkbox-item');
    equipos.forEach(item => {
        const label = item.querySelector('label').textContent;
        const estado = item.querySelector('.estado-equipo').value;
        const observaciones = item.querySelector('.observaciones').value || '-';
        const checked = item.querySelector('input[type="checkbox"]').checked;

        rows.push([
            label,
            estado.toUpperCase(),
            observaciones,
            checked ? 'SÍ' : 'NO'
        ]);
    });

    // Agregar tabla
    doc.autoTable({
        startY: yPosition + 5,
        head: headers,
        body: rows,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [99, 154, 51],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        margin: { left: 15, right: 15 }
    });

    // Pie de página
    const finalY = doc.lastAutoTable.finalY + 10;
    if (finalY < pageHeight - 20) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado el: ${new Date().toLocaleString('es-ES')} - Sistema de Gestión de Inventarios IPS Progresando`,
            pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    return doc.output('blob');
}

// ========================= FUNCIONES DE INFORMES MENSUALES - UNIENDO PDFs =========================

async function generarPDFInformeMensual() {
    try {
        const tipo = document.querySelector('input[name="tipo-informe"]:checked').value;
        const mes = parseInt(document.getElementById('select-mes-informe').value);
        const año = parseInt(document.getElementById('select-anio-informe').value);
        
        let nombre = '';
        if (tipo === 'consultorio') {
            const consultorio = document.getElementById('select-consultorio-informe').value;
            nombre = consultorio;
        } else {
            const area = document.getElementById('select-area-informe').value;
            nombre = area;
        }

        if (!nombre || !mes || !año) {
            mostrarMensaje('❌ Completa todos los campos del informe', true);
            return;
        }

        // Obtener chequeos filtrados del historial local
        const chequeosFiltrados = historialChequeos.filter(chequeo => 
            chequeo.tipo === tipo && 
            chequeo.nombre === nombre && 
            chequeo.mes === mes && 
            chequeo.año === año
        );

        if (chequeosFiltrados.length === 0) {
            mostrarMensaje('❌ No hay chequeos registrados para los filtros seleccionados', true);
            return;
        }

        mostrarMensaje('📊 Uniendo PDFs del informe...', false);

        // Crear PDF unido usando PDF-Lib
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        // Descargar y unir cada PDF
        for (let i = 0; i < chequeosFiltrados.length; i++) {
            const chequeo = chequeosFiltrados[i];
            try {
                mostrarMensaje(`📥 Descargando PDF ${i + 1} de ${chequeosFiltrados.length}...`, false);

                // Descargar el PDF
                const response = await fetch(chequeo.archivo_url);
                const pdfBytes = await response.arrayBuffer();

                // Cargar el PDF
                const pdf = await PDFDocument.load(pdfBytes);

                // Copiar todas las páginas al PDF unido
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));

            } catch (error) {
                console.error(`Error procesando PDF ${i + 1}:`, error);
                mostrarMensaje(`⚠️ Error con PDF ${i + 1}, continuando...`, true);
            }
        }

        // Guardar el PDF unido
        const mergedPdfBytes = await mergedPdf.save();

        // Crear blob y descargar
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const nombreArchivo = `informe_${nombre.replace(/\s+/g, '_')}_${mes}_${año}.pdf`;
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpiar URL
        setTimeout(() => URL.revokeObjectURL(url), 100);

        mostrarMensaje(`✅ PDF unido generado con ${chequeosFiltrados.length} listas de chequeo`, false);

    } catch (error) {
        console.error('❌ Error uniendo PDFs:', error);
        mostrarMensaje('❌ Error al unir PDFs: ' + error.message, true);
    }
}

async function generarInformeMensualCompleto() {
    try {
        const mes = parseInt(document.getElementById('select-mes-informe-completo').value);
        const año = parseInt(document.getElementById('select-anio-informe-completo').value);

        if (!mes || !año) {
            mostrarMensaje('❌ Selecciona mes y año', true);
            return;
        }

        // Obtener todos los chequeos del mes
        const todosChequeos = historialChequeos.filter(chequeo => 
            chequeo.mes === mes && chequeo.año === año
        );

        if (todosChequeos.length === 0) {
            mostrarMensaje('❌ No hay chequeos registrados para el mes seleccionado', true);
            return;
        }

        // Filtrar según el tipo de informe completo seleccionado
        let chequeosFiltrados = [];
        let nombreArchivo = '';

        switch (tipoInformeCompletoSeleccionado) {
            case 'todos-consultorios':
                chequeosFiltrados = todosChequeos.filter(chequeo => chequeo.tipo === 'consultorio');
                nombreArchivo = `informe_consultorios_${mes}_${año}.pdf`;
                break;
            case 'todas-areas':
                chequeosFiltrados = todosChequeos.filter(chequeo => chequeo.tipo === 'area');
                nombreArchivo = `informe_areas_${mes}_${año}.pdf`;
                break;
            case 'completo':
                chequeosFiltrados = todosChequeos;
                nombreArchivo = `informe_completo_${mes}_${año}.pdf`;
                break;
        }

        if (chequeosFiltrados.length === 0) {
            mostrarMensaje('❌ No hay datos para el tipo de informe seleccionado', true);
            return;
        }

        mostrarMensaje('📊 Uniendo PDFs del informe completo...', false);

        // Crear PDF unido usando PDF-Lib
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        // Descargar y unir cada PDF
        for (let i = 0; i < chequeosFiltrados.length; i++) {
            const chequeo = chequeosFiltrados[i];
            try {
                mostrarMensaje(`📥 Descargando PDF ${i + 1} de ${chequeosFiltrados.length}...`, false);

                // Descargar el PDF
                const response = await fetch(chequeo.archivo_url);
                const pdfBytes = await response.arrayBuffer();

                // Cargar el PDF
                const pdf = await PDFDocument.load(pdfBytes);

                // Copiar todas las páginas al PDF unido
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));

            } catch (error) {
                console.error(`Error procesando PDF ${i + 1}:`, error);
                mostrarMensaje(`⚠️ Error con PDF ${i + 1}, continuando...`, true);
            }
        }

        // Guardar el PDF unido
        const mergedPdfBytes = await mergedPdf.save();

        // Crear blob y descargar
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpiar URL
        setTimeout(() => URL.revokeObjectURL(url), 100);

        mostrarMensaje(`✅ PDF unido generado con ${chequeosFiltrados.length} listas de chequeo`, false);

    } catch (error) {
        console.error('❌ Error uniendo PDFs:', error);
        mostrarMensaje('❌ Error al unir PDFs: ' + error.message, true);
    }
}

// ========================= EXPORTAR FUNCIONES GLOBALES =========================

window.generarYSubirPDFConsultorio = generarYSubirPDFConsultorio;
window.generarYSubirPDFArea = generarYSubirPDFArea;
window.eliminarChequeo = eliminarChequeo;
window.previsualizarPDF = previsualizarPDF;
window.descargarChequeo = descargarChequeo;
window.generarPDFInformeMensual = generarPDFInformeMensual;
window.generarInformeMensualCompleto = generarInformeMensualCompleto;
window.mostrarHistorialConsultorio = mostrarHistorialConsultorio;
window.mostrarHistorialArea = mostrarHistorialArea;
window.cerrarModalHistorial = cerrarModalHistorial;
window.eliminarChequeoModal = eliminarChequeoModal;