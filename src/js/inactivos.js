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
        
        // PDF con diseño mejorado y botones de acción
        const contenidoPDF = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Equipo Inactivo - ${equipo.codigo_interno}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                    
                    * { 
                        margin: 0; 
                        padding: 0; 
                        box-sizing: border-box; 
                    }
                    
                    body { 
                        font-family: 'Inter', Arial, sans-serif; 
                        margin: 0; 
                        padding: 0; 
                        background: white;
                        color: #1e293b;
                    }
                    
                    .action-buttons {
                        position: fixed;
                        top: 15px;
                        right: 15px;
                        z-index: 1000;
                        display: flex;
                        gap: 8px;
                    }
                    
                    .action-btn {
                        background: linear-gradient(135deg, #639A33 0%, #4a7a27 100%);
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                        transition: all 0.3s;
                        border: 1px solid #4a7a27;
                    }
                    
                    .action-btn:hover {
                        background: linear-gradient(135deg, #4a7a27 0%, #3a6a1f 100%);
                        transform: translateY(-1px);
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.25);
                    }
                    
                    .action-btn.download {
                        background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
                        border: 1px solid #1e3a8a;
                    }
                    
                    .action-btn.download:hover {
                        background: linear-gradient(135deg, #1e3a8a 0%, #1e2f6d 100%);
                    }
                    
                    .page-container {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0 auto;
                        background: white;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        position: relative;
                    }
                    
                    .header {
                        background: linear-gradient(135deg, #639A33 0%, #4a7a27 100%);
                        color: white;
                        padding: 20px 30px;
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                        border-bottom: 3px solid #4a7a27;
                    }
                    
                    .logo-container {
                        display: inline-block;
                        background: white;
                        padding: 10px;
                        border-radius: 10px;
                        margin-bottom: 15px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
                    }
                    
                    .logo-container img {
                        width: 90px;
                        height: 90px;
                        object-fit: contain;
                    }
                    
                    .header h1 {
                        font-size: 26px;
                        font-weight: 700;
                        margin-bottom: 8px;
                        color: white;
                        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                    }
                    
                    .status-badge {
                        display: inline-block;
                        background: rgba(220, 38, 38, 0.95);
                        color: white;
                        padding: 8px 20px;
                        border-radius: 20px;
                        font-weight: 700;
                        font-size: 13px;
                        margin-top: 8px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        border: 2px solid rgba(255, 255, 255, 0.3);
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    }
                    
                    .content {
                        padding: 25px 30px;
                    }
                    
                    .two-columns {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-bottom: 20px;
                    }
                    
                    .section {
                        background: white;
                        border-radius: 10px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                        border: 1px solid #e2e8f0;
                    }
                    
                    .section-title {
                        background: linear-gradient(135deg, #639A33 0%, #4a7a27 100%);
                        padding: 14px 20px;
                        font-weight: 600;
                        color: white;
                        font-size: 14px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        border-left: 4px solid #4a7a27;
                    }
                    
                    .section-content {
                        padding: 20px;
                    }
                    
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }
                    
                    .info-item {
                        display: flex;
                        flex-direction: column;
                        padding: 8px 0;
                        border-bottom: 1px solid #f8fafc;
                    }
                    
                    .info-item:last-child {
                        border-bottom: none;
                    }
                    
                    .label {
                        font-weight: 600;
                        color: #475569;
                        font-size: 11px;
                        margin-bottom: 4px;
                        text-transform: uppercase;
                        letter-spacing: 0.3px;
                    }
                    
                    .value {
                        font-weight: 500;
                        color: #1e293b;
                        font-size: 13px;
                        line-height: 1.4;
                    }
                    
                    .footer {
                        margin-top: 25px;
                        padding: 20px 30px;
                        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                        border-top: 2px solid #639A33;
                        text-align: center;
                    }
                    
                    .copyright {
                        font-size: 11px;
                        color: #64748b;
                        margin-top: 10px;
                    }
                    
                    @media print {
                        .action-buttons {
                            display: none !important;
                        }
                        
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        
                        .page-container {
                            box-shadow: none;
                        }
                    }
                </style>
            </head>
            <body>
                <!-- Botones de acción -->
                <div class="action-buttons">
                    <button class="action-btn download" onclick="downloadPDF()">
                        <i class="fas fa-download"></i> Descargar
                    </button>
                    <button class="action-btn" onclick="window.print()">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                </div>
            
                <div class="page-container">
                    <div class="header">
                        <div class="logo-container">
                            <img src="../assets/LOGO-IPS-INCONTEC.png" alt="Logo IPS Progresando" />
                        </div>
                        <h1>INFORMACIÓN DE EQUIPO INACTIVO</h1>
                        <div class="status-badge">EQUIPO INACTIVO - DADO DE BAJA</div>
                    </div>
                    
                    <div class="content">
                        <div class="two-columns">
                            <!-- Datos generales -->
                            <div class="section">
                                <div class="section-title">
                                    <i class="fas fa-info-circle"></i>
                                    DATOS GENERALES
                                </div>
                                <div class="section-content">
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <span class="label">Código interno</span>
                                            <span class="value">${equipo.codigo_interno}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Nombre del equipo</span>
                                            <span class="value">${equipo.nombre}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Tipo de equipo</span>
                                            <span class="value">${equipo.tipo_equipo_nombre || 'No especificado'}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Ubicación</span>
                                            <span class="value">${equipo.ubicacion === 'puesto' ? `Puesto: ${equipo.puesto_codigo || 'No especificado'}` : `Área: ${equipo.area_nombre || 'No especificado'}`}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Sede</span>
                                            <span class="value">${equipo.sede_nombre || 'No especificada'}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Descripción</span>
                                            <span class="value">${equipo.descripcion || 'No disponible'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Información de baja -->
                            <div class="section">
                                <div class="section-title">
                                    <i class="fas fa-ban"></i>
                                    INFORMACIÓN DE LA BAJA
                                </div>
                                <div class="section-content">
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <span class="label">Motivo de baja</span>
                                            <span class="value">${equipo.motivo || 'No especificado'}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Fecha de baja</span>
                                            <span class="value">${equipo.fecha_baja ? new Date(equipo.fecha_baja).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'No especificada'}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Realizado por</span>
                                            <span class="value">${equipo.realizado_por || 'No especificado'}</span>
                                        </div>
                                        ${equipo.observaciones ? `
                                        <div class="info-item">
                                            <span class="label">Observaciones</span>
                                            <span class="value" style="font-style: italic;">${equipo.observaciones}</span>
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <div class="copyright">
                            © ${new Date().getFullYear()} IPS Progresando - Sistema de Gestión de Inventarios
                            <br>Documento generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}
                        </div>
                    </div>
                </div>

                <script>
                    function downloadPDF() {
                        window.print();
                    }
                    
                    // También permitir Ctrl+P para descarga
                    document.addEventListener('keydown', function(e) {
                        if (e.ctrlKey && e.key === 'p') {
                            e.preventDefault();
                            window.print();
                        }
                    });
                    
                    // Mejorar la experiencia de impresión
                    window.addEventListener('beforeprint', function() {
                        document.title = 'Equipo_Inactivo_${equipo.codigo_interno}';
                    });
                </script>
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