// areas.js
const API_URL = "https://inventario-api-gw73.onrender.com/areas"; // ajusta el endpoint si es diferente

// 🔹 Cargar todas las áreas
async function cargarAreas() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    const tabla = document.getElementById("tablaAreas");
    tabla.innerHTML = ""; // limpiar antes de renderizar

    if (!data.length) {
      tabla.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-4 text-gray-500">No hay áreas registradas.</td>
        </tr>`;
      return;
    }

    data.forEach(area => {
      const fila = `
        <tr class="hover:bg-gray-100 transition">
          <td class="px-4 py-2 border">${area.codigo}</td>
          <td class="px-4 py-2 border">${area.nombre}</td>
          <td class="px-4 py-2 border">${area.sede_nombre || "Sin sede"}</td>
          <td class="px-4 py-2 border text-center">
            <div class="flex justify-center gap-2">
              <a href="verArea.html?id=${area.id}" class="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-600">Ver</a>
              <a href="editarArea.html?id=${area.id}" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Editar</a>
              <button onclick="eliminarArea(${area.id})" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Eliminar</button>
            </div>
          </td>
        </tr>`;
      tabla.innerHTML += fila;
    });
  } catch (error) {
    console.error("Error al cargar las áreas:", error);
  }
}

// 🔹 Eliminar área
async function eliminarArea(id) {
  if (!confirm("¿Seguro que deseas eliminar esta área?")) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (response.ok) {
      cargarAreas();
    } else {
      console.error("Error al eliminar área");
    }
  } catch (error) {
    console.error("Error en eliminarArea:", error);
  }
}

// Ejecutar cuando cargue el DOM
document.addEventListener("DOMContentLoaded", cargarAreas);
