document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("https://inventario-api-gw73.onrender.com/sedes");
    const sedes = await res.json();
    renderSedes(sedes);
  } catch (err) {
    console.error("Error cargando sedes:", err);
  }
});

function renderSedes(sedes) {
  const tbody = document.getElementById("tablaSedes");
  tbody.innerHTML = "";

  sedes.forEach((sede) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-100 transition";

    row.innerHTML = `
      <td class="px-4 py-2 border">${sede.codigo}</td>
      <td class="px-4 py-2 border">${sede.nombre}</td>
      <td class="px-4 py-2 border">${sede.direccion}</td>
      <td class="px-4 py-2 border text-center">
        <div class="flex justify-center gap-2 flex-wrap">
          <a href="verSede.html?id=${sede.id}" class="bg-[#FFD527] text-white px-3 py-1 rounded hover:bg-yellow-600">Ver</a>
          <a href="editarSede.html?id=${sede.id}" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Editar</a>
          <div id="delete-controls-${sede.id}">
            <button onclick="mostrarConfirmacion('${sede.id}')" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Eliminar</button>
          </div>
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function mostrarConfirmacion(id) {
  const container = document.getElementById(`delete-controls-${id}`);
  container.innerHTML = `
    <div class="flex gap-1">
      <button onclick="eliminarSede('${id}')" class="bg-red-700 text-white px-2 py-1 rounded">Sí</button>
      <button onclick="cancelarEliminacion('${id}')" class="bg-gray-400 text-white px-2 py-1 rounded">No</button>
    </div>
  `;
}

function cancelarEliminacion(id) {
  const container = document.getElementById(`delete-controls-${id}`);
  container.innerHTML = `
    <button onclick="mostrarConfirmacion('${id}')" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Eliminar</button>
  `;
}

async function eliminarSede(id) {
  try {
    const res = await fetch(`https://inventario-api-gw73.onrender.com/sedes/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMensaje(data.message || "No se pudo eliminar la sede.", true);
      cancelarEliminacion(id);
      return;
    }

    mostrarMensaje("✅ Sede eliminada correctamente.");
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    console.error("Error al eliminar la sede:", err);
    mostrarMensaje("Error al conectar con el servidor.", true);
  }
}

function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje";
    mensaje.className = "mt-4 text-center font-semibold";
    document.querySelector("main").prepend(mensaje);
  }
  mensaje.textContent = texto;
  mensaje.style.color = esError ? "red" : "green";

  setTimeout(() => {
    mensaje.textContent = "";
  }, 3000);
}
