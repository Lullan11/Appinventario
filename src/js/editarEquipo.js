const apiUrl = "https://inventario-api-gw73.onrender.com";
const equipoId = new URLSearchParams(window.location.search).get("id");

// Variables globales
let tiposMantenimiento = [];
let mantenimientosConfigurados = [];
let equipoData = null;
let imagenAEliminar = false;

// Función para mostrar mensajes
function mostrarMensaje(texto, esError = false) {
    let mensaje = document.getElementById("mensaje-edicion");
    if (!mensaje) {
        mensaje = document.createElement("div");
        mensaje.id = "mensaje-edicion";
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

// Mostrar imagen actual del equipo
function mostrarImagenActual() {
    if (!equipoData) return;
    
    const imagenUrl = equipoData.imagen_url;
    const previewContainer = document.getElementById('preview-imagen-actual');
    const noImagenMessage = document.getElementById('no-imagen-message');
    const imagenExistenteContainer = document.getElementById('imagen-existente-container');
    
    console.log("🖼️ Imagen actual:", imagenUrl);
    
    if (imagenUrl) {
        // MOSTRAR IMAGEN EXISTENTE
        if (previewContainer) {
            previewContainer.src = imagenUrl;
            previewContainer.style.display = 'block';
        }
        if (noImagenMessage) noImagenMessage.style.display = 'none';
        if (imagenExistenteContainer) imagenExistenteContainer.style.display = 'block';
    } else {
        // NO HAY IMAGEN
        if (previewContainer) previewContainer.style.display = 'none';
        if (noImagenMessage) noImagenMessage.style.display = 'block';
        if (imagenExistenteContainer) imagenExistenteContainer.style.display = 'none';
    }
}

// Mostrar preview de nueva imagen
function mostrarPreviewImagen(input, previewElement) {
    const archivo = input.files[0];
    if (archivo) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewElement.src = e.target.result;
        };
        reader.readAsDataURL(archivo);
    }
}

// Configurar preview de imagen
function configurarPreviewImagen() {
    const inputImagen = document.getElementById('imagen-equipo');
    const previewContainer = document.getElementById('preview-container');
    const previewImagen = document.getElementById('preview-imagen');
    
    if (inputImagen && previewImagen && previewContainer) {
        inputImagen.addEventListener('change', function(e) {
            const archivo = e.target.files[0];
            if (archivo) {
                mostrarPreviewImagen(inputImagen, previewImagen);
                previewContainer.classList.remove('hidden');
                
                // Si se selecciona nueva imagen, cancelar eliminación
                if (imagenAEliminar) {
                    imagenAEliminar = false;
                    const imagenExistenteContainer = document.getElementById('imagen-existente-container');
                    if (imagenExistenteContainer) {
                        imagenExistenteContainer.style.opacity = '1';
                        imagenExistenteContainer.style.border = 'none';
                    }
                }
            } else {
                previewContainer.classList.add('hidden');
            }
        });
    }
}

// Eliminar imagen
function eliminarImagen() {
    const inputImagen = document.getElementById('imagen-equipo');
    const previewContainer = document.getElementById('preview-container');
    
    // Si hay nueva imagen seleccionada, cancelarla
    if (inputImagen?.files?.length > 0) {
        inputImagen.value = '';
        if (previewContainer) previewContainer.classList.add('hidden');
        mostrarMensaje('🗑️ Cambio de imagen cancelado');
    } 
    // Si hay imagen actual, marcarla para eliminación
    else if (equipoData?.imagen_url) {
        imagenAEliminar = true;
        
        // Marcar visualmente que se eliminará
        const imagenExistenteContainer = document.getElementById('imagen-existente-container');
        if (imagenExistenteContainer) {
            imagenExistenteContainer.style.opacity = '0.5';
            imagenExistenteContainer.style.border = '2px solid red';
        }
        
        mostrarMensaje('🗑️ Imagen marcada para eliminación');
    } else {
        mostrarMensaje('ℹ️ No hay imagen para eliminar');
    }
}

// Subir imagen a Cloudinary
async function subirImagenCloudinary(archivo) {
    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('upload_preset', 'inventario');
    formData.append('cloud_name', 'dzkccjhn9');

    const response = await fetch('https://api.cloudinary.com/v1_1/dzkccjhn9/image/upload', {
        method: 'POST',
        body: formData
    });
    
    const data = await response.json();
    
    if (data.secure_url) {
        return {
            url: data.secure_url,
            public_id: data.public_id
        };
    } else {
        throw new Error(data.error?.message || 'Error al subir imagen');
    }
}

