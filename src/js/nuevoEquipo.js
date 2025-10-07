const apiUrl = "https://inventario-api-gw73.onrender.com";

// Variables globales
let tiposMantenimiento = [];
let mantenimientosConfigurados = [];

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
    mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${esError
        ? "bg-red-100 text-red-800 border-l-4 border-red-500"
        : "bg-green-100 text-green-800 border-l-4 border-green-500"
        }`;

    setTimeout(() => {
        mensaje.textContent = "";
        mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
    }, 4000);
}
// Cargar tipos de mantenimiento (EXCLUYENDO Correctivo)
async function cargarTiposMantenimiento() {
    try {
        console.log("Cargando tipos de mantenimiento...");
        const res = await fetch(`${apiUrl}/tipos-mantenimiento`);

        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }

        const data = await res.json();
        console.log("Tipos de mantenimiento cargados:", data);

        if (Array.isArray(data)) {
            // 🚫 FILTRAR PARA EXCLUIR CORRECTIVO
            tiposMantenimiento = data.filter(tipo =>
                !tipo.nombre.toLowerCase().includes('correctivo')
            );

            // Si después de filtrar no hay tipos, usar valores por defecto sin Correctivo
            if (tiposMantenimiento.length === 0) {
                tiposMantenimiento = [
                    { id: 1, nombre: "Preventivo" },
                    { id: 3, nombre: "Calibración" }
                ];
                console.log("Usando tipos por defecto (sin Correctivo):", tiposMantenimiento);
            }

            return true;
        } else {
            throw new Error("Formato de respuesta inválido");
        }
    } catch (err) {
        console.error("Error al cargar tipos de mantenimiento:", err);

        // Si falla, usar valores por defecto SIN Correctivo
        tiposMantenimiento = [
            { id: 1, nombre: "Preventivo" },
            { id: 3, nombre: "Calibración" }
        ];

        mostrarMensajeEquipo("⚠️ Usando tipos de mantenimiento por defecto", true);
        return false;
    }
}

// Cargar tipos de equipo al iniciar
async function cargarTiposEquipo() {
    const selectTipo = document.getElementById("tipoEquipo");
    if (!selectTipo) {
        console.error("No se encontró el elemento tipoEquipo");
        return;
    }

    selectTipo.innerHTML = '<option value="">Selecciona un tipo...</option>';

    try {
        const res = await fetch(`${apiUrl}/tipos-equipo`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

        const tipos = await res.json();
        console.log("Tipos de equipo cargados:", tipos);

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
    const tipoId = document.getElementById("tipoEquipo").value;
    const container = document.getElementById("campos-especificos");

    if (!container) {
        console.error("No se encontró el contenedor campos-especificos");
        return;
    }

    container.innerHTML = "";

    if (!tipoId) return;

    try {
        const res = await fetch(`${apiUrl}/tipos-equipo`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

        const tipos = await res.json();
        const tipo = tipos.find(t => t.id == tipoId);

        if (!tipo || !tipo.campos) return;

        tipo.campos.forEach(campo => {
            const nombre = campo.nombre_campo || "Campo";
            let inputType = "text";
            if (campo.tipo_dato === "numero") inputType = "number";
            if (campo.tipo_dato === "fecha") inputType = "date";

            const div = document.createElement("div");
            div.innerHTML = `
                <label class="block text-[#0F172A] font-medium mb-1">${nombre}</label>
                <input type="${inputType}" name="${nombre}" class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]" />
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error("Error al mostrar campos específicos:", err);
        mostrarMensajeEquipo("Error al mostrar campos específicos", true);
    }
}


