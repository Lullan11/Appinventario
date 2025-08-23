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
  async function cargarAreasSede() {
    const tabla = document.getElementById("tablaAreasSede"); // crea este tbody en verSede.html
    try {
      const res = await fetch(`${API_BASE}/sedes/${encodeURIComponent(id)}/areas`);
      if (!res.ok) {
        console.error("Error al obtener áreas de la sede:", res.status);
        return;
      }

      const areas = await res.json();
      tabla.innerHTML = "";

      if (areas.length === 0) {
        tabla.innerHTML = `<tr><td colspan="3" class="text-center py-4">Esta sede no tiene áreas</td></tr>`;
        return;
      }

      areas.forEach(area => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
        <td class="px-4 py-2 border">${area.codigo}</td>
        <td class="px-4 py-2 border">${area.nombre}</td>
        <td class="px-4 py-2 border text-center">
        <a href="verArea.html?id=${area.id}" class="bg-[#FFD527] text-white px-3 py-1 rounded hover:bg-yellow-600">Ver</a>
        </td>
      `;
        tabla.appendChild(fila);
      });
    } catch (err) {
      console.error("Error cargando áreas de la sede:", err);
    }
  }
  cargarSede();
  cargarAreasSede();

});
