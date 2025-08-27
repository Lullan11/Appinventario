const API_PUESTOS = "https://inventario-api-gw73.onrender.com/puestos";
const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";

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
    // 🔹 Obtener datos del puesto
    const resPuesto = await fetch(`${API_PUESTOS}/${puestoId}`);
    if (!resPuesto.ok) throw new Error("No se pudo cargar el puesto");

    const puesto = await resPuesto.json();

    // Insertar datos en el HTML
    document.querySelector("#detalle-codigo").textContent = puesto.codigo;
    document.querySelector("#detalle-area").textContent = puesto.area_nombre;
    document.querySelector("#detalle-sede").textContent = puesto.sede_nombre;
    document.querySelector("#detalle-responsable").textContent = puesto.responsable_nombre;
    document.querySelector("#detalle-documento").textContent = puesto.responsable_documento;

    // Botón editar
    document.getElementById("btn-editar").onclick = () => {
      window.location.href = `editarPuesto.html?id=${puestoId}`;
    };

  } catch (err) {
    console.error("Error en puesto:", err);
    mostrarMensaje("❌ Error al cargar los detalles del puesto", true);
    return; // no sigue si el puesto falla
  }

  // 🔹 Intentar cargar equipos (sin romper todo si falla)
  try {
    const resEquipos = await fetch(`${API_EQUIPOS}?puesto_id=${puestoId}`);
    if (!resEquipos.ok) throw new Error("No se pudo cargar equipos");

    const equipos = await resEquipos.json();
    const tbody = document.querySelector("#tabla-equipos tbody");
    tbody.innerHTML = "";

    if (equipos.length === 0) {
      tbody.innerHTML = `<tr>
        <td colspan="3" class="text-center py-4 text-gray-500">No hay equipos asignados</td>
      </tr>`;
    } else {
      equipos.forEach((eq) => {
        const row = document.createElement("tr");
        row.className = "hover:bg-gray-100 transition";
        row.innerHTML = `
          <td class="px-4 py-2 border">${eq.codigo_interno}</td>
          <td class="px-4 py-2 border">${eq.nombre}</td>
          <td class="px-4 py-2 border text-center">
            <button onclick="window.location.href='verEquipo.html?id=${eq.id}'" 
              class="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-600">
              Ver
            </button>
          </td>
        `;
        tbody.appendChild(row);
      });
    }

  } catch (err) {
    console.warn("Equipos no disponibles todavía:", err);
    const tbody = document.querySelector("#tabla-equipos tbody");
    tbody.innerHTML = `<tr>
      <td colspan="3" class="text-center py-4 text-gray-400 italic">No se pudieron cargar los equipos</td>
    </tr>`;
  }
});

// 🔹 Mensajes flotantes
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