// Manejar imagen del equipo
async function manejarImagenEquipo() {
    const inputImagen = document.getElementById('imagen-equipo');
    const archivo = inputImagen?.files[0];
    
    // CASO 1: Imagen marcada para eliminación
    if (imagenAEliminar) {
        console.log('🗑️ Eliminando imagen existente');
        return {
            url: "",
            public_id: ""
        };
    }
    
    // CASO 2: Nueva imagen para subir
    if (archivo && archivo.size > 0) {
        try {
            mostrarMensaje('📤 Subiendo nueva imagen...');
            const imagenData = await subirImagenCloudinary(archivo);
            mostrarMensaje('✅ Imagen subida correctamente');
            return imagenData;
        } catch (error) {
            console.error('Error subiendo imagen:', error);
            mostrarMensaje('❌ Error subiendo imagen: ' + error.message, true);
            throw error;
        }
    }
    
    // CASO 3: No hay cambios - mantener imagen actual
    console.log('ℹ️ Sin cambios en la imagen');
    return null;
}

// Validar tamaño de imagen
function validarTamañoImagen(input) {
    const archivo = input.files[0];
    const advertencia = document.getElementById('tamaño-advertencia');
    
    if (!archivo) {
        if (advertencia) advertencia.classList.add('hidden');
        return;
    }
    
    const tamañoMB = archivo.size / 1024 / 1024;
    
    if (tamañoMB > 5) {
        if (advertencia) {
            advertencia.textContent = `⚠️ Imagen grande (${tamañoMB.toFixed(1)}MB). Se comprimirá automáticamente.`;
            advertencia.classList.remove('hidden');
        }
    } else {
        if (advertencia) advertencia.classList.add('hidden');
    }
    
    // Mostrar preview
    const previewImagen = document.getElementById('preview-imagen');
    const previewContainer = document.getElementById('preview-container');
    if (previewImagen && previewContainer) {
        mostrarPreviewImagen(input, previewImagen);
        previewContainer.classList.remove('hidden');
    }
}

