const apiUrl = "https://inventario-api-gw73.onrender.com";

// Variables globales
let tiposMantenimiento = [];
let mantenimientosConfigurados = [];
let imagenEquipoData = null;
let mostrandoCampos = false;

// Función para mostrar mensajes tipo toast
function mostrarMensajeEquipo(texto, esError = false) {
    let mensaje = document.getElementById("mensaje-equipo");
    if (!mensaje) {
        mensaje = document.createElement("div");
        mensaje.id = "mensaje-equipo";
        mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50";
        document.body.appendChild(mensaje);
    }

    mensaje.textContent = texto;
    mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${
        esError
            ? "bg-red-100 text-red-800 border-l-4 border-red-500"
            : "bg-green-100 text-green-800 border-l-4 border-green-500"
    }`;

    setTimeout(() => {
        mensaje.textContent = "";
        mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
    }, 4000);
}

// Función para verificar estado de la imagen
function verificarEstadoImagen() {
    const inputImagen = document.getElementById('imagen-equipo');
    const archivo = inputImagen?.files[0];
    
    return {
        tieneNuevaImagen: !!archivo,
        archivo: archivo
    };
}

// Configuración del preview de imagen - ACTUALIZADA para el nuevo diseño
function configurarPreviewImagen() {
    const inputImagen = document.getElementById('imagen-equipo');
    const dragDropZone = document.getElementById('drag-drop-zone');
    const previewContainer = document.getElementById('preview-container');
    const previewImagen = document.getElementById('preview-imagen');
    const previewNombre = document.getElementById('preview-nombre');
    
    // Configurar drag & drop
    if (dragDropZone) {
        dragDropZone.addEventListener('click', () => inputImagen?.click());
        
        dragDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dragDropZone.classList.add('border-blue-400', 'bg-blue-50');
        });
        
        dragDropZone.addEventListener('dragleave', () => {
            dragDropZone.classList.remove('border-blue-400', 'bg-blue-50');
        });
        
        dragDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dragDropZone.classList.remove('border-blue-400', 'bg-blue-50');
            
            if (e.dataTransfer.files.length > 0) {
                inputImagen.files = e.dataTransfer.files;
                mostrarPreviewImagen(inputImagen, previewImagen, previewNombre);
                previewContainer?.classList.remove('hidden');
                imagenEquipoData = null;
            }
        });
    }
    
    // Configurar cambio de input
    if (inputImagen && previewImagen) {
        inputImagen.addEventListener('change', function(e) {
            const archivo = e.target.files[0];
            if (archivo) {
                mostrarPreviewImagen(inputImagen, previewImagen, previewNombre);
                previewContainer?.classList.remove('hidden');
                imagenEquipoData = null;
            } else {
                previewContainer?.classList.add('hidden');
                imagenEquipoData = null;
            }
        });
    }
}

// Mostrar preview de imagen - ACTUALIZADA
function mostrarPreviewImagen(input, previewImg, previewName) {
    const archivo = input.files[0];
    if (!archivo || !previewImg) return;

    // Mostrar información del archivo
    if (previewName) {
        previewName.textContent = archivo.name;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImg.src = e.target.result;
    };
    reader.readAsDataURL(archivo);

    // Validar tamaño
    validarTamañoImagen(input);
}

// Eliminar imagen seleccionada - ACTUALIZADA
function eliminarImagen() {
    const inputImagen = document.getElementById('imagen-equipo');
    const previewContainer = document.getElementById('preview-container');
    const previewImagen = document.getElementById('preview-imagen');
    const previewNombre = document.getElementById('preview-nombre');
    
    if (inputImagen) inputImagen.value = '';
    if (previewContainer) previewContainer.classList.add('hidden');
    if (previewImagen) previewImagen.src = '';
    if (previewNombre) previewNombre.textContent = '';
    
    imagenEquipoData = null;
    mostrarMensajeEquipo('🗑️ Imagen eliminada');
}

// Subir imagen a Cloudinary
async function subirImagenEquipo() {
    const inputImagen = document.getElementById('imagen-equipo');
    const archivo = inputImagen?.files[0];
    
    if (!archivo) {
        return null;
    }
    
    try {
        mostrarMensajeEquipo('📤 Subiendo imagen...');
        
        validarArchivo(archivo, ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);
        const imagenData = await subirArchivoCloudinary(archivo, 'image');
        
        if (!imagenData || !imagenData.url) {
            throw new Error('No se recibió URL de la imagen desde Cloudinary');
        }
        
        mostrarMensajeEquipo('✅ Imagen subida correctamente');
        return imagenData;
        
    } catch (error) {
        console.error('❌ Error subiendo imagen:', error);
        let mensajeError = 'Error subiendo imagen: ' + error.message;
        if (error.message.includes('File size too large')) {
            mensajeError = 'La imagen es demasiado grande. Máximo permitido: 10MB';
        }
        mostrarMensajeEquipo(`❌ ${mensajeError}`, true);
        throw error;
    }
}

// Validar tamaño de imagen - ACTUALIZADA
function validarTamañoImagen(input) {
    const archivo = input.files[0];
    let advertencia = document.getElementById('tamaño-advertencia');
    
    if (!advertencia) {
        advertencia = document.createElement('div');
        advertencia.id = 'tamaño-advertencia';
        advertencia.className = 'text-sm mt-1';
        input.parentNode.appendChild(advertencia);
    }
    
    if (!archivo) {
        advertencia.classList.add('hidden');
        return;
    }
    
    const tamañoMB = archivo.size / 1024 / 1024;
    
    if (tamañoMB > 5) {
        advertencia.textContent = `⚠️ Imagen grande (${tamañoMB.toFixed(1)}MB). Se comprimirá automáticamente.`;
        advertencia.className = 'text-sm mt-1 text-amber-600 font-medium';
        advertencia.classList.remove('hidden');
    } else {
        advertencia.classList.add('hidden');
    }
}

// Cargar tipos de mantenimiento
async function cargarTiposMantenimiento() {
    try {
        const res = await fetch(`${apiUrl}/tipos-mantenimiento`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

        const data = await res.json();
        tiposMantenimiento = data.filter(tipo => !tipo.nombre.toLowerCase().includes('correctivo'));

        if (tiposMantenimiento.length === 0) {
            tiposMantenimiento = [
                { id: 1, nombre: "Preventivo" },
                { id: 3, nombre: "Calibración" }
            ];
        }
    } catch (err) {
        console.error("Error al cargar tipos de mantenimiento:", err);
        tiposMantenimiento = [
            { id: 1, nombre: "Preventivo" },
            { id: 3, nombre: "Calibración" }
        ];
    }
}

// Cargar tipos de equipo
async function cargarTiposEquipo() {
    const selectTipo = document.getElementById("tipoEquipo");
    if (!selectTipo) return;

    selectTipo.innerHTML = '<option value="">Selecciona un tipo...</option>';

    try {
        const res = await fetch(`${apiUrl}/tipos-equipo`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

        const tipos = await res.json();
        tipos.forEach(tipo => {
            const option = document.createElement("option");
            option.value = tipo.id;
            option.textContent = tipo.nombre;
            selectTipo.appendChild(option);
        });
    } catch (err) {
        console.error("Error al cargar tipos de equipo:", err);
        mostrarMensajeEquipo("Error al cargar tipos de equipo", true);
    }
}

// Mostrar campos específicos según tipo de equipo
async function mostrarCamposTipo() {
    if (mostrandoCampos) return;
    mostrandoCampos = true;

    const tipoId = document.getElementById("tipoEquipo").value;
    const container = document.getElementById("campos-especificos");

    if (!container) {
        mostrandoCampos = false;
        return;
    }

    // Limpiar completamente el contenedor
    container.innerHTML = "";

    if (!tipoId) {
        mostrandoCampos = false;
        return;
    }

    try {
        const res = await fetch(`${apiUrl}/tipos-equipo`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

        const tipos = await res.json();
        const tipo = tipos.find(t => t.id == tipoId);

        if (!tipo || !tipo.campos || tipo.campos.length === 0) {
            mostrandoCampos = false;
            return;
        }

        // Crear todos los campos en una sola operación
        const camposHTML = tipo.campos.map(campo => {
            const nombre = campo.nombre_campo || "Campo";
            let inputType = "text";
            if (campo.tipo_dato === "numero") inputType = "number";
            if (campo.tipo_dato === "fecha") inputType = "date";

            return `
                <div class="mb-4">
                    <label class="block text-[#0F172A] font-medium mb-2">${nombre}</label>
                    <input type="${inputType}" name="${nombre}" 
                           class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]" 
                           placeholder="Ingrese ${nombre.toLowerCase()}" />
                </div>
            `;
        }).join('');

        container.innerHTML = camposHTML;

    } catch (err) {
        console.error("Error al mostrar campos específicos:", err);
        mostrarMensajeEquipo("Error al cargar campos personalizados", true);
    }
    
    mostrandoCampos = false;
}

// Cargar ubicaciones
async function cargarUbicaciones() {
    const select = document.getElementById("ubicacion");
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona una ubicación...</option>';

    try {
        const areasRes = await fetch(`${apiUrl}/areas`);
        if (!areasRes.ok) throw new Error(`Error HTTP en áreas: ${areasRes.status}`);
        const areas = await areasRes.json();

        const puestosRes = await fetch(`${apiUrl}/puestos`);
        if (!puestosRes.ok) throw new Error(`Error HTTP en puestos: ${puestosRes.status}`);
        const puestos = await puestosRes.json();

        // Agrupar áreas por sede
        const areasPorSede = {};
        areas.forEach(area => {
            const sedeNombre = area.sede_nombre || 'Sin sede';
            if (!areasPorSede[sedeNombre]) areasPorSede[sedeNombre] = [];
            areasPorSede[sedeNombre].push(area);
        });

        Object.keys(areasPorSede).forEach(sedeNombre => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = `📍 ${sedeNombre} - Áreas`;
            areasPorSede[sedeNombre].forEach(area => {
                const option = document.createElement("option");
                option.value = `area-${area.id}`;
                option.textContent = `🏢 ${area.nombre} (Sede: ${sedeNombre})`;
                option.setAttribute('data-tipo', 'area');
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        });

        // Agrupar puestos por sede
        const puestosPorSede = {};
        puestos.forEach(puesto => {
            const sedeNombre = puesto.sede_nombre || 'Sin sede';
            if (!puestosPorSede[sedeNombre]) puestosPorSede[sedeNombre] = [];
            puestosPorSede[sedeNombre].push(puesto);
        });

        Object.keys(puestosPorSede).forEach(sedeNombre => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = `👤 ${sedeNombre} - Puestos`;
            puestosPorSede[sedeNombre].forEach(puesto => {
                const option = document.createElement("option");
                option.value = `puesto-${puesto.id}`;
                option.textContent = `💼 ${puesto.codigo} - ${puesto.responsable_nombre} (Área: ${puesto.area_nombre})`;
                option.setAttribute('data-tipo', 'puesto');
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        });

    } catch (err) {
        console.error("Error al cargar ubicaciones:", err);
        mostrarMensajeEquipo("Error al cargar ubicaciones", true);
    }
}

// Autocompletar responsable
function configurarAutocompletarResponsable() {
    const ubicacionSelect = document.getElementById("ubicacion");
    const responsableInput = document.getElementById("responsable");

    if (!ubicacionSelect || !responsableInput) return;

    ubicacionSelect.addEventListener("change", async (e) => {
        const value = e.target.value;
        if (!value) {
            responsableInput.value = "";
            return;
        }

        const [tipo, id] = value.split("-");

        if (tipo === "puesto") {
            try {
                const res = await fetch(`${apiUrl}/ubicacion/${tipo}/${id}`);
                if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
                const data = await res.json();
                responsableInput.value = data.responsable_nombre || "";
            } catch (err) {
                console.error("Error al obtener información de puesto:", err);
                responsableInput.value = "";
            }
        } else {
            responsableInput.value = "";
        }
    });
}

// Funciones para mantenimientos
function mostrarModalMantenimiento() {
    if (tiposMantenimiento.length === 0) {
        mostrarMensajeEquipo("⚠️ No se pudieron cargar los tipos de mantenimiento", true);
        return;
    }

    const modalHTML = `
        <div id="modal-mantenimiento" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h3 class="text-xl font-semibold mb-4">Agregar Mantenimiento Programado</h3>
                <form id="form-mantenimiento">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Tipo de Mantenimiento *</label>
                        <select id="tipo-mantenimiento" class="w-full border rounded px-3 py-2 border-gray-300" required>
                            <option value="">Seleccionar...</option>
                            ${tiposMantenimiento.map(tipo => `<option value="${tipo.id}">${tipo.nombre}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Nombre personalizado (opcional)</label>
                        <input type="text" id="nombre-personalizado" class="w-full border rounded px-3 py-2 border-gray-300" placeholder="Ej: Mantenimiento mensual">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Intervalo (días) *</label>
                        <input type="number" id="intervalo-mantenimiento" class="w-full border rounded px-3 py-2 border-gray-300" min="1" value="30" required>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Fecha de Inicio *</label>
                        <input type="date" id="fecha-inicio-mantenimiento" class="w-full border rounded px-3 py-2 border-gray-300" required>
                    </div>
                    <div class="flex justify-end gap-2 mt-6">
                        <button type="button" onclick="cerrarModalMantenimiento()" class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Agregar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    if (document.getElementById('modal-mantenimiento')) {
        document.getElementById('modal-mantenimiento').remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const fechaInput = document.getElementById('fecha-inicio-mantenimiento');
    if (fechaInput) {
        fechaInput.valueAsDate = new Date();
    }

    const form = document.getElementById('form-mantenimiento');
    if (form) {
        form.addEventListener('submit', agregarMantenimiento);
    }
}

function cerrarModalMantenimiento() {
    const modal = document.getElementById('modal-mantenimiento');
    if (modal) modal.remove();
}

function agregarMantenimiento(e) {
    e.preventDefault();

    const tipoSelect = document.getElementById('tipo-mantenimiento');
    const nombreInput = document.getElementById('nombre-personalizado');
    const intervaloInput = document.getElementById('intervalo-mantenimiento');
    const fechaInput = document.getElementById('fecha-inicio-mantenimiento');

    if (!tipoSelect || !intervaloInput || !fechaInput) return;

    const tipoId = tipoSelect.value;
    const nombrePersonalizado = nombreInput?.value.trim() || '';
    const intervalo = parseInt(intervaloInput.value);
    const fechaInicio = fechaInput.value;

    if (!tipoId || !intervalo || !fechaInicio) {
        mostrarMensajeEquipo("⚠️ Completa todos los campos requeridos", true);
        return;
    }

    const tipo = tiposMantenimiento.find(t => t.id == tipoId);
    if (!tipo) return;

    const proximaFecha = new Date(fechaInicio);
    proximaFecha.setDate(proximaFecha.getDate() + intervalo);

    const mantenimiento = {
        id_tipo: parseInt(tipoId),
        tipo_nombre: tipo.nombre,
        nombre_personalizado: nombrePersonalizado, // Asegurar que siempre se envía
        intervalo_dias: intervalo,
        fecha_inicio: fechaInicio,
        proxima_fecha: proximaFecha.toISOString().split('T')[0]
    };

    console.log('➕ Mantenimiento a agregar:', mantenimiento); // DEBUG

    mantenimientosConfigurados.push(mantenimiento);
    actualizarListaMantenimientos();
    cerrarModalMantenimiento();
    mostrarMensajeEquipo("✅ Mantenimiento agregado correctamente");
}

function actualizarListaMantenimientos() {
    const container = document.getElementById('lista-mantenimientos');
    if (!container) return;

    if (mantenimientosConfigurados.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-500 border-2 border-dashed border-gray-300 rounded">
                <i class="fas fa-tools text-2xl mb-2"></i>
                <p>No hay mantenimientos configurados</p>
            </div>
        `;
        return;
    }

    container.innerHTML = mantenimientosConfigurados.map((mant, index) => {
        // Mostrar nombre personalizado o nombre por defecto
        const nombreDisplay = mant.nombre_personalizado 
            ? `${mant.tipo_nombre}: ${mant.nombre_personalizado}`
            : mant.tipo_nombre;

        return `
        <div class="border border-gray-300 rounded p-3 mb-2 bg-white shadow-sm">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                        <i class="fas fa-tools text-blue-600"></i>
                        <strong class="text-gray-800">${nombreDisplay}</strong>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div><span class="font-medium">Intervalo:</span> ${mant.intervalo_dias} días</div>
                        <div><span class="font-medium">Inicio:</span> ${new Date(mant.fecha_inicio).toLocaleDateString()}</div>
                        <div class="col-span-2">
                            <span class="font-medium">Próxima:</span> 
                            <span class="font-semibold text-green-600">${new Date(mant.proxima_fecha).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <button onclick="eliminarMantenimiento(${index})" class="text-red-500 hover:text-red-700 p-1 ml-2" title="Eliminar mantenimiento">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `}).join('');
}

