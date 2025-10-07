const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";

// Variables globales
let equiposInactivos = [];

// Cargar equipos inactivos
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch(`${API_EQUIPOS}/inactivos`);
        if (!res.ok) throw new Error("Error al obtener equipos inactivos");

        equiposInactivos = await res.json();
        const contenidoDinamico = document.getElementById("contenido-dinamico");
        
        if (equiposInactivos.length === 0) {
            contenidoDinamico.innerHTML = `
                <div class="max-w-4xl mx-auto bg-white p-8 border-2 border-[#0F172A] rounded-xl shadow-md text-center">
                    <i class="fas fa-archive text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay equipos inactivos</h3>
                    <p class="text-gray-500 mb-4">Todos los equipos se encuentran activos en el sistema.</p>
                    <a href="equipos.html" class="bg-[#639A33] text-white px-4 py-2 rounded hover:bg-green-600 transition">
                        Ver equipos activos
                    </a>
                </div>
            `;
        } else {
            renderizarTablaInactivos(equiposInactivos);
        }
    } catch (err) {
        console.error("Error cargando equipos inactivos:", err);
        mostrarMensaje("❌ Error al cargar equipos inactivos", true);
    }
});

// Función para renderizar la tabla de inactivos
function renderizarTablaInactivos(equipos) {
    const contenidoDinamico = document.getElementById("contenido-dinamico");
    
    contenidoDinamico.innerHTML = `
        <section class="max-w-7xl mx-auto bg-white p-6 border-2 border-[#0F172A] rounded-xl shadow-md">
            <!-- Header con título y contador -->
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-semibold text-[#0F172A]">Equipos Inactivos</h3>
                <span class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                    ${equipos.length} equipo(s) inactivo(s)
                </span>
            </div>

            <!-- Barra de búsqueda -->
            <div class="mb-6">
                <div class="relative max-w-md">
                    <input 
                        type="text" 
                        id="buscar-inactivos" 
                        placeholder="Buscar por código, nombre, motivo..." 
                        class="w-full pl-10 pr-4 py-2 border-2 border-[#0F172A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc2626ff]"
                    >
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fas fa-search text-gray-400"></i>
                    </div>
                </div>
            </div>

            <!-- Tabla -->
            <div class="overflow-x-auto">
                <table class="min-w-full text-left border border-[#0F172A]">
                    <thead class="bg-red-600 text-white">
                        <tr>
                            <th class="px-4 py-2 border border-[#0F172A]">Código</th>
                            <th class="px-4 py-2 border border-[#0F172A]">Nombre</th>
                            <th class="px-4 py-2 border border-[#0F172A]">Motivo de baja</th>
                            <th class="px-4 py-2 border border-[#0F172A]">Fecha de baja</th>
                            <th class="px-4 py-2 border border-[#0F172A]">Realizado por</th>
                            <th class="px-4 py-2 border border-[#0F172A] text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tablaInactivos">
                        ${equipos.map(equipo => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-4 py-2 border border-[#0F172A]">${equipo.codigo_interno}</td>
                                <td class="px-4 py-2 border border-[#0F172A] font-medium">${equipo.nombre}</td>
                                <td class="px-4 py-2 border border-[#0F172A]">${equipo.motivo || '-'}</td>
                                <td class="px-4 py-2 border border-[#0F172A]">${equipo.fecha_baja ? new Date(equipo.fecha_baja).toLocaleDateString() : '-'}</td>
                                <td class="px-4 py-2 border border-[#0F172A]">${equipo.realizado_por || '-'}</td>
                                <td class="px-4 py-2 border border-[#0F172A] text-center">
                                    <button onclick="verPDFInactivo(${equipo.id})" 
                                        class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm">
                                        <i class="fas fa-file-pdf mr-1"></i>Ver PDF
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Mensaje cuando no hay resultados -->
            <div id="sin-resultados" class="hidden text-center py-8">
                <i class="fas fa-search text-3xl text-gray-400 mb-3"></i>
                <h4 class="text-lg font-semibold text-gray-600 mb-2">No se encontraron resultados</h4>
                <p class="text-gray-500">Intenta con otros términos de búsqueda</p>
            </div>
        </section>
    `;

    // Configurar evento de búsqueda
    const buscarInput = document.getElementById('buscar-inactivos');
    if (buscarInput) {
        buscarInput.addEventListener('input', filtrarInactivos);
    }
}

