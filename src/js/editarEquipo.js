const apiUrl = "https://inventario-api-gw73.onrender.com";
const equipoId = new URLSearchParams(window.location.search).get("id");

// Variables globales
let tiposMantenimiento = [];
let mantenimientosConfigurados = [];
let equipoData = null;

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
        esError ? "bg-red-100 text-red-800 border-l-4 border-red-500" : "bg-green-100 text-green-800 border-l-4 border-green-500"
    }`;

    setTimeout(() => {
        mensaje.textContent = "";
        mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
    }, 4000);
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

// Cargar ubicaciones
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
    let idUbicacionActual = '';
    if (equipoData.id_puesto) {
        ubicacionActual = `puesto-${equipoData.id_puesto}`;
        idUbicacionActual = equipoData.id_puesto;
    } else if (equipoData.id_area) {
        ubicacionActual = `area-${equipoData.id_area}`;
        idUbicacionActual = equipoData.id_area;
    }

    // Cargar mantenimientos existentes
    mantenimientosConfigurados = equipoData.mantenimientos_configurados || [];

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

        <!-- Ubicación y Responsable -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label for="ubicacion" class="block text-[#0F172A] font-medium mb-1">Ubicación (Área o Puesto)</label>
                <select id="ubicacion" name="ubicacion"
                    class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]"
                    required>
                    <option value="">Selecciona una ubicación...</option>
                    <optgroup label="Áreas">
                        ${areas.map(area => 
                            `<option value="area-${area.id}" ${ubicacionActual === `area-${area.id}` ? 'selected' : ''}>
                                Área: ${area.nombre} (Sede: ${area.sede_nombre})
                            </option>`
                        ).join('')}
                    </optgroup>
                    <optgroup label="Puestos">
                        ${puestos.map(puesto => 
                            `<option value="puesto-${puesto.id}" ${ubicacionActual === `puesto-${puesto.id}` ? 'selected' : ''}>
                                Puesto: ${puesto.codigo} (${puesto.responsable_nombre}) - Área: ${puesto.area_nombre}
                            </option>`
                        ).join('')}
                    </optgroup>
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

    // Mostrar campos específicos del tipo de equipo
    await mostrarCamposTipo();

    // Configurar eventos
    configurarEventos();
}

// Renderizar lista de mantenimientos
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

    return mantenimientosConfigurados.map((mant, index) => `
        <div class="border border-gray-300 rounded p-3 mb-2 bg-white shadow-sm">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                        <i class="fas fa-tools text-blue-600"></i>
                        <strong class="text-gray-800">${mant.tipo_mantenimiento_nombre}</strong>
                        ${mant.nombre_personalizado ? `<span class="text-sm text-gray-600">- ${mant.nombre_personalizado}</span>` : ''}
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
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
                        class="text-red-500 hover:text-red-700 p-1 ml-2"
                        title="Eliminar mantenimiento">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
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
    // Autocompletar responsable
    document.getElementById("ubicacion").addEventListener("change", async (e) => {
        const value = e.target.value;
        const responsableInput = document.getElementById("responsable");

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

    // Enviar formulario
    document.getElementById("form-equipo").addEventListener("submit", async (e) => {
        e.preventDefault();
        await actualizarEquipo();
    });
}

// Actualizar equipo
async function actualizarEquipo() {
    const formData = {
        nombre: document.getElementById("nombre").value.trim(),
        descripcion: document.getElementById("descripcion").value.trim(),
        codigo_interno: document.getElementById("codigo").value.trim(),
        responsable_nombre: document.getElementById("responsable").value.trim(),
        id_tipo_equipo: parseInt(document.getElementById("tipoEquipo").value),
        estado: document.getElementById("estado").value
    };

    // Obtener ubicación
    const ubicacion = document.getElementById("ubicacion").value;
    const [ubicacion_tipo, id_ubicacion] = ubicacion.split("-");
    formData.ubicacion_tipo = ubicacion_tipo;
    formData.id_ubicacion = parseInt(id_ubicacion);

    // Obtener campos personalizados
    const camposInputs = document.querySelectorAll("#campos-especificos input");
    const camposPersonalizados = {};
    camposInputs.forEach(inp => {
        const campoNombre = inp.name.replace('campo_', '');
        camposPersonalizados[campoNombre] = inp.value;
    });
    formData.campos_personalizados = camposPersonalizados;

    try {
        const res = await fetch(`${apiUrl}/equipos/${equipoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Error al actualizar equipo");
        }

        // Actualizar mantenimientos si hay cambios
        await actualizarMantenimientos();

        mostrarMensaje("✅ Equipo actualizado correctamente");
        setTimeout(() => {
            window.location.href = "equipos.html";
        }, 2000);

    } catch (err) {
        console.error("Error al actualizar equipo:", err);
        mostrarMensaje("❌ Error al actualizar equipo: " + err.message, true);
    }
}

// Actualizar mantenimientos
async function actualizarMantenimientos() {
    // Aquí puedes implementar la lógica para actualizar los mantenimientos
    // Por ahora, solo mostramos un mensaje
    console.log("Mantenimientos a actualizar:", mantenimientosConfigurados);
}

// Funciones para mantenimientos (similares a nuevoEquipo.js)
function mostrarModalMantenimiento() {
    // Implementar similar a nuevoEquipo.js
    mostrarMensaje("Funcionalidad en desarrollo", true);
}

function eliminarMantenimiento(index) {
    if (index >= 0 && index < mantenimientosConfigurados.length) {
        mantenimientosConfigurados.splice(index, 1);
        document.getElementById('lista-mantenimientos').innerHTML = renderizarMantenimientos();
        mostrarMensaje("Mantenimiento eliminado");
    }
}

// Inicializar
async function inicializar() {
    await Promise.all([
        cargarTiposMantenimiento(),
        cargarDatosEquipo()
    ]);
    await renderizarFormulario();
}

// Hacer funciones globales
window.mostrarModalMantenimiento = mostrarModalMantenimiento;
window.eliminarMantenimiento = eliminarMantenimiento;
window.mostrarCamposTipo = mostrarCamposTipo;

// Inicializar cuando esté listo el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}