const API_AREAS = "https://inventario-api-gw73.onrender.com/areas";
const API_PUESTOS = "https://inventario-api-gw73.onrender.com/puestos";

document.addEventListener("DOMContentLoaded", async () => {
  // 🔹 Cargar áreas en el select
  try {
    const res = await fetch(API_AREAS);
    if (!res.ok) throw new Error("Error al obtener áreas");

    const areas = await res.json();
    const select = document.getElementById("area");

    areas.forEach((area) => {
      const option = document.createElement("option");
      option.value = area.id; // 👈 tu backend devuelve "id", no "id_area"
      option.textContent = area.nombre;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error cargando áreas:", err);
    mostrarMensaje("❌ Error cargando áreas", true);
  }

  // 🔹 Manejar envío del formulario
  const form = document.getElementById("form-puesto");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const codigo = document.getElementById("codigo").value.trim();
    const id_area = document.getElementById("area").value;
    const responsable_nombre = document.getElementById("responsable").value.trim();
    const responsable_documento = document.getElementById("documento").value.trim();

    if (!codigo || !id_area || !responsable_nombre || !responsable_documento) {
      mostrarMensaje("⚠️ Todos los campos son obligatorios", true);
      return;
    }

    try {
      const res = await fetch(API_PUESTOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo,
          id_area,
          responsable_nombre,
          responsable_documento,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        mostrarMensaje(data.error || "❌ Error al crear el puesto", true);
        return;
      }

      mostrarMensaje("✅ Puesto creado correctamente");
      setTimeout(() => {
        window.location.href = "puestos.html"; // redirigir al listado
      }, 1500);

    } catch (err) {
      console.error("Error creando puesto:", err);
      mostrarMensaje("❌ Error de conexión con el servidor", true);
    }
  });
});

// 🔹 Función de mensajes flotantes
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-puesto");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-puesto";
    mensaje.className =
      "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50";
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
    mensaje.className =
      "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
  }, 3000);
}
