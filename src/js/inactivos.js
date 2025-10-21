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

// Función para ver PDF de equipo inactivo - ACTUALIZADA CON IMAGEN DEL EQUIPO
// Función para ver PDF de equipo inactivo - COMPLETA CON TODO EL CONTENIDO
async function verPDFInactivo(equipoId) {
    try {
        const res = await fetch(`${API_EQUIPOS}/${equipoId}/inactivo-completo`);
        if (!res.ok) throw new Error("Error al obtener datos del equipo");
        
        const equipo = await res.json();
        
        // 🆕 VERIFICAR SI EL EQUIPO TIENE IMAGEN
        const imagenEquipo = equipo.imagen_url || equipo.imagen || equipo.url_imagen;
        console.log("🖼️ Imagen del equipo inactivo para PDF:", imagenEquipo);

        // CONTENIDO BÁSICO - INFORMACIÓN DEL EQUIPO Y BAJA
        const contenidoBasico = `
            <!-- Información del equipo -->
            <div class="section no-break">
                <div class="section-title">
                    <i class="fas fa-laptop-medical"></i>
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
                            <span class="label">Ubicación</span>
                            <span class="value">${equipo.ubicacion === 'puesto' ? `Puesto: ${equipo.puesto_codigo || 'No especificado'}` : `Área: ${equipo.area_nombre || 'No especificado'}`}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Responsable</span>
                            <span class="value">${equipo.responsable_nombre || 'No asignado'}</span>
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
            
            <!-- Información de la baja -->
            <div class="section no-break">
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
                        <div class="info-item" style="grid-column: 1 / -1;">
                            <span class="label">Observaciones</span>
                            <span class="value" style="font-size: 9px; font-style: italic;">${equipo.observaciones}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // ESPECIFICACIONES TÉCNICAS
        const especificacionesHTML = Object.keys(equipo.campos_personalizados || {}).length > 0 ? `
            <!-- Especificaciones -->
            <div class="section no-break">
                <div class="section-title">
                    <i class="fas fa-cogs"></i>
                    ESPECIFICACIONES
                </div>
                <div class="section-content">
                    <div class="info-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
                        ${Object.entries(equipo.campos_personalizados).slice(0, 12).map(([key, value]) => `
                            <div class="info-item">
                                <span class="label">${key}</span>
                                <span class="value">${value || 'No especificado'}</span>
                            </div>
                        `).join('')}
                    </div>
                    ${Object.keys(equipo.campos_personalizados).length > 12 ? `
                        <div style="margin-top: 8px; text-align: center;">
                            <span style="font-size: 8px; color: #64748b;">
                                + ${Object.keys(equipo.campos_personalizados).length - 12} especificaciones adicionales
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>
        ` : '';

        // SECCIONES EXTRA PARA LLENAR ESPACIO
        const seccionesExtra = Object.keys(equipo.campos_personalizados || {}).length < 6 ? `
            <!-- Espacio adicional para asegurar que el footer sea visible -->
            <div class="section no-break" style="opacity: 0.7;">
                <div class="section-title">
                    <i class="fas fa-info"></i>
                    INFORMACIÓN ADICIONAL
                </div>
                <div class="section-content">
                    <div style="text-align: center; padding: 20px; color: #64748b;">
                        <i class="fas fa-file-alt" style="font-size: 24px; margin-bottom: 10px;"></i>
                        <p style="font-size: 10px;">Documento generado por el Sistema de Gestión de Inventarios IPS Progresando</p>
                    </div>
                </div>
            </div>
        ` : '';

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
                        font-size: 11px;
                        line-height: 1.3;
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
                    
                    /* Header con gradiente verde - MEJORADO EL CENTRADO */
                    .header {
                        background: #639A33 !important;
                        color: white;
                        padding: 15px 25px;
                        position: relative;
                        overflow: hidden;
                        border-bottom: 3px solid #4a7a27;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        min-height: 140px; /* Aumenté la altura mínima */
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
                        width: 130px; /* Ancho fijo para el logo */
                    }
                    
                    .logo {
                        width: 130px;
                        height: 100px;
                        background: white;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        padding: 5px;
                    }
                    
                    .logo img {
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                    }
                    
                    .title-container {
                        flex: 1;
                        text-align: center;
                        padding: 0 20px;
                        margin-top: 20px; /* Aumenté el espacio para mejor centrado */
                        position: absolute;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 60%; /* Ancho controlado para mejor centrado */
                    }
                    
                    .title-container h1 {
                        font-size: 20px;
                        font-weight: 700;
                        margin-bottom: 4px;
                        color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        line-height: 1.2;
                    }
                    
                    .title-container .subtitle {
                        font-size: 12px;
                        font-weight: 400;
                        color: white !important;
                        opacity: 0.95;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        line-height: 1.2;
                    }
                    
                    .document-info {
                        text-align: right;
                        background: rgba(255, 255, 255, 0.15);
                        padding: 8px 10px;
                        border-radius: 6px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        flex-shrink: 0;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        margin-top: 15px;
                        max-width: 180px; /* Ancho máximo limitado */
                        margin-left: auto; /* Empuja a la derecha */
                    }
                    
                    .document-info .document-number {
                        font-size: 11px;
                        font-weight: 600;
                        margin-bottom: 3px;
                        color: white !important;
                    }
                    
                    .document-info .document-date {
                        font-size: 10px;
                        color: white !important;
                        opacity: 0.9;
                    }
                    
                    /* 🆕 CONTENEDOR PARA IMAGEN DEL EQUIPO - POSICIÓN CORREGIDA */
                    .equipo-imagen-container {
                        position: absolute;
                        top: 15px;
                        right: 25px;
                        z-index: 3;
                        text-align: center;
                    }
                    
                    .equipo-imagen {
                        width: 80px;
                        height: 80px;
                        background: white;
                        border-radius: 6px;
                        border: 2px solid white;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                        overflow: hidden;
                        margin-bottom: 5px;
                    }
                    
                    .equipo-imagen img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    
                    .equipo-imagen-label {
                        font-size: 8px;
                        color: white;
                        background: rgba(0, 0, 0, 0.3);
                        padding: 2px 6px;
                        border-radius: 10px;
                        font-weight: 500;
                    }
                    
                    /* 🆕 ESTILO PARA CUANDO NO HAY IMAGEN */
                    .no-imagen {
                        width: 80px;
                        height: 80px;
                        background: #f8fafc;
                        border-radius: 6px;
                        border: 2px dashed #cbd5e1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #94a3b8;
                        margin-bottom: 5px;
                    }
                    
                    .no-imagen i {
                        font-size: 24px;
                    }

                    /* Contenido principal - ESTRUCTURA ORIGINAL */
                    .content {
                        padding: 20px 25px;
                        min-height: 220mm;
                    }
                    
                    .two-columns {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin-bottom: 20px;
                    }
                    
                    .section {
                        margin-bottom: 15px;
                        background: white;
                        border-radius: 6px;
                        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                        border: 1px solid #e2e8f0;
                    }
                    
                    .section-title {
                        background: #639A33 !important;
                        padding: 10px 15px;
                        font-weight: 600;
                        color: white !important;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        border-left: 4px solid #4a7a27;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .section-content {
                        padding: 15px;
                    }
                    
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 10px;
                    }
                    
                    .info-item {
                        display: flex;
                        flex-direction: column;
                        padding: 6px 0;
                        border-bottom: 1px solid #f8fafc;
                    }
                    
                    .info-item:last-child {
                        border-bottom: none;
                    }
                    
                    .label {
                        font-weight: 600;
                        color: #475569;
                        font-size: 9px;
                        margin-bottom: 2px;
                        text-transform: uppercase;
                        letter-spacing: 0.2px;
                    }
                    
                    .value {
                        font-weight: 500;
                        color: #1e293b;
                        font-size: 10px;
                        line-height: 1.2;
                    }
                    
                    /* Estados y badges */
                    .badge {
                        display: inline-block;
                        padding: 3px 8px;
                        border-radius: 12px;
                        font-size: 9px;
                        font-weight: 600;
                        text-transform: uppercase;
                    }
                    
                    .badge-inactive {
                        background: #fef2f2;
                        color: #dc2626;
                        border: 1px solid #fecaca;
                    }
                    
                    /* Footer */
                    .footer {
                        margin-top: 30px;
                        padding: 15px 25px;
                        background: #f8fafc;
                        border-top: 2px solid #639A33;
                        text-align: center;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .footer-content {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                        gap: 10px;
                        margin-bottom: 10px;
                    }
                    
                    .footer-item {
                        text-align: center;
                    }
                    
                    .footer-item .label {
                        font-size: 8px;
                        color: #64748b;
                        margin-bottom: 2px;
                    }
                    
                    .footer-item .value {
                        font-size: 9px;
                        color: #1e293b;
                        font-weight: 600;
                    }
                    
                    .copyright {
                        font-size: 8px;
                        color: #94a3b8;
                        margin-top: 10px;
                        padding-top: 10px;
                        border-top: 1px solid #e2e8f0;
                    }
                    
                    .no-break {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    
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
                        
                        .header {
                            background: #639A33 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        .section-title {
                            background: #639A33 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        .footer {
                            background: #f8fafc !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        .title-container h1,
                        .title-container .subtitle,
                        .document-info .document-number,
                        .document-info .document-date,
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
                                <h1>INFORMACIÓN DE EQUIPO INACTIVO</h1>
                                <div class="subtitle">Sistema de Gestión de Inventarios - IPS Progresando</div>
                            </div>
                            

                        </div>
                        
                        <!-- 🆕 IMAGEN DEL EQUIPO EN LA PARTE SUPERIOR DERECHA -->
                        <div class="equipo-imagen-container">
                            ${imagenEquipo ? `
                                <div class="equipo-imagen">
                                    <img src="${imagenEquipo}" alt="Imagen del equipo ${equipo.codigo_interno}" 
                                         onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'no-imagen\\'><i class=\\'fas fa-camera\\'></i></div><div class=\\'equipo-imagen-label\\'>Sin imagen</div>';" />
                                </div>
                                <div class="equipo-imagen-label">Equipo</div>
                            ` : `
                                <div class="no-imagen">
                                    <i class="fas fa-camera"></i>
                                </div>
                                <div class="equipo-imagen-label">Sin imagen</div>
                            `}
                        </div>
                    </div>
                    
                    <!-- Contenido principal -->
                    <div class="content">
                        <div class="two-columns">
                            ${contenidoBasico}
                        </div>
                        
                        ${especificacionesHTML}
                        ${seccionesExtra}
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
                            © ${new Date().getFullYear()} IPS Progresando - Sistema de Gestión de Inventarios | Documento generado automáticamente
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

                    document.addEventListener('DOMContentLoaded', function() {
                        const greenElements = document.querySelectorAll('.header, .section-title');
                        greenElements.forEach(el => {
                            el.style.backgroundColor = '#639A33';
                            el.style.color = 'white';
                        });
                        
                        const whiteTexts = document.querySelectorAll('.title-container h1, .title-container .subtitle, .document-info .document-number, .document-info .document-date');
                        whiteTexts.forEach(el => {
                            el.style.color = 'white';
                        });
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