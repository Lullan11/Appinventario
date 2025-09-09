// ../js/equipos.js
const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";

// Al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(API_EQUIPOS);
    if (!res.ok) throw new Error("Error al obtener equipos");

    const equipos = await res.json();
    const tbody = document.getElementById("tablaEquipos");
    tbody.innerHTML = "";

    if (equipos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-gray-500">
            No hay equipos registrados
          </td>
        </tr>
      `;
    } else {
      equipos.forEach(eq => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-100 transition";
        tr.innerHTML = `
          <td class="px-4 py-2 border border-[#0F172A]">${eq.codigo_interno}</td>
          <td class="px-4 py-2 border border-[#0F172A] font-medium">${eq.nombre}</td>
          <td class="px-4 py-2 border border-[#0F172A]">
            ${eq.ubicacion === "puesto"
                  ? `Puesto: ${eq.puesto_codigo || "-"}`
                  : `Área: ${eq.area_nombre || "-"}`
                }
          </td>
          <td class="px-4 py-2 border border-[#0F172A]">
            ${eq.ubicacion === "puesto"
                  ? (eq.puesto_responsable || "-")
                  : (eq.responsable_nombre ? `${eq.responsable_nombre} (${eq.responsable_documento || "-"})` : "-")
                }
          </td>
          <td class="px-4 py-2 border border-[#0F172A]">
            ${eq.proximo_mantenimiento
                  ? eq.proximo_mantenimiento.substring(0, 10).split("-").reverse().join("/")
                  : "-"
                }
          </td>
          <td class="px-4 py-2 border border-[#0F172A] text-center">
            <div class="flex justify-center gap-2">
              <button onclick="window.location.href='verEquipo.html?id=${eq.id}'"
                class="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-600">Ver</button>
              <button onclick="window.location.href='editarEquipo.html?id=${eq.id}'"
                class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Editar</button>
              <div id="delete-controls-${eq.id}">
                <button onclick="mostrarConfirmacion(${eq.id})"
                  class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Eliminar</button>
              </div>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

    }
  } catch (err) {
    console.error("Error cargando equipos:", err);
    mostrarMensaje("❌ Error al cargar los equipos", true);
  }
});

// Función para mostrar confirmación de eliminación
function mostrarConfirmacion(id) {
  const container = document.getElementById(`delete-controls-${id}`);
  container.innerHTML = `
    <div class="flex gap-1">
      <button onclick="eliminarEquipo(${id})" class="bg-red-700 text-white px-2 py-1 rounded">Sí</button>
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

// Función para eliminar equipo
async function eliminarEquipo(id) {
  try {
    const res = await fetch(`${API_EQUIPOS}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Error al eliminar equipo");

    mostrarMensaje("✅ Equipo eliminado correctamente");
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ No se pudo eliminar el equipo", true);
    // Restaurar el botón original en caso de error
    const container = document.getElementById(`delete-controls-${id}`);
    if (container) {
      container.innerHTML = `
        <button onclick="mostrarConfirmacion(${id})" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Eliminar</button>
      `;
    }
  }
}

// Función para mostrar mensajes (mismo diseño que en puestos)
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-equipos");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-equipos";
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
