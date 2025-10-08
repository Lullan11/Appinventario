const API_URL = "https://inventario-api-gw73.onrender.com/areas";

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

    data.forEach((area) => {
      const row = document.createElement("tr");
      row.className = "hover:bg-gray-100 transition";

      row.innerHTML = `
        <td class="px-4 py-2 border">${area.codigo}</td>
        <td class="px-4 py-2 border">${area.nombre}</td>
        <td class="px-4 py-2 border">${area.sede_nombre || "Sin sede"}</td>
        <td class="px-4 py-2 border text-center">
          <div class="flex justify-center gap-2 flex-wrap">
            <a href="verArea.html?id=${area.id}" class="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-600"><i class="fas fa-eye"></i> Ver</a>
            <a href="editarArea.html?id=${area.id}" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"><i class="fas fa-edit"></i> Editar</a>
            <div id="delete-controls-${area.id}">
              <button onclick="mostrarConfirmacionArea('${area.id}')" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"><i class="fas fa-trash"></i> Eliminar</button>
            </div>
          </div>
        </td>
      `;

      tabla.appendChild(row);
    });
  } catch (error) {
    console.error("Error al cargar las áreas:", error);
    mostrarMensaje("Error al cargar las áreas", true);
  }
}

// 🔹 Mostrar confirmación inline
function mostrarConfirmacionArea(id) {
  const container = document.getElementById(`delete-controls-${id}`);
  container.innerHTML = `
    <div class="flex gap-1">
      <button onclick="eliminarArea('${id}')" class="bg-red-700 text-white px-2 py-1 rounded">Sí</button>
      <button onclick="cancelarEliminacionArea('${id}')" class="bg-gray-400 text-white px-2 py-1 rounded">No</button>
    </div>
  `;
}

// 🔹 Cancelar eliminación
function cancelarEliminacionArea(id) {
  const container = document.getElementById(`delete-controls-${id}`);
  container.innerHTML = `
    <button onclick="mostrarConfirmacionArea('${id}')" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"><i class="fas fa-trash"></i> Eliminar</button>
  `;
}

// 🔹 Eliminar área
async function eliminarArea(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      mostrarMensaje(data.message || "❌ No se pudo eliminar el área.", true);
      cancelarEliminacionArea(id);
      return;
    }

    mostrarMensaje("✅ Área eliminada correctamente.");
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    console.error("Error al eliminar el área:", err);
    mostrarMensaje("Error al conectar con el servidor.", true);
  }
}

// Función para mostrar mensajes
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-areas");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-areas";
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

// Ejecutar cuando cargue el DOM
document.addEventListener("DOMContentLoaded", cargarAreas);