// Cargar tipos de mantenimiento
async function cargarTiposMantenimiento() {
    try {
        const res = await fetch(`${apiUrl}/tipos-mantenimiento`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

        const data = await res.json();
        tiposMantenimiento = data.filter(tipo => !tipo.nombre.toLowerCase().includes('correctivo'));
        return true;
    } catch (err) {
        console.error("Error al cargar tipos de mantenimiento:", err);
        tiposMantenimiento = [
            { id: 1, nombre: "Preventivo" },
            { id: 3, nombre: "Calibración" }
        ];
        return false;
    }
}

// Cargar datos del equipo
async function cargarDatosEquipo() {
    if (!equipoId) {
        mostrarMensaje("❌ ID de equipo no especificado", true);
        return;
    }

    try {
        const res = await fetch(`${apiUrl}/equipos/${equipoId}/completo`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

        const data = await res.json();
        equipoData = data;
        
        console.log("📥 Datos del equipo cargados:", {
            id: equipoData.id,
            nombre: equipoData.nombre,
            imagen_url: equipoData.imagen_url,
            tieneImagen: !!equipoData.imagen_url
        });
        
        // Cargar mantenimientos existentes
        mantenimientosConfigurados = equipoData.mantenimientos_configurados ? equipoData.mantenimientos_configurados.map(mant => ({
            id: mant.id,
            id_tipo_mantenimiento: mant.id_tipo_mantenimiento,
            tipo_mantenimiento_nombre: mant.tipo_mantenimiento_nombre,
            nombre_personalizado: mant.nombre_personalizado,
            intervalo_dias: mant.intervalo_dias,
            fecha_inicio: mant.fecha_inicio,
            proxima_fecha: mant.proxima_fecha,
            _eliminar: false
        })) : [];
        
        return true;
    } catch (err) {
        console.error("Error al cargar datos del equipo:", err);
        mostrarMensaje("❌ Error al cargar datos del equipo", true);
        return false;
    }
}

// Cargar tipos de equipo
async function cargarTiposEquipo() {
    try {
        const res = await fetch(`${apiUrl}/tipos-equipo`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("Error al cargar tipos de equipo:", err);
        return [];
    }
}

// Cargar ubicaciones (áreas y puestos)
async function cargarUbicaciones() {
    try {
        const [areasRes, puestosRes] = await Promise.all([
            fetch(`${apiUrl}/areas`),
            fetch(`${apiUrl}/puestos`)
        ]);

        if (!areasRes.ok || !puestosRes.ok) throw new Error("Error al cargar ubicaciones");

        const areas = await areasRes.json();
        const puestos = await puestosRes.json();

        return { areas, puestos };
    } catch (err) {
        console.error("Error al cargar ubicaciones:", err);
        return { areas: [], puestos: [] };
    }
}

// Renderizar select de ubicaciones organizado por sedes
function renderizarSelectUbicaciones(areas, puestos, ubicacionActual = '') {
    let html = '<option value="">Selecciona una ubicación...</option>';

    // Agrupar áreas por sede
    const areasPorSede = {};
    areas.forEach(area => {
        const sedeNombre = area.sede_nombre || 'Sin sede';
        if (!areasPorSede[sedeNombre]) {
            areasPorSede[sedeNombre] = [];
        }
        areasPorSede[sedeNombre].push(area);
    });

    // Crear optgroups para áreas por sede
    Object.keys(areasPorSede).forEach(sedeNombre => {
        html += `<optgroup label="📍 ${sedeNombre} - Áreas">`;
        areasPorSede[sedeNombre].forEach(area => {
            const value = `area-${area.id}`;
            const selected = ubicacionActual === value ? 'selected' : '';
            html += `<option value="${value}" ${selected} data-tipo="area" data-sede="${sedeNombre}">
                        🏢 ${area.nombre} (Sede: ${sedeNombre})
                     </option>`;
        });
        html += '</optgroup>';
    });

    // Agrupar puestos por sede
    const puestosPorSede = {};
    puestos.forEach(puesto => {
        const sedeNombre = puesto.sede_nombre || 'Sin sede';
        if (!puestosPorSede[sedeNombre]) {
            puestosPorSede[sedeNombre] = [];
        }
        puestosPorSede[sedeNombre].push(puesto);
    });

    // Crear optgroups para puestos por sede
    Object.keys(puestosPorSede).forEach(sedeNombre => {
        html += `<optgroup label="👤 ${sedeNombre} - Puestos">`;
        puestosPorSede[sedeNombre].forEach(puesto => {
            const value = `puesto-${puesto.id}`;
            const selected = ubicacionActual === value ? 'selected' : '';
            html += `<option value="${value}" ${selected} data-tipo="puesto" data-sede="${sedeNombre}">
                        💼 ${puesto.codigo} - ${puesto.responsable_nombre} (Área: ${puesto.area_nombre}, Sede: ${sedeNombre})
                     </option>`;
        });
        html += '</optgroup>';
    });

    if (areas.length === 0 && puestos.length === 0) {
        html = '<option value="">No hay ubicaciones disponibles</option>';
    }

    return html;
}

// Renderizar formulario
async function renderizarFormulario() {
    const formContainer = document.getElementById("form-equipo");
    const loadingMessage = document.getElementById("loading-message");

    if (!equipoData) {
        loadingMessage.innerHTML = `
            <div class="text-center text-red-600 font-semibold text-lg">
                ❌ No se pudieron cargar los datos del equipo<br/><br/>
                <a href="equipos.html" class="inline-flex items-center px-4 py-2 text-sm font-semibold text-[#0F172A] border border-[#0F172A] rounded hover:bg-[#0F172A] hover:text-white transition">
                    ← Volver al listado
                </a>
            </div>
        `;
        return;
    }

    const tiposEquipo = await cargarTiposEquipo();
    const { areas, puestos } = await cargarUbicaciones();

    // Determinar ubicación actual
    let ubicacionActual = '';
    if (equipoData.id_puesto) {
        ubicacionActual = `puesto-${equipoData.id_puesto}`;
    } else if (equipoData.id_area) {
        ubicacionActual = `area-${equipoData.id_area}`;
    }

    // Detectar si hay imagen
    const tieneImagen = !!equipoData.imagen_url;
    const imagenUrl = equipoData.imagen_url;

    const formularioHTML = `
        <!-- Nombre y Tipo -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label for="nombre" class="block text-[#0F172A] font-medium mb-1">Nombre del Equipo</label>
                <input type="text" id="nombre" name="nombre" value="${equipoData.nombre || ''}"
                    class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]"
                    required />
            </div>
            <div>
                <label for="tipoEquipo" class="block text-[#0F172A] font-medium mb-1">Tipo de Equipo</label>
                <select id="tipoEquipo" name="tipoEquipo"
                    class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]"
                    required onchange="mostrarCamposTipo()">
                    <option value="">Selecciona un tipo...</option>
                    ${tiposEquipo.map(tipo =>
        `<option value="${tipo.id}" ${equipoData.id_tipo_equipo == tipo.id ? 'selected' : ''}>${tipo.nombre}</option>`
    ).join('')}
                </select>
            </div>
        </div>

        <!-- Campos dinámicos -->
        <div id="campos-especificos" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>

        <!-- SECCIÓN DE IMAGEN -->
        <div class="border-2 border-[#0F172A] rounded-lg p-4 bg-gray-50">
            <h3 class="text-lg font-semibold text-[#0F172A] mb-4">Imagen del Equipo</h3>
            
            <div class="space-y-6">
                <!-- IMAGEN ACTUAL DEL EQUIPO -->
                <div id="imagen-existente-container">
                    <h4 class="text-md font-medium text-[#0F172A] mb-3">Imagen Actual del Equipo</h4>
                    
                    ${tieneImagen ? `
                        <div class="flex flex-col md:flex-row items-start gap-6 p-4 bg-white rounded-lg border border-gray-200">
                            <div class="flex-shrink-0">
                                <img id="preview-imagen-actual" 
                                     src="${imagenUrl}" 
                                     class="max-w-64 max-h-64 rounded-lg border-2 border-gray-300 object-contain"
                                     alt="Imagen actual del equipo">
                            </div>
                            <div class="flex-1">
                                <p class="text-sm text-gray-600 mb-4">
                                    Esta es la imagen actual del equipo.
                                </p>
                                <button type="button" onclick="eliminarImagen()" 
                                        class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors flex items-center gap-2">
                                    <i class="fas fa-trash"></i> Eliminar esta imagen
                                </button>
                                <p class="text-xs text-gray-500 mt-2">
                                    Al eliminar, la imagen se quitará del equipo.
                                </p>
                            </div>
                        </div>
                    ` : `
                        <div class="text-center py-8 bg-white rounded-lg border border-gray-200">
                            <i class="fas fa-image text-4xl text-gray-300 mb-3"></i>
                            <p class="text-gray-500">Este equipo no tiene imagen actualmente</p>
                        </div>
                    `}
                    
                    <!-- Mensaje cuando no hay imagen -->
                    <div id="no-imagen-message" class="text-center py-8 bg-white rounded-lg border border-gray-200" style="display: ${tieneImagen ? 'none' : 'block'}">
                        <i class="fas fa-image text-4xl text-gray-300 mb-3"></i>
                        <p class="text-gray-500">Este equipo no tiene imagen actualmente</p>
                    </div>
                </div>

                <!-- SEPARADOR -->
                <div class="border-t border-gray-300 pt-6">
                    <h4 class="text-md font-medium text-[#0F172A] mb-3">Actualizar Imagen</h4>
                    <p class="text-sm text-gray-600 mb-4">
                        Si quieres cambiar la imagen, selecciona una nueva:
                    </p>
                    
                    <!-- Input para subir nueva imagen -->
                    <div class="mb-4">
                        <input type="file" id="imagen-equipo" accept="image/*" 
                               class="w-full border-2 border-[#0F172A] rounded px-3 py-2 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#0F172A] file:text-white hover:file:bg-[#1e293b]"
                               onchange="validarTamañoImagen(this)">
                        <p class="text-xs text-gray-500 mt-1">Formatos: JPG, PNG, WEBP. Máximo: 10MB</p>
                        <p id="tamaño-advertencia" class="text-xs text-amber-600 mt-1 hidden">
                            ⚠️ Esta imagen es muy grande. Se comprimirá automáticamente.
                        </p>
                    </div>
                    
                    <!-- Vista previa de la NUEVA imagen -->
                    <div id="preview-container" class="hidden">
                        <label class="block text-sm font-medium mb-2">Vista previa de la nueva imagen:</label>
                        <div class="flex flex-col md:flex-row items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <img id="preview-imagen" class="max-w-48 max-h-48 rounded border-2 border-blue-300 object-contain">
                            <div class="flex-1">
                                <p class="text-sm text-blue-800 mb-2">
                                    <strong>Nueva imagen seleccionada:</strong> Esta imagen reemplazará a la actual cuando guardes los cambios.
                                </p>
                                <button type="button" onclick="eliminarImagen()" 
                                        class="text-red-600 hover:text-red-800 text-sm flex items-center gap-1">
                                    <i class="fas fa-times"></i> Cancelar cambio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Ubicación y Responsable -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label for="ubicacion" class="block text-[#0F172A] font-medium mb-1">Ubicación (Área o Puesto)</label>
                <select id="ubicacion" name="ubicacion"
                    class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]"
                    required>
                    ${renderizarSelectUbicaciones(areas, puestos, ubicacionActual)}
                </select>
            </div>
            <div>
                <label for="responsable" class="block text-[#0F172A] font-medium mb-1">Responsable</label>
                <input type="text" id="responsable" name="responsable" value="${equipoData.responsable_nombre || ''}"
                    class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]"
                    required />
            </div>
        </div>

        <!-- Código y descripción -->
        <div>
            <label for="codigo" class="block text-[#0F172A] font-medium mb-1">Código del Equipo</label>
            <input type="text" id="codigo" name="codigo" value="${equipoData.codigo_interno || ''}"
                class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]"
                required />
        </div>
        <div>
            <label for="descripcion" class="block text-[#0F172A] font-medium mb-1">Descripción General</label>
            <textarea id="descripcion" name="descripcion" rows="3" placeholder="Describe el equipo..."
                class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#F2B705]">${equipoData.descripcion || ''}</textarea>
        </div>

        <!-- Estado -->
        <div>
            <label for="estado" class="block text-[#0F172A] font-medium mb-1">Estado</label>
            <select id="estado" name="estado"
                class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]">
                <option value="activo" ${equipoData.estado === 'activo' ? 'selected' : ''}>Activo</option>
                <option value="inactivo" ${equipoData.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
        </div>

        <!-- Configuración de Mantenimientos -->
        <div class="border-2 border-[#0F172A] rounded-lg p-4 bg-gray-50">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h3 class="text-lg font-semibold text-[#0F172A]">Mantenimientos Programados</h3>
                    <p class="text-sm text-gray-600">Gestiona los mantenimientos preventivos y calibraciones</p>
                </div>
                <button type="button" onclick="mostrarModalMantenimiento()"
                    class="px-4 py-2 bg-[#0F172A] text-white rounded hover:bg-[#1e293b] transition-colors flex items-center gap-2">
                    <i class="fas fa-plus"></i>
                    Agregar Mantenimiento
                </button>
            </div>

            <div id="lista-mantenimientos" class="space-y-2 min-h-[100px] mantenimientos-container">
                ${renderizarMantenimientos()}
            </div>
        </div>

        <!-- Botones -->
        <div class="flex justify-between flex-wrap gap-4 pt-4">
            <button type="button" onclick="window.location.href='equipos.html'"
                class="bg-white border-2 border-[#0F172A] text-[#0F172A] px-4 py-2 rounded hover:bg-gray-300">Cancelar</button>
            <button type="submit"
                class="px-6 py-2 rounded-lg bg-[#FFD527] text-black font-semibold border-2 border-[#0F172A] hover:bg-yellow-600">
                Actualizar Equipo
            </button>
        </div>
    `;

    formContainer.innerHTML = formularioHTML;
    formContainer.classList.remove('hidden');
    loadingMessage.classList.add('hidden');

    // Configurar preview de imagen
    configurarPreviewImagen();

    // Mostrar imagen actual inmediatamente
    mostrarImagenActual();

    // Mostrar campos específicos del tipo de equipo
    await mostrarCamposTipo();

    // Configurar eventos
    configurarEventos();
}

// Mostrar mantenimientos
function renderizarMantenimientos() {
    if (mantenimientosConfigurados.length === 0) {
        return `
            <div class="text-center py-4 text-gray-500 border-2 border-dashed border-gray-300 rounded">
                <i class="fas fa-tools text-2xl mb-2"></i>
                <p>No hay mantenimientos configurados</p>
                <p class="text-sm">Haz clic en "Agregar Mantenimiento" para configurar</p>
            </div>
        `;
    }

    return mantenimientosConfigurados.map((mant, index) => {
        const estaMarcadoEliminar = mant._eliminar;
        const clasesEliminacion = estaMarcadoEliminar 
            ? 'opacity-50 bg-red-50 border-red-200' 
            : 'bg-white';
        
        return `
        <div class="border border-gray-300 rounded p-3 mb-2 shadow-sm ${clasesEliminacion}">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    ${estaMarcadoEliminar ? `
                        <div class="text-red-600 text-sm font-medium mb-2">
                            <i class="fas fa-trash mr-1"></i>Marcado para eliminar
                        </div>
                    ` : ''}
                    <div class="flex items-center gap-2 mb-2">
                        <i class="fas fa-tools text-blue-600"></i>
                        <strong class="text-gray-800 ${estaMarcadoEliminar ? 'line-through' : ''}">${mant.tipo_mantenimiento_nombre}</strong>
                        ${mant.nombre_personalizado ? `<span class="text-sm text-gray-600 ${estaMarcadoEliminar ? 'line-through' : ''}">- ${mant.nombre_personalizado}</span>` : ''}
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-sm text-gray-600 ${estaMarcadoEliminar ? 'line-through' : ''}">
                        <div>
                            <span class="font-medium">Intervalo:</span> ${mant.intervalo_dias} días
                        </div>
                        <div>
                            <span class="font-medium">Inicio:</span> ${new Date(mant.fecha_inicio).toLocaleDateString()}
                        </div>
                        <div class="col-span-2">
                            <span class="font-medium">Próxima:</span> 
                            <span class="font-semibold text-green-600">
                                ${new Date(mant.proxima_fecha).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
                <button onclick="eliminarMantenimiento(${index})" 
                        class="text-red-500 hover:text-red-700 p-1 ml-2 ${estaMarcadoEliminar ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${estaMarcadoEliminar ? 'disabled' : ''}
                        title="${estaMarcadoEliminar ? 'Ya marcado para eliminar' : 'Eliminar mantenimiento'}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `}).join('');
}

// Mostrar campos específicos del tipo de equipo
async function mostrarCamposTipo() {
    const tipoId = document.getElementById("tipoEquipo").value;
    const container = document.getElementById("campos-especificos");

    if (!container || !tipoId) return;

    try {
        const res = await fetch(`${apiUrl}/tipos-equipo`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

        const tipos = await res.json();
        const tipo = tipos.find(t => t.id == tipoId);

        if (!tipo || !tipo.campos) {
            container.innerHTML = "";
            return;
        }

        container.innerHTML = tipo.campos.map(campo => {
            const nombre = campo.nombre_campo || "Campo";
            let inputType = "text";
            if (campo.tipo_dato === "numero") inputType = "number";
            if (campo.tipo_dato === "fecha") inputType = "date";

            const valor = equipoData.campos_personalizados?.[nombre] || "";

            return `
                <div>
                    <label class="block text-[#0F172A] font-medium mb-1">${nombre}</label>
                    <input type="${inputType}" name="campo_${nombre}" value="${valor}"
                        class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]" />
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Error al mostrar campos específicos:", err);
    }
}

// Configurar eventos
function configurarEventos() {
    // Autocompletar responsable al cambiar ubicación
    document.getElementById("ubicacion").addEventListener("change", async (e) => {
        const value = e.target.value;
        const responsableInput = document.getElementById("responsable");
        const selectedOption = e.target.options[e.target.selectedIndex];

        if (!value || !responsableInput) {
            if (responsableInput) responsableInput.value = "";
            return;
        }

        const [tipo, id] = value.split("-");

        if (tipo === "puesto") {
            try {
                const res = await fetch(`${apiUrl}/ubicacion/${tipo}/${id}`);
                if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

                const data = await res.json();
                responsableInput.value = data.responsable_nombre || "";

                const sede = selectedOption.getAttribute('data-sede');
                console.log(`📍 Ubicación seleccionada: Puesto ${id} en sede ${sede}`);

            } catch (err) {
                console.error("Error al obtener información de puesto:", err);
                responsableInput.value = "";
                mostrarMensaje("Error al obtener responsable del puesto", true);
            }
        } else if (tipo === "area") {
            responsableInput.value = "";
            const sede = selectedOption.getAttribute('data-sede');
            console.log(`📍 Ubicación seleccionada: Área ${id} en sede ${sede}`);
            mostrarMensaje("ℹ️ Área seleccionada - complete manualmente el responsable");
        } else {
            responsableInput.value = "";
        }
    });

    // Enviar formulario
    document.getElementById("form-equipo").addEventListener("submit", async (e) => {
        e.preventDefault();
        await actualizarEquipo();
    });
}

// Actualizar equipo
async function actualizarEquipo() {
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
        submitBtn.disabled = true;

        // Manejar imagen
        let imagenData = null;
        try {
            imagenData = await manejarImagenEquipo();
        } catch (error) {
            if (!confirm("❌ Error con la imagen. ¿Continuar sin cambiar la imagen?")) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }
        }

        const formData = {
            nombre: document.getElementById("nombre").value.trim(),
            descripcion: document.getElementById("descripcion").value.trim(),
            codigo_interno: document.getElementById("codigo").value.trim(),
            responsable_nombre: document.getElementById("responsable").value.trim(),
            id_tipo_equipo: parseInt(document.getElementById("tipoEquipo").value),
            estado: document.getElementById("estado").value
        };

        // Agregar datos de imagen si hay cambios
        if (imagenData) {
            formData.imagen_url = imagenData.url;
            formData.imagen_public_id = imagenData.public_id;
        }

        // Manejar ubicación
        const ubicacion = document.getElementById("ubicacion").value;
        const [tipoUbic, idUbic] = ubicacion.split("-");
        formData.ubicacion_tipo = tipoUbic;
        formData.id_ubicacion = parseInt(idUbic);

        // Campos personalizados
        const camposInputs = document.querySelectorAll("#campos-especificos input");
        const camposPersonalizados = {};
        camposInputs.forEach(inp => {
            const campoNombre = inp.name.replace('campo_', '');
            if (inp.value.trim()) {
                camposPersonalizados[campoNombre] = inp.value.trim();
            }
        });
        formData.campos_personalizados = camposPersonalizados;

        console.log("📤 Enviando datos:", formData);

        // Actualizar equipo
        const res = await fetch(`${apiUrl}/equipos/${equipoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Error HTTP: ${res.status}`);
        }

        // Actualizar mantenimientos
        await actualizarMantenimientos();

        mostrarMensaje('✅ Equipo actualizado correctamente');
        
        setTimeout(() => {
            window.location.href = "equipos.html";
        }, 1500);

    } catch (err) {
        console.error("Error al actualizar equipo:", err);
        mostrarMensaje("❌ " + err.message, true);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        // Resetear variable
        imagenAEliminar = false;
    }
}

// Eliminar mantenimiento
function eliminarMantenimiento(index) {
    if (index >= 0 && index < mantenimientosConfigurados.length) {
        const mantenimiento = mantenimientosConfigurados[index];
        
        if (!confirm(`¿Estás seguro de que quieres eliminar el mantenimiento "${mantenimiento.tipo_mantenimiento_nombre}"?`)) {
            return;
        }

        mantenimientosConfigurados[index]._eliminar = true;
        document.getElementById('lista-mantenimientos').innerHTML = renderizarMantenimientos();

        mostrarMensaje(`🗑️ Mantenimiento "${mantenimiento.tipo_mantenimiento_nombre}" marcado para eliminar (se aplicará al guardar)`);
    }
}

// Procesar eliminaciones de mantenimientos
async function procesarEliminacionesMantenimientos() {
    try {
        const mantenimientosAEliminar = mantenimientosConfigurados.filter(
            mant => mant._eliminar && mant.id
        );

        console.log(`🗑️ Procesando ${mantenimientosAEliminar.length} mantenimientos para eliminar...`);

        for (const mantenimiento of mantenimientosAEliminar) {
            try {
                const res = await fetch(`${apiUrl}/mantenimientos-programados/${mantenimiento.id}`, {
                    method: 'DELETE'
                });
                
                if (res.ok) {
                    console.log(`✅ Mantenimiento ${mantenimiento.id} eliminado de la BD`);
                } else {
                    throw new Error(`Error HTTP: ${res.status}`);
                }
            } catch (err) {
                console.error('Error al eliminar mantenimiento de la BD:', err);
                throw new Error(`No se pudo eliminar el mantenimiento "${mantenimiento.tipo_mantenimiento_nombre}"`);
            }
        }

        mantenimientosConfigurados = mantenimientosConfigurados.filter(mant => !mant._eliminar);
        
        return mantenimientosAEliminar.length;
        
    } catch (err) {
        console.error("❌ Error en procesarEliminacionesMantenimientos:", err);
        throw err;
    }
}

// Actualizar mantenimientos
async function actualizarMantenimientos() {
    try {
        // Procesar eliminaciones
        const eliminadosCount = await procesarEliminacionesMantenimientos();
        
        // Crear nuevos mantenimientos
        console.log("🔄 Procesando mantenimientos para AGREGAR...");
        const mantenimientosNuevos = mantenimientosConfigurados.filter(mant => !mant.id && !mant._eliminar);
        
        if (mantenimientosNuevos.length === 0) {
            console.log("ℹ️ No hay mantenimientos nuevos para agregar");
            if (eliminadosCount > 0) {
                mostrarMensaje(`✅ ${eliminadosCount} mantenimiento(s) eliminado(s) correctamente`);
            }
            return;
        }

        console.log(`➕ Creando ${mantenimientosNuevos.length} mantenimientos nuevos...`);
        
        for (const mantenimiento of mantenimientosNuevos) {
            try {
                const mantenimientoData = {
                    id_tipo_mantenimiento: mantenimiento.id_tipo_mantenimiento,
                    intervalo_dias: mantenimiento.intervalo_dias,
                    fecha_inicio: mantenimiento.fecha_inicio,
                    nombre_personalizado: mantenimiento.nombre_personalizado || null
                };

                console.log(`🔄 Creando: ${mantenimiento.tipo_mantenimiento_nombre}`);
                
                const res = await fetch(`${apiUrl}/equipos/${equipoId}/mantenimientos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mantenimientoData)
                });

                if (res.ok) {
                    console.log(`✅ ${mantenimiento.tipo_mantenimiento_nombre} creado exitosamente`);
                } else {
                    const errorText = await res.text();
                    console.error(`❌ Error creando ${mantenimiento.tipo_mantenimiento_nombre}:`, errorText);
                    throw new Error(`Error al crear ${mantenimiento.tipo_mantenimiento_nombre}: ${errorText}`);
                }
            } catch (err) {
                console.error(`❌ Error en ${mantenimiento.tipo_mantenimiento_nombre}:`, err);
                throw err;
            }
        }

        let mensajeFinal = "✅ Mantenimientos actualizados correctamente";
        if (eliminadosCount > 0) {
            mensajeFinal += ` (${eliminadosCount} eliminado(s))`;
        }
        if (mantenimientosNuevos.length > 0) {
            mensajeFinal += ` (${mantenimientosNuevos.length} agregado(s))`;
        }
        
        console.log(mensajeFinal);

    } catch (err) {
        console.error("❌ Error en actualizarMantenimientos:", err);
        throw new Error("No se pudieron actualizar los mantenimientos: " + err.message);
    }
}

// Modal para mantenimientos
function mostrarModalMantenimiento() {
    let modal = document.getElementById('modal-mantenimiento');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-mantenimiento';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
        modal.innerHTML = `
            <div class="bg-white rounded-lg w-full max-w-md mx-4">
                <div class="border-b border-gray-200 px-6 py-4">
                    <h3 class="text-lg font-semibold text-[#0F172A]">Agregar Mantenimiento</h3>
                </div>
                <div class="px-6 py-4 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Mantenimiento</label>
                        <select id="tipo-mantenimiento" class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]">
                            <option value="">Selecciona un tipo...</option>
                            ${tiposMantenimiento.map(tipo => 
                                `<option value="${tipo.id}">${tipo.nombre}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre Personalizado (opcional)</label>
                        <input type="text" id="nombre-mantenimiento" 
                            placeholder="Ej: Mantenimiento trimestral, Calibración anual..."
                            class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Intervalo (días)</label>
                        <input type="number" id="intervalo-mantenimiento" min="1" value="30"
                            class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                        <input type="date" id="fecha-inicio-mantenimiento"
                            class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]">
                    </div>
                </div>
                <div class="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                    <button type="button" onclick="cerrarModalMantenimiento()"
                        class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">
                        Cancelar
                    </button>
                    <button type="button" onclick="agregarMantenimiento()"
                        class="px-4 py-2 bg-[#0F172A] text-white rounded hover:bg-[#1e293b] transition-colors">
                        Agregar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const fechaInput = document.getElementById('fecha-inicio-mantenimiento');
    const hoy = new Date().toISOString().split('T')[0];
    fechaInput.min = hoy;
    fechaInput.value = hoy;

    modal.classList.remove('hidden');
}

function cerrarModalMantenimiento() {
    const modal = document.getElementById('modal-mantenimiento');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function agregarMantenimiento() {
    const tipoSelect = document.getElementById('tipo-mantenimiento');
    const nombreInput = document.getElementById('nombre-mantenimiento');
    const intervaloInput = document.getElementById('intervalo-mantenimiento');
    const fechaInput = document.getElementById('fecha-inicio-mantenimiento');

    if (!tipoSelect.value) {
        mostrarMensaje('❌ Selecciona un tipo de mantenimiento', true);
        return;
    }

    if (!intervaloInput.value || intervaloInput.value < 1) {
        mostrarMensaje('❌ El intervalo debe ser de al menos 1 día', true);
        return;
    }

    if (!fechaInput.value) {
        mostrarMensaje('❌ Selecciona una fecha de inicio', true);
        return;
    }

    const idTipoMantenimiento = parseInt(tipoSelect.value);
    const tipoMantenimientoNombre = tiposMantenimiento.find(t => t.id === idTipoMantenimiento)?.nombre;
    const nombrePersonalizado = nombreInput.value.trim() || null;
    const intervaloDias = parseInt(intervaloInput.value);
    const fechaInicio = fechaInput.value;

    const fechaInicioObj = new Date(fechaInicio);
    const proximaFecha = new Date(fechaInicioObj);
    proximaFecha.setDate(proximaFecha.getDate() + intervaloDias);

    const nuevoMantenimiento = {
        id_tipo_mantenimiento: idTipoMantenimiento,
        tipo_mantenimiento_nombre: tipoMantenimientoNombre,
        nombre_personalizado: nombrePersonalizado,
        intervalo_dias: intervaloDias,
        fecha_inicio: fechaInicio,
        proxima_fecha: proximaFecha.toISOString().split('T')[0],
        _eliminar: false
    };

    const existeMismoTipo = mantenimientosConfigurados.some(
        mant => mant.id_tipo_mantenimiento === idTipoMantenimiento && !mant._eliminar
    );

    if (existeMismoTipo) {
        mostrarMensaje('⚠️ Ya existe un mantenimiento de este tipo. Elimina el existente primero.', true);
        return;
    }

    mantenimientosConfigurados.push(nuevoMantenimiento);
    document.getElementById('lista-mantenimientos').innerHTML = renderizarMantenimientos();

    cerrarModalMantenimiento();
    tipoSelect.value = '';
    nombreInput.value = '';
    intervaloInput.value = '30';
    fechaInput.value = new Date().toISOString().split('T')[0];

    mostrarMensaje('✅ Mantenimiento agregado correctamente');
}

// Inicializar
async function inicializar() {
    console.log("🔄 Inicializando edición de equipo...");
    await Promise.all([
        cargarTiposMantenimiento(),
        cargarDatosEquipo()
    ]);
    await renderizarFormulario();
    console.log("✅ Edición de equipo inicializada correctamente");
}

// Hacer funciones globales
window.mostrarModalMantenimiento = mostrarModalMantenimiento;
window.cerrarModalMantenimiento = cerrarModalMantenimiento;
window.agregarMantenimiento = agregarMantenimiento;
window.eliminarMantenimiento = eliminarMantenimiento;
window.mostrarCamposTipo = mostrarCamposTipo;
window.eliminarImagen = eliminarImagen;
window.validarTamañoImagen = validarTamañoImagen;

// Inicializar cuando esté listo el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}