// Función para filtrar inactivos
function filtrarInactivos() {
    const termino = document.getElementById('buscar-inactivos').value.toLowerCase().trim();
    const tablaInactivos = document.getElementById('tablaInactivos');
    const sinResultados = document.getElementById('sin-resultados');
    
    if (!tablaInactivos) return;

    if (termino === '') {
        // Mostrar todos los equipos
        renderizarFilasInactivos(equiposInactivos);
        if (sinResultados) sinResultados.classList.add('hidden');
        return;
    }

    // Filtrar equipos
    const equiposFiltrados = equiposInactivos.filter(equipo => 
        equipo.codigo_interno.toLowerCase().includes(termino) ||
        equipo.nombre.toLowerCase().includes(termino) ||
        (equipo.motivo && equipo.motivo.toLowerCase().includes(termino)) ||
        (equipo.realizado_por && equipo.realizado_por.toLowerCase().includes(termino))
    );

    // Actualizar tabla
    renderizarFilasInactivos(equiposFiltrados);

    // Mostrar/ocultar mensaje de no resultados
    if (sinResultados) {
        if (equiposFiltrados.length === 0) {
            sinResultados.classList.remove('hidden');
        } else {
            sinResultados.classList.add('hidden');
        }
    }
}

// Función para renderizar solo las filas de la tabla
function renderizarFilasInactivos(equipos) {
    const tablaInactivos = document.getElementById('tablaInactivos');
    if (!tablaInactivos) return;

    if (equipos.length === 0) {
        tablaInactivos.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-gray-500">
                    No hay equipos que coincidan con la búsqueda
                </td>
            </tr>
        `;
    } else {
        tablaInactivos.innerHTML = equipos.map(equipo => `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 border border-[#0F172A]">${equipo.codigo_interno}</td>
                <td class="px-4 py-2 border border-[#0F172A] font-medium">${equipo.nombre}</td>
                <td class="px-4 py-2 border border-[#0F172A]">${equipo.motivo || '-'}</td>
                <td class="px-4 py-2 border border-[#0F172A]">${equipo.fecha_baja ? new Date(equipo.fecha_baja).toLocaleDateString() : '-'}</td>
                <td class="px-4 py-2 border border-[#0F172A]">${equipo.realizado_por || '-'}</td>
                <td class="px-4 py-2 border border-[#0F172A] text-center">
                    <button onclick="verPDFInactivo(${equipo.id})" 
                        class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm">
                        <i class="fas fa-file-pdf mr-1"></i>Ver PDF
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// Función para ver PDF de equipo inactivo
async function verPDFInactivo(equipoId) {
    try {
        const res = await fetch(`${API_EQUIPOS}/${equipoId}/inactivo-completo`);
        if (!res.ok) throw new Error("Error al obtener datos del equipo");
        
        const equipo = await res.json();
        
        // Aquí puedes implementar la generación del PDF de visualización
        const contenidoPDF = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Equipo Inactivo - ${equipo.codigo_interno}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                    .section { margin-bottom: 20px; }
                    .section-title { background: #f0f0f0; padding: 8px; font-weight: bold; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
                    .info-item { margin-bottom: 5px; }
                    .label { font-weight: bold; color: #555; }
                    .estado-inactivo { color: #dc2626ff; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>INFORMACIÓN DE EQUIPO INACTIVO</h1>
                    <p class="estado-inactivo">ESTADO: INACTIVO</p>
                </div>
                
                <div class="section">
                    <div class="section-title">DATOS DEL EQUIPO</div>
                    <div class="info-grid">
                        <div class="info-item"><span class="label">Código:</span> ${equipo.codigo_interno}</div>
                        <div class="info-item"><span class="label">Nombre:</span> ${equipo.nombre}</div>
                        <div class="info-item"><span class="label">Tipo:</span> ${equipo.tipo_equipo_nombre || '-'}</div>
                        <div class="info-item"><span class="label">Ubicación:</span> ${equipo.ubicacion === 'puesto' ? `Puesto: ${equipo.puesto_codigo || '-'}` : `Área: ${equipo.area_nombre || '-'}`}</div>
                        <div class="info-item"><span class="label">Motivo baja:</span> ${equipo.motivo || '-'}</div>
                        <div class="info-item"><span class="label">Fecha baja:</span> ${equipo.fecha_baja ? new Date(equipo.fecha_baja).toLocaleDateString() : '-'}</div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const ventanaPDF = window.open('', '_blank');
        ventanaPDF.document.write(contenidoPDF);
        ventanaPDF.document.close();
        
    } catch (err) {
        console.error("Error al generar PDF de visualización:", err);
        mostrarMensaje("❌ Error al generar PDF", true);
    }
}

// Función para mostrar mensajes
function mostrarMensaje(texto, esError = false) {
    let mensaje = document.getElementById("mensaje-inactivos");
    if (!mensaje) {
        mensaje = document.createElement("div");
        mensaje.id = "mensaje-inactivos";
        mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50";
        document.body.appendChild(mensaje);
    }

    mensaje.textContent = texto;
    mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${esError ? "bg-red-100 text-red-800 border-l-4 border-red-500" : "bg-green-100 text-green-800 border-l-4 border-green-500"}`;

    setTimeout(() => {
        mensaje.textContent = "";
        mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
    }, 4000);
}

// Hacer funciones globales
window.verPDFInactivo = verPDFInactivo;