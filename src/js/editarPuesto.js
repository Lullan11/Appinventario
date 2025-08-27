const API_AREAS = "https://inventario-api-gw73.onrender.com/areas";
const API_PUESTOS = "https://inventario-api-gw73.onrender.com/puestos";

// ✅ Obtener ID del puesto desde la URL
function getPuestoIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

document.addEventListener("DOMContentLoaded", async () => {
  const puestoId = getPuestoIdFromUrl();
  if (!puestoId) {
    mostrarMensaje("❌ No se proporcionó un ID de puesto", true);
    return;
  }

  try {
    // 🔹 Cargar áreas en el select
    const resAreas = await fetch(API_AREAS);
    const areas = await resAreas.json();
    const selectArea = document.getElementById("area");

    areas.forEach((area) => {
      const option = document.createElement("option");
      option.value = area.id;
      option.textContent = `${area.nombre} (${area.sede_nombre})`;
      selectArea.appendChild(option);
    });

    // 🔹 Cargar datos del puesto
    const resPuesto = await fetch(`${API_PUESTOS}/${puestoId}`);
    if (!resPuesto.ok) throw new Error("No se pudo obtener el puesto");

    const puesto = await resPuesto.json();

    document.getElementById("codigo").value = puesto.codigo;
    document.getElementById("responsable").value = puesto.responsable_nombre;
    document.getElementById("documento").value = puesto.responsable_documento;
    document.getElementById("area").value = puesto.id_area;

  } catch (err) {
    console.error("Error cargando datos:", err);
    mostrarMensaje("❌ Error al cargar datos", true);
  }

  // 🔹 Manejar envío del formulario
  const form = document.getElementById("form-editar-puesto");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const codigo = document.getElementById("codigo").value.trim();
    const id_area = document.getElementById("area").value;
    const responsable_nombre = document.getElementById("responsable").value.trim();
    const responsable_documento = document.getElementById("documento").value.trim();

    try {
      const res = await fetch(`${API_PUESTOS}/${puestoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, id_area, responsable_nombre, responsable_documento }),
      });

      const data = await res.json();

      if (!res.ok) {
        mostrarMensaje(data.error || "❌ Error al actualizar el puesto", true);
        return;
      }

      mostrarMensaje("✅ Puesto actualizado correctamente");
      setTimeout(() => {
        window.location.href = "puestos.html"; // redirige al listado
      }, 1500);

    } catch (err) {
      console.error("Error al actualizar puesto:", err);
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
    mensaje.className =
      "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
  }, 3000);
}
