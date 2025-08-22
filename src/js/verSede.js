// verSede.js
const API_BASE = "https://inventario-api-gw73.onrender.com"; // ajusta si usas local

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    console.error("No se especificó id en la URL");
    return;
  }

  const codigoEl = document.getElementById("codigo");
  const nombreEl = document.getElementById("nombre");
  const direccionEl = document.getElementById("direccion");
  const editarBtn = document.getElementById("editarBtn");

  async function cargarSede() {
    try {
      const res = await fetch(`${API_BASE}/sedes/${encodeURIComponent(id)}`);
      if (!res.ok) {
        console.error("Error al obtener la sede:", res.status);
        return;
      }
      const sede = await res.json();
      codigoEl.textContent = sede.codigo || "";
      nombreEl.textContent = sede.nombre || "";
      direccionEl.textContent = sede.direccion || "";

      editarBtn.onclick = () => {
        window.location.href = `editarSede.html?id=${sede.id}`;
      };
    } catch (err) {
      console.error("Error cargando sede:", err);
    }
  }

  cargarSede();
});
