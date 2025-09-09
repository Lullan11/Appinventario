const apiUrl = "https://inventario-api-gw73.onrender.com";

// Función para mostrar mensajes tipo toast
function mostrarMensajeEquipo(texto, esError = false) {
    let mensaje = document.getElementById("mensaje-equipo");
    if (!mensaje) {
        mensaje = document.createElement("div");
        mensaje.id = "mensaje-equipo";
        mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
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
    }, 3000);
}

// Cargar tipos de equipo al iniciar
async function cargarTiposEquipo() {
    const selectTipo = document.getElementById("tipoEquipo");
    selectTipo.innerHTML = '<option value="">Selecciona un tipo...</option>';

    try {
        const res = await fetch(`${apiUrl}/tipos-equipo`);
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
    const tipoId = document.getElementById("tipoEquipo").value;
    const container = document.getElementById("campos-especificos");
    container.innerHTML = "";

    if (!tipoId) return;

    try {
        const res = await fetch(`${apiUrl}/tipos-equipo`);
        const tipos = await res.json();
        const tipo = tipos.find(t => t.id == tipoId);

        if (!tipo || !tipo.campos) return;

        tipo.campos.forEach(campo => {
            const div = document.createElement("div");
            div.innerHTML = `
                <label class="block text-[#0F172A] font-medium mb-1">${campo.nombre_campo}</label>
                <input type="text" name="${campo.nombre_campo}" class="w-full rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705]" />
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error("Error al mostrar campos específicos:", err);
        mostrarMensajeEquipo("Error al mostrar campos específicos", true);
    }
}

// Cargar ubicaciones (áreas y puestos)
async function cargarUbicaciones() {
    const select = document.getElementById("ubicacion");
    select.innerHTML = '<option value="">Selecciona una ubicación...</option>';

    try {
        const areasRes = await fetch(`${apiUrl}/areas`);
        const areas = await areasRes.json();
        areas.forEach(a => {
            const option = document.createElement("option");
            option.value = `area-${a.id}`;
            option.textContent = `Área: ${a.nombre} (Sede: ${a.sede_nombre})`;
            select.appendChild(option);
        });

        const puestosRes = await fetch(`${apiUrl}/puestos`);
        const puestos = await puestosRes.json();
        puestos.forEach(p => {
            const option = document.createElement("option");
            option.value = `puesto-${p.id}`;
            option.textContent = `Puesto: ${p.codigo} (${p.responsable_nombre}) - Área: ${p.area_nombre}`;
            select.appendChild(option);
        });

    } catch (err) {
        console.error("Error al cargar ubicaciones:", err);
        mostrarMensajeEquipo("Error al cargar ubicaciones", true);
    }
}

// Autocompletar responsable al cambiar ubicación
document.getElementById("ubicacion").addEventListener("change", async (e) => {
    const value = e.target.value;
    const responsableInput = document.getElementById("responsable");
    const codigoInput = document.getElementById("codigo");

    if (!value) {
        responsableInput.value = "";
        codigoInput.value = "";
        return;
    }

    const [tipo, id] = value.split("-");
    codigoInput.value = "";

    if (tipo === "puesto") {
        try {
            const res = await fetch(`${apiUrl}/ubicacion/${tipo}/${id}`);
            const data = await res.json();
            responsableInput.value = data.responsable_nombre || "";
        } catch (err) {
            console.error("Error al obtener información de puesto:", err);
            responsableInput.value = "";
            mostrarMensajeEquipo("Error al obtener responsable del puesto", true);
        }
    } else {
        responsableInput.value = "";
    }
});

// Enviar formulario con mantenimientos
document.getElementById("form-equipo").addEventListener("submit", async (e) => {
    e.preventDefault();

    const tipoId = document.getElementById("tipoEquipo").value;
    const ubicacion = document.getElementById("ubicacion").value;
    const nombre = document.getElementById("nombre").value.trim();
    const codigo = document.getElementById("codigo").value.trim();
    const responsable = document.getElementById("responsable").value.trim();
    const frecuencia = parseInt(document.getElementById("frecuencia").value);
    const fechaInicio = document.getElementById("fecha_inicio").value;

    if (!tipoId || !ubicacion || !nombre || !codigo || !responsable || !frecuencia || !fechaInicio) {
        mostrarMensajeEquipo("⚠️ Por favor completa todos los campos requeridos.", true);
        return;
    }

    // Calcular próxima fecha
    const fechaInicioObj = new Date(fechaInicio);
    const proxima = new Date(fechaInicioObj);
    proxima.setDate(proxima.getDate() + frecuencia);

    const [tipoUbic, idUbic] = ubicacion.split("-");
    const camposInputs = document.querySelectorAll("#campos-especificos input");
    const camposPersonalizados = {};
    camposInputs.forEach(inp => {
        camposPersonalizados[inp.name] = inp.value;
    });

    const equipo = {
        nombre,
        descripcion: document.getElementById("descripcion").value,
        codigo_interno: codigo,
        ubicacion_tipo: tipoUbic,
        id_ubicacion: parseInt(idUbic),
        responsable_nombre: responsable,
        responsable_documento: "N/A",
        id_tipo_equipo: parseInt(tipoId),
        campos_personalizados: camposPersonalizados,

        // 🔧 Nuevos campos de mantenimiento
        intervalo_dias: frecuencia,
        fecha_inicio_mantenimiento: fechaInicio,
        proximo_mantenimiento: proxima.toISOString().split("T")[0]
    };

    try {
        const res = await fetch(`${apiUrl}/equipos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(equipo)
        });

        const data = await res.json();

        if (!res.ok) {
            mostrarMensajeEquipo(data.error || "⚠️ Error al crear equipo", true);
            console.error("Error detalle:", data);
            return;
        }

        mostrarMensajeEquipo("✅ Equipo creado correctamente.");
        setTimeout(() => {
            window.location.href = "equipos.html";
        }, 1500);

    } catch (err) {
        console.error("Error al comunicarse con la API:", err);
        mostrarMensajeEquipo("❌ Error al comunicarse con la API.", true);
    }
});

// Inicializar página
cargarTiposEquipo();
cargarUbicaciones();
