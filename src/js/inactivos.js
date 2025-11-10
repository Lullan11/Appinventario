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

// Función para ver PDF de equipo inactivo - ACTUALIZADA CON MISMA ESTRUCTURA QUE HOJA DE VIDA
async function verPDFInactivo(equipoId) {
    try {
        const res = await fetch(`${API_EQUIPOS}/${equipoId}/inactivo-completo`);
        if (!res.ok) throw new Error("Error al obtener datos del equipo");
        
        const equipo = await res.json();
        
        // VERIFICAR SI EL EQUIPO TIENE IMAGEN
        const imagenEquipo = equipo.imagen_url || equipo.imagen || equipo.url_imagen;
        console.log("🖼️ Imagen del equipo inactivo para PDF:", imagenEquipo);

        const ventanaPDF = window.open('', '_blank');
        if (!ventanaPDF) {
            mostrarMensaje('❌ Permite ventanas emergentes para generar el PDF', true);
            return;
        }

        const contenidoPDF = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Acta de Baja - ${equipo.codigo_interno}</title>
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
                        font-size: 13px; /* LETRA MÁS GRANDE */
                        line-height: 1.4;
                    }
                    
                    .action-buttons {
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        z-index: 1000;
                        display: flex;
                        gap: 6px;
                    }
                    
                    .action-btn {
                        background: #639A33 !important;
                        color: white;
                        border: none;
                        padding: 6px 10px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 10px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 3px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                        border: 1px solid #4a7a27;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    .action-btn.download {
                        background: #1e40af !important;
                        border: 1px solid #1e3a8a;
                    }
                    
                    .page-container {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0 auto;
                        background: white;
                        padding: 0;
                        position: relative;
                    }
                    
                    /* Header con gradiente verde */
                    .header {
                        background: #639A33 !important;
                        color: white;
                        padding: 15px 25px;
                        position: relative;
                        overflow: hidden;
                        border-bottom: 3px solid #4a7a27;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        min-height: 120px;
                    }
                    
                    .header-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        position: relative;
                        z-index: 2;
                        width: 100%;
                    }
                    
                    .logo-container {
                        display: flex;
                        align-items: center;
                        flex-shrink: 0;
                        width: 100px;
                    }
                    
                    .logo {
                        width: 100px;
                        height: 80px;
                        background: white;
                        border-radius: 6px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        padding: 4px;
                    }
                    
                    .logo img {
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                    }
                    
                    .title-container {
                        flex: 1;
                        text-align: center;
                        padding: 0 15px;
                        margin-top: 15px;
                        position: absolute;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 60%;
                    }
                    
                    .title-container h1 {
                        font-size: 22px; /* LETRA MÁS GRANDE */
                        font-weight: 700;
                        margin-bottom: 3px;
                        color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        line-height: 1.2;
                    }
                    
                    .title-container .subtitle {
                        font-size: 13px; /* LETRA MÁS GRANDE */
                        font-weight: 400;
                        color: white !important;
                        opacity: 0.95;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        line-height: 1.2;
                    }
                    
                    /* ESTRUCTURA DE TRES COLUMNAS IGUAL QUE HOJA DE VIDA */
                    .main-content {
                        display: grid;
                        grid-template-columns: 1fr 1.2fr 1.3fr;
                        gap: 10px;
                        padding: 12px 20px;
                        align-items: start;
                    }
                    
                    /* Columna izquierda: Información general */
                    .left-column {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    
                    /* Columna central: Ubicación y descripción */
                    .center-column {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    
                    /* Columna derecha: Imagen del equipo más grande */
                    .right-column {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 6px;
                        margin-top: -5px;
                    }
                    
                    /* CONTENEDOR PARA IMAGEN DEL EQUIPO MÁS GRANDE */
                    .equipo-imagen-grande {
                        width: 100%;
                        max-width: 220px;
                        text-align: center;
                    }
                    
                    .equipo-imagen-container {
                        background: white;
                        border-radius: 8px;
                        padding: 12px;
                        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.18);
                        border: 2px solid #e2e8f0;
                    }
                    
                    .equipo-imagen {
                        width: 200px;
                        height: 200px;
                        background: white;
                        border-radius: 6px;
                        border: 3px solid #f8fafc;
                        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
                        overflow: hidden;
                        margin: 0 auto;
                    }
                    
                    .equipo-imagen img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    
                    .equipo-imagen-label {
                        font-size: 12px; /* LETRA MÁS GRANDE */
                        color: #1e293b;
                        background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                        padding: 6px 12px;
                        border-radius: 14px;
                        font-weight: 700;
                        margin-top: 8px;
                        border: 1px solid #cbd5e1;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .no-imagen {
                        width: 200px;
                        height: 200px;
                        background: #f8fafc;
                        border-radius: 6px;
                        border: 3px dashed #cbd5e1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #94a3b8;
                        margin: 0 auto;
                    }
                    
                    .no-imagen i {
                        font-size: 40px;
                    }

                    /* Contenido principal */
                    .content {
                        padding: 0 20px 15px 20px;
                        min-height: 230mm;
                    }
                    
                    .section {
                        margin-bottom: 10px;
                        background: white;
                        border-radius: 6px;
                        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                        border: 1px solid #e2e8f0;
                    }
                    
                    /* SECCIÓN COMPACTA */
                    .section-compact .section-content {
                        padding: 8px 10px !important;
                    }
                    
                    .section-compact .info-item {
                        padding: 3px 0 !important;
                        margin-bottom: 0 !important;
                    }
                    
                    .section-title {
                        background: #639A33 !important;
                        padding: 8px 12px; /* LETRA MÁS GRANDE */
                        font-weight: 600;
                        color: white !important;
                        font-size: 12px; /* LETRA MÁS GRANDE */
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        border-left: 4px solid #4a7a27;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .section-content {
                        padding: 10px;
                    }
                    
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                        gap: 6px;
                    }
                    
                    .info-item {
                        display: flex;
                        flex-direction: column;
                        padding: 4px 0;
                        border-bottom: 1px solid #f8fafc;
                        margin-bottom: 2px;
                    }
                    
                    .info-item:last-child {
                        border-bottom: none;
                    }
                    
                    .label {
                        font-weight: 600;
                        color: #475569;
                        font-size: 9px; /* LETRA MÁS GRANDE */
                        margin-bottom: 1px;
                        text-transform: uppercase;
                        letter-spacing: 0.2px;
                    }
                    
                    .value {
                        font-weight: 500;
                        color: #1e293b;
                        font-size: 10px; /* LETRA MÁS GRANDE */
                        line-height: 1.2;
                    }
                    
                    /* Especificaciones técnicas */
                    .specs-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                        gap: 5px;
                        margin-top: 6px;
                    }
                    
                    .spec-item {
                        padding: 3px 0;
                        border-bottom: 1px solid #f1f5f9;
                    }
                    
                    .spec-label {
                        font-weight: 600;
                        color: #475569;
                        font-size: 8px; /* LETRA MÁS GRANDE */
                        text-transform: uppercase;
                    }
                    
                    .spec-value {
                        font-size: 9px; /* LETRA MÁS GRANDE */
                        color: #1e293b;
                    }
                    
                    /* Footer */
                    .footer {
                        margin-top: 15px;
                        padding: 10px 20px;
                        background: #f8fafc;
                        border-top: 2px solid #639A33;
                        text-align: center;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .footer-content {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                        gap: 6px;
                        margin-bottom: 6px;
                    }
                    
                    .footer-item {
                        text-align: center;
                    }
                    
                    .footer-item .label {
                        font-size: 8px; /* LETRA MÁS GRANDE */
                        color: #64748b;
                        margin-bottom: 1px;
                    }
                    
                    .footer-item .value {
                        font-size: 9px; /* LETRA MÁS GRANDE */
                        color: #1e293b;
                        font-weight: 600;
                    }
                    
                    .copyright {
                        font-size: 8px; /* LETRA MÁS GRANDE */
                        color: #94a3b8;
                        margin-top: 6px;
                        padding-top: 6px;
                        border-top: 1px solid #e2e8f0;
                    }
                    
                    /* Control para evitar saltos de página */
                    .no-break {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    
                    /* Badges de estado */
                    .badge {
                        display: inline-block;
                        padding: 1px 5px;
                        border-radius: 8px;
                        font-size: 8px; /* LETRA MÁS GRANDE */
                        font-weight: 600;
                        text-transform: uppercase;
                    }
                    
                    .badge-inactive {
                        background: #fef2f2;
                        color: #dc2626;
                        border: 1px solid #fecaca;
                    }
                    
                    /* ESTILOS CRÍTICOS PARA IMPRESIÓN */
                    @media print {
                        @page {
                            margin: 0;
                            size: A4;
                        }
                        
                        body {
                            margin: 0;
                            padding: 0;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            height: 100%;
                        }
                        
                        .page-container {
                            box-shadow: none;
                            min-height: 100vh;
                            height: 297mm;
                        }
                        
                        .action-buttons {
                            display: none !important;
                        }
                        
                        .header, .section-title, th {
                            background: #639A33 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        .title-container h1,
                        .title-container .subtitle,
                        .section-title {
                            color: white !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
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
                    <!-- Header -->
                    <div class="header">
                        <div class="header-content">
                            <div class="logo-container">
                                <div class="logo">
                                    <img src="../assets/LOGO-IPS-INCONTEC.png" alt="Logo IPS Progresando" />
                                </div>
                            </div>
                            
                            <div class="title-container">
                                <h1>ACTA DE BAJA DE EQUIPO</h1>
                                <div class="subtitle">Sistema de Gestión de Inventarios - IPS Progresando</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- ESTRUCTURA DE TRES COLUMNAS IGUAL QUE HOJA DE VIDA -->
                    <div class="main-content">
                        <!-- Columna izquierda: Información general -->
                        <div class="left-column">
                            <div class="section no-break">
                                <div class="section-title">
                                    <i class="fas fa-info-circle"></i>
                                    INFORMACIÓN DEL EQUIPO
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
                                            <span class="label">Responsable</span>
                                            <span class="value">${equipo.responsable_nombre || 'No asignado'}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Sede</span>
                                            <span class="value">${equipo.sede_nombre || 'No especificada'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Columna central: Ubicación y descripción -->
                        <div class="center-column">
                            <div class="section section-compact no-break">
                                <div class="section-title">
                                    <i class="fas fa-map-marker-alt"></i>
                                    UBICACIÓN Y DESCRIPCIÓN
                                </div>
                                <div class="section-content">
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <span class="label">Ubicación</span>
                                            <span class="value">${equipo.ubicacion === 'puesto' ? 'Puesto' : 'Área'}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">${equipo.ubicacion === 'puesto' ? 'Puesto' : 'Área'}</span>
                                            <span class="value">${equipo.ubicacion === 'puesto' ? (equipo.puesto_codigo || 'No especificado') : (equipo.area_nombre || 'No especificado')}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Descripción</span>
                                            <span class="value" style="font-size: 9px; line-height: 1.1;">${equipo.descripcion || 'No disponible'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Información de la baja -->
                            <div class="section section-compact no-break">
                                <div class="section-title">
                                    <i class="fas fa-file-contract"></i>
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
                                            <span class="value">${equipo.fecha_baja ? new Date(equipo.fecha_baja).toLocaleDateString() : 'No especificada'}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Realizado por</span>
                                            <span class="value">${equipo.realizado_por || 'No especificado'}</span>
                                        </div>
                                        ${equipo.observaciones ? `
                                        <div class="info-item">
                                            <span class="label">Observaciones</span>
                                            <span class="value" style="font-size: 9px; font-style: italic;">${equipo.observaciones}</span>
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Columna derecha: Imagen del equipo MÁS GRANDE -->
                        <div class="right-column">
                            <div class="equipo-imagen-grande">
                                <div class="equipo-imagen-container">
                                    ${imagenEquipo ? `
                                        <div class="equipo-imagen">
                                            <img src="${imagenEquipo}" alt="Imagen del equipo ${equipo.codigo_interno}" 
                                                onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'no-imagen\\'><i class=\\'fas fa-camera\\'></i></div>';" />
                                        </div>
                                        <div class="equipo-imagen-label">EQUIPO DADO DE BAJA</div>
                                    ` : `
                                        <div class="no-imagen">
                                            <i class="fas fa-camera"></i>
                                        </div>
                                        <div class="equipo-imagen-label">SIN IMAGEN</div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Especificaciones técnicas -->
                    <div class="content">
                        ${Object.keys(equipo.campos_personalizados || {}).length > 0 ? `
                        <div class="section no-break">
                            <div class="section-title">
                                <i class="fas fa-cogs"></i>
                                ESPECIFICACIONES
                            </div>
                            <div class="section-content">
                                <div class="specs-grid">
                                    ${Object.entries(equipo.campos_personalizados).slice(0, 12).map(([key, value]) => `
                                        <div class="spec-item">
                                            <div class="spec-label">${key}</div>
                                            <div class="spec-value">${value || 'No especificado'}</div>
                                        </div>
                                    `).join('')}
                                </div>
                                ${Object.keys(equipo.campos_personalizados).length > 12 ? `
                                    <div style="margin-top: 6px; text-align: center;">
                                        <span style="font-size: 9px; color: #64748b;">
                                            + ${Object.keys(equipo.campos_personalizados).length - 12} especificaciones adicionales
                                        </span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- Footer -->
                    <div class="footer">
                        <div class="footer-content">
                            <div class="footer-item">
                                <div class="label">Estado del equipo</div>
                                <div class="value"><span class="badge badge-inactive">INACTIVO</span></div>
                            </div>
                            <div class="footer-item">
                                <div class="label">Fecha de generación</div>
                                <div class="value">${new Date().toLocaleDateString()}</div>
                            </div>
                            <div class="footer-item">
                                <div class="label">Hora de generación</div>
                                <div class="value">${new Date().toLocaleTimeString()}</div>
                            </div>
                        </div>
                        <div class="copyright">
                            © ${new Date().getFullYear()} IPS Progresando - Sistema de Gestión de Inventarios | Acta de Baja generada automáticamente
                        </div>
                    </div>
                </div>

                <script>
                    function downloadPDF() {
                        window.print();
                    }
                    
                    document.addEventListener('keydown', function(e) {
                        if (e.ctrlKey && e.key === 'p') {
                            e.preventDefault();
                            window.print();
                        }
                    });

                    // Forzar colores al cargar
                    document.addEventListener('DOMContentLoaded', function() {
                        const greenElements = document.querySelectorAll('.header, .section-title, th');
                        greenElements.forEach(el => {
                            el.style.backgroundColor = '#639A33';
                            el.style.color = 'white';
                        });
                    });
                </script>
            </body>
            </html>
        `;
        
        ventanaPDF.document.write(contenidoPDF);
        ventanaPDF.document.close();

        // Esperar a que el PDF se cargue completamente
        setTimeout(() => {
            if (ventanaPDF && !ventanaPDF.closed) {
                ventanaPDF.focus();
            }
        }, 1000);
        
    } catch (err) {
        console.error("Error al generar PDF de visualización:", err);
        mostrarMensaje("❌ Error al generar PDF", true);
    }
}

// Hacer funciones globales
window.verPDFInactivo = verPDFInactivo;
window.filtrarInactivos = filtrarInactivos;
window.renderizarFilasInactivos = renderizarFilasInactivos;

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