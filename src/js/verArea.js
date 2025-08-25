const API_AREAS = "https://inventario-api-gw73.onrender.com/areas";
const API_PUESTOS = "https://inventario-api-gw73.onrender.com/puestos";

function getIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

document.addEventListener("DOMContentLoaded", async () => {
    const id = getIdFromUrl();
    if (!id) {
        alert("❌ No se encontró el ID del área.");
        return;
    }

    // 1. Traer datos del área
    try {
        const res = await fetch(`${API_AREAS}/${id}`);
        if (!res.ok) throw new Error("Área no encontrada");

        const area = await res.json();
        document.getElementById("codigo_area").textContent = area.codigo || area.codigo_area;
        document.getElementById("nombre_area").textContent = area.nombre;
        document.getElementById("sede_area").textContent = area.sede_nombre || area.sede;

        // Configurar botón editar
        document.getElementById("btn-editar").onclick = () => {
            window.location.href = `editarArea.html?id=${id}`;
        };
    } catch (err) {
        console.error(err);
        alert("❌ Error al cargar el área.");
    }

    // 2. Traer puestos asociados al área
    try {
        const resP = await fetch(`${API_AREAS}/${id}/puestos`); // 👈 usamos el endpoint correcto
        if (resP.ok) {
            const puestos = await resP.json();
            const tbody = document.getElementById("tabla-puestos");
            tbody.innerHTML = "";

            if (puestos.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4">No hay puestos registrados</td></tr>`;
            } else {
                puestos.forEach(p => {
                    const tr = document.createElement("tr");
                    tr.className = "hover:bg-gray-100 transition";
                    tr.innerHTML = `
                        <td class="px-4 py-2 border">${p.codigo}</td>
                        <td class="px-4 py-2 border">${p.responsable_nombre}</td>
                        <td class="px-4 py-2 border">${p.responsable_documento}</td>
                        <td class="px-4 py-2 border text-center">
                            <button onclick="window.location.href='verPuesto.html?id=${p.id}'" 
                              class="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-600">Ver</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }
    } catch (err) {
        console.error("Error cargando puestos:", err);
    }
});
