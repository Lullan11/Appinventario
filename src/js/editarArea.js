const API_URL = "https://inventario-api-gw73.onrender.com/areas";
const API_SEDES = "https://inventario-api-gw73.onrender.com/sedes";

// Obtener parámetros de la URL (ej: editarArea.html?id=3)
function getIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

document.addEventListener("DOMContentLoaded", async () => {
    const id = getIdFromUrl();
    if (!id) {
        mostrarMensaje("❌ No se encontró el ID del área.", true);
        return;
    }

    let area;

    // 1️⃣ Traer datos del área primero (para saber su sede)
    try {
        const res = await fetch(`${API_URL}/${id}`);
        if (!res.ok) throw new Error("No se encontró el área");
        area = await res.json();

        document.getElementById("nombre_area").value = area.nombre;
        document.getElementById("codigo_area").value = area.codigo;
    } catch (err) {
        console.error("Error cargando área:", err);
        mostrarMensaje("❌ Error al cargar los datos del área.", true);
        return;
    }

    // 2️⃣ Cargar sedes y seleccionar la que corresponda al área
    try {
        const resSedes = await fetch(API_SEDES);
        if (!resSedes.ok) throw new Error("Error al traer sedes");

        const sedes = await resSedes.json();
        const select = document.getElementById("sede");
        select.innerHTML = '<option value="">Selecciona una sede</option>';

        sedes.forEach((sede) => {
            const option = document.createElement("option");
            option.value = sede.id; // 👈 asegúrate que la API devuelva "id"
            option.textContent = sede.nombre;

            // Si coincide con la sede del área → seleccionarla
            if (String(sede.id) === String(area.id_sede)) {
                option.selected = true;
            }

            select.appendChild(option);
        });
    } catch (err) {
        console.error("Error cargando sedes:", err);
        mostrarMensaje("❌ Error al cargar las sedes.", true);
    }

    // 3️⃣ Manejar submit del formulario
    const form = document.getElementById("form-editar-area");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre = document.getElementById("nombre_area").value.trim();
        const codigo = document.getElementById("codigo_area").value.trim();
        const id_sede = document.getElementById("sede").value;

        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ codigo, nombre, id_sede }),
            });

            const data = await res.json();

            if (!res.ok) {
                mostrarMensaje(data.error || "❌ Error al actualizar el área.", true);
                return;
            }

            mostrarMensaje("✅ Área actualizada correctamente.");
            setTimeout(() => {
                window.location.href = "areas.html";
            }, 1500);
        } catch (err) {
            console.error("Error actualizando área:", err);
            mostrarMensaje("❌ Error de conexión con el servidor.", true);
        }
    });
});

// Función para mostrar mensajes de error/éxito
function mostrarMensaje(texto, esError = false) {
    let mensaje = document.getElementById("mensaje");
    if (!mensaje) {
        mensaje = document.createElement("div");
        mensaje.id = "mensaje";
        mensaje.className = "mt-4 text-center font-semibold";
        document.querySelector("main").prepend(mensaje);
    }
    mensaje.textContent = texto;
    mensaje.style.color = esError ? "red" : "green";

    setTimeout(() => {
        mensaje.textContent = "";
    }, 3000);
}