// Cargar ubicaciones (áreas y puestos) con información completa de sede
async function cargarUbicaciones() {
    const select = document.getElementById("ubicacion");
    if (!select) {
        console.error("No se encontró el elemento ubicacion");
        return;
    }

    select.innerHTML = '<option value="">Selecciona una ubicación...</option>';

    try {
        const areasRes = await fetch(`${apiUrl}/areas`);
        if (!areasRes.ok) throw new Error(`Error HTTP en áreas: ${areasRes.status}`);

        const areas = await areasRes.json();
        console.log("Áreas cargadas:", areas);

        // Agrupar áreas por sede para mejor organización
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
            const optgroup = document.createElement('optgroup');
            optgroup.label = `📍 ${sedeNombre} - Áreas`;

            areasPorSede[sedeNombre].forEach(area => {
                const option = document.createElement("option");
                option.value = `area-${area.id}`;
                option.textContent = `🏢 ${area.nombre} (Sede: ${sedeNombre})`;
                option.setAttribute('data-tipo', 'area');
                option.setAttribute('data-sede', sedeNombre);
                optgroup.appendChild(option);
            });

            select.appendChild(optgroup);
        });

        const puestosRes = await fetch(`${apiUrl}/puestos`);
        if (!puestosRes.ok) throw new Error(`Error HTTP en puestos: ${puestosRes.status}`);

        const puestos = await puestosRes.json();
        console.log("Puestos cargados:", puestos);

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
            const optgroup = document.createElement('optgroup');
            optgroup.label = `👤 ${sedeNombre} - Puestos`;

            puestosPorSede[sedeNombre].forEach(puesto => {
                const option = document.createElement("option");
                option.value = `puesto-${puesto.id}`;
                option.textContent = `💼 ${puesto.codigo} - ${puesto.responsable_nombre} (Área: ${puesto.area_nombre}, Sede: ${sedeNombre})`;
                option.setAttribute('data-tipo', 'puesto');
                option.setAttribute('data-sede', sedeNombre);
                optgroup.appendChild(option);
            });

            select.appendChild(optgroup);
        });

        // Si no hay datos, mostrar mensaje
        if (areas.length === 0 && puestos.length === 0) {
            select.innerHTML = '<option value="">No hay ubicaciones disponibles</option>';
        }

    } catch (err) {
        console.error("Error al cargar ubicaciones:", err);
        mostrarMensajeEquipo("Error al cargar ubicaciones", true);

        // Opción de respaldo
        select.innerHTML = `
            <option value="">Error al cargar ubicaciones</option>
            <option value="area-1">Área: Administración (Sede: Principal)</option>
            <option value="puesto-1">Puesto: A001 - Juan Pérez (Área: Administración, Sede: Principal)</option>
        `;
    }
}


// Autocompletar responsable al cambiar ubicación (mejorada)
document.getElementById("ubicacion")?.addEventListener("change", async (e) => {
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
            
            // Mostrar información adicional en consola
            const sede = selectedOption.getAttribute('data-sede');
            console.log(`📍 Ubicación seleccionada: Puesto ${id} en sede ${sede}`);
            
        } catch (err) {
            console.error("Error al obtener información de puesto:", err);
            responsableInput.value = "";
            mostrarMensajeEquipo("Error al obtener responsable del puesto", true);
        }
    } else if (tipo === "area") {
        // Para áreas, limpiar el responsable ya que las áreas no tienen responsable específico
        responsableInput.value = "";
        const sede = selectedOption.getAttribute('data-sede');
        console.log(`📍 Ubicación seleccionada: Área ${id} en sede ${sede}`);
        
        // Opcional: mostrar mensaje informativo
        mostrarMensajeEquipo("ℹ️ Área seleccionada - complete manualmente el responsable");
    } else {
        responsableInput.value = "";
    }
});


// 🆕 FUNCIONES PARA MANEJAR MANTENIMIENTOS


