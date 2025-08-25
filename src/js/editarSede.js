const API_BASE = "https://inventario-api-gw73.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  // Obtener el ID desde la URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    mostrarMensaje("ID de sede no especificado en la URL.", true);
    return;
  }

  const form = document.getElementById("editarSedeForm");
  if (!form) {
    mostrarMensaje("Formulario no encontrado.", true);
    return;
  }

  async function cargarSede() {
    try {
      const res = await fetch(`${API_BASE}/sedes/${encodeURIComponent(id)}`);
      if (!res.ok) {
        if (res.status === 404) {
          mostrarMensaje("Sede no encontrada.", true);
        } else {
          mostrarMensaje(`Error al obtener la sede (${res.status}).`, true);
        }
        return;
      }
      const sede = await res.json();

      // Aquí usamos los IDs correctos de tu HTML
      document.getElementById("id_codigo").value = sede.codigo ?? "";
      document.getElementById("id_nombre").value = sede.nombre ?? "";
      document.getElementById("id_direccion").value = sede.direccion ?? "";
    } catch (err) {
      console.error("Error cargando sede:", err);
      mostrarMensaje("Error al conectar con el servidor al cargar la sede.", true);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const datos = {
      codigo: document.getElementById("id_codigo").value.trim(),
      nombre: document.getElementById("id_nombre").value.trim(),
      direccion: document.getElementById("id_direccion").value.trim()
    };

    if (!datos.codigo || !datos.nombre || !datos.direccion) {
      mostrarMensaje("Completa todos los campos.", true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/sedes/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        mostrarMensaje(body.message || `Error al actualizar (${res.status}).`, true);
        return;
      }

      mostrarMensaje("✅ Sede actualizada correctamente.");
      setTimeout(() => { window.location.href = "sedes.html"; }, 900);
    } catch (err) {
      console.error("Error en PUT:", err);
      mostrarMensaje("Error al conectar con el servidor al guardar.", true);
    }
  });

  cargarSede();
});

// Función para mostrar mensajes (mismo diseño que en puestos)
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-sede");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-sede";
    mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50";
    document.body.appendChild(mensaje);
  }
  
  mensaje.textContent = texto;
  mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${esError ? 'bg-red-100 text-red-800 border-l-4 border-red-500' : 'bg-green-100 text-green-800 border-l-4 border-green-500'}`;
  
  setTimeout(() => {
    mensaje.textContent = "";
    mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
  }, 3000);
}