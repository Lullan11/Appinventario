// editarSede.js
// Script para editar una sede: carga los datos y hace PUT sin usar alert()

const API_BASE = "https://inventario-api-gw73.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const main = document.querySelector("main") || document.body;
  let mensaje = document.getElementById("mensaje");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje";
    mensaje.className = "mt-4 text-center font-semibold";
    mensaje.style.minHeight = "1.2em";
    const formContainer = document.getElementById("editarSedeForm")?.parentElement || main;
    formContainer.prepend(mensaje);
  }

  // Obtener el ID desde la URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    mensaje.textContent = "ID de sede no especificado en la URL.";
    mensaje.style.color = "red";
    return;
  }

  const form = document.getElementById("editarSedeForm");
  if (!form) {
    mensaje.textContent = "Formulario no encontrado.";
    mensaje.style.color = "red";
    return;
  }

  function showMessage(text, isError = false) {
    mensaje.textContent = text;
    mensaje.style.color = isError ? "red" : "green";
    setTimeout(() => { if (mensaje) mensaje.textContent = ""; }, 3000);
  }

  async function cargarSede() {
    try {
      const res = await fetch(`${API_BASE}/sedes/${encodeURIComponent(id)}`);
      if (!res.ok) {
        if (res.status === 404) {
          showMessage("Sede no encontrada.", true);
        } else {
          showMessage(`Error al obtener la sede (${res.status}).`, true);
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
      showMessage("Error al conectar con el servidor al cargar la sede.", true);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMessage("");

    const datos = {
      codigo: document.getElementById("id_codigo").value.trim(),
      nombre: document.getElementById("id_nombre").value.trim(),
      direccion: document.getElementById("id_direccion").value.trim()
    };

    if (!datos.codigo || !datos.nombre || !datos.direccion) {
      showMessage("Completa todos los campos.", true);
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
        showMessage(body.message || `Error al actualizar (${res.status}).`, true);
        return;
      }

      showMessage("✅ Sede actualizada correctamente.");
      setTimeout(() => { window.location.href = "sedes.html"; }, 900);
    } catch (err) {
      console.error("Error en PUT:", err);
      showMessage("Error al conectar con el servidor al guardar.", true);
    }
  });

  cargarSede();
});