// Mostrar modal para agregar mantenimiento
function mostrarModalMantenimiento() {
    // Verificar que tenemos tipos de mantenimiento
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
                            ${tiposMantenimiento.map(tipo =>
        `<option value="${tipo.id}">${tipo.nombre}</option>`
    ).join('')}
                        </select>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Nombre personalizado (opcional)</label>
                        <input type="text" id="nombre-personalizado" 
                               class="w-full border rounded px-3 py-2 border-gray-300"
                               placeholder="Ej: Mantenimiento mensual, Calibración trimestral">
                        <p class="text-xs text-gray-500 mt-1">Útil para identificar múltiples mantenimientos del mismo tipo</p>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Intervalo (días) *</label>
                        <input type="number" id="intervalo-mantenimiento" class="w-full border rounded px-3 py-2 border-gray-300" 
                               min="1" value="30" required>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Fecha de Inicio *</label>
                        <input type="date" id="fecha-inicio-mantenimiento" class="w-full border rounded px-3 py-2 border-gray-300" required>
                    </div>
                    
                    <div class="flex justify-end gap-2 mt-6">
                        <button type="button" onclick="cerrarModalMantenimiento()" 
                                class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            Agregar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;


    // Evitar duplicados
    if (document.getElementById('modal-mantenimiento')) {
        document.getElementById('modal-mantenimiento').remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Establecer fecha actual por defecto
    const fechaInput = document.getElementById('fecha-inicio-mantenimiento');
    if (fechaInput) {
        fechaInput.valueAsDate = new Date();
    }

    // Configurar el formulario
    const form = document.getElementById('form-mantenimiento');
    if (form) {
        form.addEventListener('submit', agregarMantenimiento);
    }
}

// Cerrar modal de mantenimiento
function cerrarModalMantenimiento() {
    const modal = document.getElementById('modal-mantenimiento');
    if (modal) {
        modal.remove();
    }
}
// Agregar mantenimiento a la lista
function agregarMantenimiento(e) {
    e.preventDefault();

    const tipoSelect = document.getElementById('tipo-mantenimiento');
    const nombreInput = document.getElementById('nombre-personalizado');
    const intervaloInput = document.getElementById('intervalo-mantenimiento');
    const fechaInput = document.getElementById('fecha-inicio-mantenimiento');

    if (!tipoSelect || !intervaloInput || !fechaInput) {
        mostrarMensajeEquipo("⚠️ Error al procesar el formulario", true);
        return;
    }

    const tipoId = tipoSelect.value;
    const nombrePersonalizado = nombreInput?.value.trim() || '';
    const intervalo = parseInt(intervaloInput.value);
    const fechaInicio = fechaInput.value;

    if (!tipoId || !intervalo || !fechaInicio) {
        mostrarMensajeEquipo("⚠️ Completa todos los campos requeridos", true);
        return;
    }

    const tipo = tiposMantenimiento.find(t => t.id == tipoId);
    if (!tipo) {
        mostrarMensajeEquipo("⚠️ Tipo de mantenimiento no válido", true);
        return;
    }

    const proximaFecha = new Date(fechaInicio);
    proximaFecha.setDate(proximaFecha.getDate() + intervalo);

    const mantenimiento = {
        id_tipo: parseInt(tipoId),
        tipo_nombre: tipo.nombre,
        nombre_personalizado: nombrePersonalizado,
        intervalo_dias: intervalo,
        fecha_inicio: fechaInicio,
        proxima_fecha: proximaFecha.toISOString().split('T')[0]
    };

    // 🆕 PERMITIR MÚLTIPLES MANTENIMIENTOS SIN RESTRICCIONES
    // Solo mostramos advertencia si es exactamente igual, pero permitimos agregar
    const existeIdentico = mantenimientosConfigurados.find(m =>
        m.id_tipo === mantenimiento.id_tipo &&
        m.nombre_personalizado === mantenimiento.nombre_personalizado &&
        m.intervalo_dias === mantenimiento.intervalo_dias &&
        m.fecha_inicio === mantenimiento.fecha_inicio
    );

    if (existeIdentico) {
        if (!confirm("⚠️ Ya existe un mantenimiento idéntico. ¿Estás seguro de que quieres agregarlo?")) {
            return;
        }
    }

    mantenimientosConfigurados.push(mantenimiento);
    actualizarListaMantenimientos();
    cerrarModalMantenimiento();

    mostrarMensajeEquipo("✅ Mantenimiento agregado correctamente");
}
// Actualizar lista visual de mantenimientos
function actualizarListaMantenimientos() {
    const container = document.getElementById('lista-mantenimientos');
    if (!container) {
        console.error("No se encontró el contenedor lista-mantenimientos");
        return;
    }

    if (mantenimientosConfigurados.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-500 border-2 border-dashed border-gray-300 rounded">
                <i class="fas fa-tools text-2xl mb-2"></i>
                <p>No hay mantenimientos configurados</p>
                <p class="text-sm">Haz clic en "Agregar Mantenimiento" para configurar</p>
            </div>
        `;
        return;
    }

    container.innerHTML = mantenimientosConfigurados.map((mant, index) => `
        <div class="border border-gray-300 rounded p-3 mb-2 bg-white shadow-sm">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                        <i class="fas fa-tools text-blue-600"></i>
                        <strong class="text-gray-800">${mant.tipo_nombre}</strong>
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

// Eliminar mantenimiento de la lista
// Hacer la función eliminarMantenimiento disponible globalmente
window.eliminarMantenimiento = function (index) {
    if (index >= 0 && index < mantenimientosConfigurados.length) {
        const eliminado = mantenimientosConfigurados.splice(index, 1)[0];
        actualizarListaMantenimientos();
        mostrarMensajeEquipo(`Mantenimiento "${eliminado.tipo_nombre}" eliminado`);
    }
};

// Enviar formulario con mantenimientos
document.getElementById("form-equipo")?.addEventListener("submit", async (e) => {
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

    const [tipoUbic, idUbic] = ubicacion.split("-");
    const camposInputs = document.querySelectorAll("#campos-especificos input");
    const camposPersonalizados = {};
    camposInputs.forEach(inp => {
        camposPersonalizados[inp.name] = inp.value;
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
        mantenimientos: mantenimientosConfigurados
    };

    console.log("Enviando equipo:", equipo);

    try {
        const res = await fetch(`${apiUrl}/equipos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(equipo)
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("Error del servidor:", data);
            mostrarMensajeEquipo(data.msg || data.error || "⚠️ Error al crear equipo", true);
            return;
        }

        mostrarMensajeEquipo("✅ Equipo creado correctamente.");
        setTimeout(() => {
            window.location.href = "equipos.html";
        }, 2000);

    } catch (err) {
        console.error("Error al comunicarse con la API:", err);
        mostrarMensajeEquipo("❌ Error de conexión con el servidor", true);
    }
});

// Inicializar página
async function inicializar() {
    console.log("Inicializando página...");

    // Cargar tipos de mantenimiento primero
    await cargarTiposMantenimiento();

    // Luego cargar el resto
    cargarTiposEquipo();
    cargarUbicaciones();

    console.log("Página inicializada correctamente");
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}