
const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";

// Cargar equipos al iniciar
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch(API_EQUIPOS);
        const equipos = await res.json();
        const tbody = document.getElementById("tablaEquipos");
        tbody.innerHTML = "";

        if (equipos.length === 0) {
            tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-4 text-gray-500">No hay equipos registrados</td>
          </tr>`;
            return;
        }

        equipos.forEach(eq => {
            const row = document.createElement("tr");
            row.className = "hover:bg-gray-100 transition";
            row.innerHTML = `
          <td class="px-4 py-2 border border-[#0F172A]">${eq.codigo_interno}</td>
          <td class="px-4 py-2 border border-[#0F172A]">${eq.nombre}</td>
          <td class="px-4 py-2 border border-[#0F172A]">${eq.ubicacion || "Sin asignar"}</td>
          <td class="px-4 py-2 border border-[#0F172A]">${eq.responsable_nombre || "Sin responsable"}</td>
          <td class="px-4 py-2 border border-[#0F172A] text-center">
            <div class="flex justify-center gap-2">
              <button onclick="verEquipo('${eq.id}')" title="Ver"
                class="bg-yellow-400 text-white font-semibold px-3 py-1 rounded hover:bg-yellow-600 transition">Ver</button>
              <button onclick="editarEquipo('${eq.id}')" title="Editar"
                class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Editar</button>
              <button onclick="eliminarEquipo('${eq.id}')" title="Eliminar"
                class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Eliminar</button>
            </div>
          </td>`;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error("Error cargando equipos:", err);
        document.getElementById("tablaEquipos").innerHTML = `
        <tr><td colspan="5" class="text-center py-4 text-red-500">❌ Error al cargar los equipos</td></tr>`;
    }
});

// Funciones de acción
function editarEquipo(id) {
    window.location.href = `editarEquipo.html?id=${id}`;
}

function eliminarEquipo(id) {
    if (confirm("¿Quieres eliminar este equipo?")) {
        // 👇 Más adelante aquí haremos el formulario de reporte de baja
        alert(`Equipo ${id} eliminado (simulado).`);
    }
}

function verEquipo(id) {
    window.location.href = `verEquipo.html?id=${id}`;
}

