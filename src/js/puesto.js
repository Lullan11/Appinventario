const API_PUESTOS = "https://inventario-api-gw73.onrender.com/puestos";

// Al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(API_PUESTOS);
    if (!res.ok) throw new Error("Error al obtener puestos");

    const puestos = await res.json();
    const tbody = document.getElementById("tabla-puestos");
    tbody.innerHTML = "";

    if (puestos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-gray-500">
            No hay puestos registrados
          </td>
        </tr>
      `;
    } else {
      puestos.forEach(p => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-100 transition";
        tr.innerHTML = `
          <td class="px-4 py-2 border border-[#0F172A]">${p.codigo}</td>
          <td class="px-4 py-2 border border-[#0F172A]">${p.area_nombre}</td>
          <td class="px-4 py-2 border border-[#0F172A]">${p.sede_nombre}</td>
          <td class="px-4 py-2 border border-[#0F172A]">${p.responsable_nombre}</td>
          <td class="px-4 py-2 border border-[#0F172A]">${p.responsable_documento}</td>
          <td class="px-4 py-2 border border-[#0F172A] text-center">
            <div class="flex justify-center gap-2">
              <button onclick="window.location.href='verPuesto.html?id=${p.id}'"
                class="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-600">Ver</button>
              <button onclick="window.location.href='editarPuesto.html?id=${p.id}'"
                class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Editar</button>
              <div id="delete-controls-${p.id}">
                <button onclick="mostrarConfirmacion(${p.id})"
                  class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Eliminar</button>
              </div>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error("Error cargando puestos:", err);
    mostrarMensaje("❌ Error al cargar los puestos", true);
  }
});

// Función para mostrar confirmación de eliminación
function mostrarConfirmacion(id) {
  const container = document.getElementById(`delete-controls-${id}`);
  container.innerHTML = `
    <div class="flex gap-1">
      <button onclick="eliminarPuesto(${id})" class="bg-red-700 text-white px-2 py-1 rounded">Sí</button>
      <button onclick="cancelarEliminacion(${id})" class="bg-gray-400 text-white px-2 py-1 rounded">No</button>
    </div>
  `;
}

// Función para cancelar eliminación
function cancelarEliminacion(id) {
  const container = document.getElementById(`delete-controls-${id}`);
  container.innerHTML = `
    <button onclick="mostrarConfirmacion(${id})" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Eliminar</button>
  `;
}

// Función para eliminar puesto
async function eliminarPuesto(id) {
  try {
    const res = await fetch(`${API_PUESTOS}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Error al eliminar puesto");

    mostrarMensaje("✅ Puesto eliminado correctamente");
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ No se pudo eliminar el puesto", true);
    // Restaurar el botón original en caso de error
    const container = document.getElementById(`delete-controls-${id}`);
    if (container) {
      container.innerHTML = `
        <button onclick="mostrarConfirmacion(${id})" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Eliminar</button>
      `;
    }
  }
}

// Función para mostrar mensajes (mismo diseño que en sedes)
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-puestos");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-puestos";
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