function eliminarMantenimiento(index) {
    if (index >= 0 && index < mantenimientosConfigurados.length) {
        mantenimientosConfigurados.splice(index, 1);
        actualizarListaMantenimientos();
        mostrarMensajeEquipo("Mantenimiento eliminado");
    }
}

// Función principal para enviar formulario
async function enviarFormularioEquipo(e) {
    e.preventDefault();

    const tipoId = document.getElementById("tipoEquipo")?.value;
    const ubicacion = document.getElementById("ubicacion")?.value;
    const nombre = document.getElementById("nombre")?.value.trim();
    const codigo = document.getElementById("codigo")?.value.trim();
    const responsable = document.getElementById("responsable")?.value.trim();

    if (!tipoId || !ubicacion || !nombre || !codigo || !responsable) {
        mostrarMensajeEquipo("⚠️ Por favor completa todos los campos requeridos.", true);
        return;
    }

    try {
        mostrarMensajeEquipo("⏳ Procesando equipo...");

        const estadoImagen = verificarEstadoImagen();
        let imagenData = null;
        
        if (estadoImagen.tieneNuevaImagen) {
            try {
                imagenData = await subirImagenEquipo();
            } catch (error) {
                const continuar = confirm("❌ Error subiendo imagen. ¿Deseas continuar sin imagen?");
                if (!continuar) {
                    mostrarMensajeEquipo("❌ Creación cancelada por error en imagen", true);
                    return;
                }
            }
        }

        const [tipoUbic, idUbic] = ubicacion.split("-");
        const camposInputs = document.querySelectorAll("#campos-especificos input");
        const camposPersonalizados = {};
        
        camposInputs.forEach(inp => {
            if (inp.value.trim()) {
                camposPersonalizados[inp.name] = inp.value.trim();
            }
        });

        const equipo = {
            nombre,
            descripcion: document.getElementById("descripcion")?.value || "",
            codigo_interno: codigo,
            ubicacion_tipo: tipoUbic,
            id_ubicacion: parseInt(idUbic),
            responsable_nombre: responsable,
            responsable_documento: "N/A",
            id_tipo_equipo: parseInt(tipoId),
            campos_personalizados: camposPersonalizados,
            mantenimientos: mantenimientosConfigurados,
            imagen_url: imagenData?.url || "",
            imagen_public_id: imagenData?.public_id || ""
        };

        const res = await fetch(`${apiUrl}/equipos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(equipo)
        });

        const data = await res.json();

        if (!res.ok) {
            mostrarMensajeEquipo(data.msg || data.error || "⚠️ Error al crear equipo", true);
            return;
        }

        const mensajeImagen = imagenData ? "con imagen" : "sin imagen";
        mostrarMensajeEquipo(`✅ Equipo creado correctamente ${mensajeImagen}`);
        
        setTimeout(() => {
            window.location.href = "equipos.html";
        }, 2000);

    } catch (err) {
        console.error("❌ Error al comunicarse con la API:", err);
        mostrarMensajeEquipo("❌ Error de conexión con el servidor", true);
    }
}

// Configurar event listeners
function configurarEventListeners() {
    const formEquipo = document.getElementById("form-equipo");
    const tipoEquipoSelect = document.getElementById("tipoEquipo");
    
    if (formEquipo) {
        formEquipo.addEventListener("submit", enviarFormularioEquipo);
    }
    
    if (tipoEquipoSelect) {
        tipoEquipoSelect.addEventListener("change", mostrarCamposTipo);
    }
    
    configurarAutocompletarResponsable();
}

// Inicializar página
async function inicializar() {
    console.log("Inicializando página de creación...");

    try {
        configurarPreviewImagen();
        configurarEventListeners();
        
        await cargarTiposMantenimiento();
        await cargarTiposEquipo();
        await cargarUbicaciones();
        
        console.log("✅ Página de creación inicializada correctamente");
    } catch (error) {
        console.error("❌ Error en inicialización:", error);
        mostrarMensajeEquipo("Error al inicializar la página", true);
    }
}

// Hacer funciones globales
window.mostrarModalMantenimiento = mostrarModalMantenimiento;
window.cerrarModalMantenimiento = cerrarModalMantenimiento;
window.agregarMantenimiento = agregarMantenimiento;
window.eliminarMantenimiento = eliminarMantenimiento;
window.mostrarCamposTipo = mostrarCamposTipo;
window.eliminarImagen = eliminarImagen;
window.validarTamañoImagen = validarTamañoImagen;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}