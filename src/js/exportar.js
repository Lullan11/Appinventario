// exportar.js - Sistema COMPLETO de exportación Excel

// Configuración API
const API_URL = "https://inventario-api-gw73.onrender.com";
const API_EQUIPOS = `${API_URL}/equipos`;
const API_SEDES = `${API_URL}/sedes`;
const API_AREAS = `${API_URL}/areas`;
const API_PUESTOS = `${API_URL}/puestos`;
const API_MANTENIMIENTOS = `${API_URL}/mantenimientos`;
const API_USUARIOS = `${API_URL}/usuarios`;
const API_TIPOS_EQUIPO = `${API_URL}/tipos-equipo`;
const API_TIPOS_MANTENIMIENTO = `${API_URL}/tipos-mantenimiento/todos`;
const API_EQUIPOS_INACTIVOS = `${API_URL}/equipos/inactivos`;

// Variables globales
let sedes = [];
let areas = [];
let tiposEquipo = [];
let tiposMantenimiento = [];
let equiposData = [];

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔄 Iniciando sistema de exportación Excel...');
    
    try {
        await cargarDatosIniciales();
        configurarEventos();
        configurarTabs();
        mostrarMensaje('✅ Sistema de exportación listo', false);
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        mostrarMensaje('❌ Error al cargar datos iniciales', true);
    }
});

// Configurar sistema de tabs
function configurarTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remover clase active de todos los botones y paneles
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.add('hidden'));
            
            // Activar el botón y panel actual
            button.classList.add('active');
            const targetPanel = document.getElementById(`tab-${targetTab}`);
            if (targetPanel) {
                targetPanel.classList.remove('hidden');
            }
            
            console.log(`📊 Cambiando a tab: ${targetTab}`);
        });
    });
}

// Cargar datos iniciales para los filtros
async function cargarDatosIniciales() {
    try {
        console.log('📥 Cargando datos para filtros...');
        
        // Cargar sedes
        const sedesResponse = await fetch(API_SEDES);
        if (sedesResponse.ok) {
            sedes = await sedesResponse.json();
            cargarFiltroSedes();
        }

        // Cargar áreas
        const areasResponse = await fetch(API_AREAS);
        if (areasResponse.ok) {
            areas = await areasResponse.json();
            cargarFiltroAreas();
        }

        // Cargar tipos de equipo
        const tiposResponse = await fetch(API_TIPOS_EQUIPO);
        if (tiposResponse.ok) {
            tiposEquipo = await tiposResponse.json();
            cargarFiltroTiposEquipo();
        }

        // Cargar tipos de mantenimiento
        const tiposMantResponse = await fetch(API_TIPOS_MANTENIMIENTO);
        if (tiposMantResponse.ok) {
            tiposMantenimiento = await tiposMantResponse.json();
            cargarFiltroTiposMantenimiento();
        }

        console.log('✅ Datos cargados:', {
            sedes: sedes.length,
            areas: areas.length,
            tiposEquipo: tiposEquipo.length,
            tiposMantenimiento: tiposMantenimiento.length
        });

    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        throw error;
    }
}

// Configurar filtros en el DOM
function cargarFiltroSedes() {
    const select = document.getElementById('filtro-sede');
    if (!select) return;

    select.innerHTML = '<option value="">Todas las sedes</option>';
    sedes.forEach(sede => {
        select.innerHTML += `<option value="${sede.id}">${sede.nombre}</option>`;
    });
}

function cargarFiltroAreas() {
    const select = document.getElementById('filtro-area');
    if (!select) return;

    select.innerHTML = '<option value="">Todas las áreas</option>';
    areas.forEach(area => {
        select.innerHTML += `<option value="${area.id}">${area.nombre} - ${area.sede_nombre}</option>`;
    });
}

function cargarFiltroTiposEquipo() {
    const select = document.getElementById('filtro-tipo');
    if (!select) return;

    select.innerHTML = '<option value="">Todos los tipos</option>';
    tiposEquipo.forEach(tipo => {
        select.innerHTML += `<option value="${tipo.id}">${tipo.nombre}</option>`;
    });
}

function cargarFiltroTiposMantenimiento() {
    const selects = [
        'filtro-tipo-mantenimiento-programado',
        'filtro-tipo-mantenimiento-historial'
    ];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Todos los tipos</option>';
            tiposMantenimiento.forEach(tipo => {
                select.innerHTML += `<option value="${tipo.id}">${tipo.nombre}</option>`;
            });
        }
    });
}

// Configurar eventos
function configurarEventos() {
    // Eventos para filtros en cascada
    const filtroSede = document.getElementById('filtro-sede');
    if (filtroSede) {
        filtroSede.addEventListener('change', actualizarFiltroAreas);
    }

    // Botones de exportación
    const btnExportarEquipos = document.getElementById('btn-exportar-equipos');
    if (btnExportarEquipos) {
        btnExportarEquipos.addEventListener('click', () => generarExcelEquipos());
    }

    const btnExportarMantenimientos = document.getElementById('btn-exportar-mantenimientos-programados');
    if (btnExportarMantenimientos) {
        btnExportarMantenimientos.addEventListener('click', () => generarExcelMantenimientosProgramados());
    }

    const btnExportarHistorial = document.getElementById('btn-exportar-historial-mantenimientos');
    if (btnExportarHistorial) {
        btnExportarHistorial.addEventListener('click', () => generarExcelHistorialMantenimientos());
    }
    
    // Botones de reportes especiales
    const btnReporteEstado = document.getElementById('btn-reporte-estado-mantenimiento');
    if (btnReporteEstado) btnReporteEstado.addEventListener('click', () => generarReporteEstadoMantenimiento());
    
    const btnReporteSede = document.getElementById('btn-reporte-mantenimientos-sede');
    if (btnReporteSede) btnReporteSede.addEventListener('click', () => generarReporteMantenimientosSede());
    
    const btnReporteEstadisticas = document.getElementById('btn-reporte-estadisticas');
    if (btnReporteEstadisticas) btnReporteEstadisticas.addEventListener('click', () => generarReporteEstadisticas());
    
    const btnReporteInactivos = document.getElementById('btn-reporte-inactivos');
    if (btnReporteInactivos) btnReporteInactivos.addEventListener('click', () => generarReporteInactivos());
    
    // Limpiar filtros
    const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');
    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
    }
    
    // Actualizar info de filtros
    const filtros = document.querySelectorAll('select, input');
    filtros.forEach(filtro => {
        filtro.addEventListener('change', actualizarInfoFiltros);
    });
}

// ========================= FUNCIONES PRINCIPALES DE EXPORTACIÓN =========================

// 1. Exportar Equipos CON CAMPOS PERSONALIZADOS
async function generarExcelEquipos() {
    const btn = document.getElementById('btn-exportar-equipos');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        btn.disabled = true;

        console.log('🎯 Iniciando exportación de equipos...');
        mostrarMensaje('🔄 Generando reporte de equipos...', false);

        const filtros = obtenerFiltrosEquipos();
        const datos = await obtenerEquiposFiltrados(filtros);
        
        if (!datos || datos.length === 0) {
            mostrarMensaje('❌ No hay equipos para exportar con los filtros seleccionados', true);
            return;
        }

        console.log(`📊 Equipos obtenidos: ${datos.length} registros`);

        // Generar Excel con múltiples hojas
        const wb = XLSX.utils.book_new();
        
        // Hoja 1: Equipos detallados CON CAMPOS PERSONALIZADOS
        const wsEquipos = generarHojaEquiposDetallados(datos);
        XLSX.utils.book_append_sheet(wb, wsEquipos, "Equipos Detallados");
        
        // Hoja 2: Resumen por estado de mantenimiento
        const wsResumen = generarHojaResumenEquipos(datos, filtros);
        XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
        
        // Hoja 3: Mantenimientos programados por equipo
        const wsMantenimientos = await generarHojaMantenimientosPorEquipo(datos);
        if (wsMantenimientos) {
            XLSX.utils.book_append_sheet(wb, wsMantenimientos, "Mantenimientos Programados");
        }

        // Exportar archivo
        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = `Equipos_IPS_${fecha}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);
        
        mostrarMensaje('✅ Reporte de equipos generado correctamente', false);
        console.log('✅ Excel de equipos generado:', nombreArchivo);

    } catch (error) {
        console.error('❌ Error generando Excel de equipos:', error);
        mostrarMensaje('❌ Error al generar reporte: ' + error.message, true);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 2. Exportar Mantenimientos Programados
async function generarExcelMantenimientosProgramados() {
    const btn = document.getElementById('btn-exportar-mantenimientos-programados');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        btn.disabled = true;

        console.log('🎯 Iniciando exportación de mantenimientos programados...');
        mostrarMensaje('🔄 Generando reporte de mantenimientos programados...', false);

        const filtros = obtenerFiltrosMantenimientosProgramados();
        const datos = await obtenerMantenimientosProgramadosFiltrados(filtros);
        
        if (!datos || datos.length === 0) {
            mostrarMensaje('❌ No hay mantenimientos programados para exportar', true);
            return;
        }

        console.log(`📊 Mantenimientos programados obtenidos: ${datos.length} registros`);

        const wb = XLSX.utils.book_new();
        
        // Hoja 1: Mantenimientos programados
        const wsMantenimientos = generarHojaMantenimientosProgramados(datos);
        XLSX.utils.book_append_sheet(wb, wsMantenimientos, "Mantenimientos Programados");
        
        // Hoja 2: Resumen por estado
        const wsResumen = generarHojaResumenMantenimientos(datos, filtros);
        XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen por Estado");

        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = `Mantenimientos_Programados_IPS_${fecha}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);
        
        mostrarMensaje('✅ Reporte de mantenimientos programados generado correctamente', false);

    } catch (error) {
        console.error('❌ Error generando Excel de mantenimientos:', error);
        mostrarMensaje('❌ Error al generar reporte: ' + error.message, true);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 3. Exportar Historial de Mantenimientos
async function generarExcelHistorialMantenimientos() {
    const btn = document.getElementById('btn-exportar-historial-mantenimientos');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        btn.disabled = true;

        console.log('🎯 Iniciando exportación de historial de mantenimientos...');
        mostrarMensaje('🔄 Generando historial de mantenimientos...', false);

        const filtros = obtenerFiltrosHistorialMantenimientos();
        const datos = await obtenerHistorialMantenimientosFiltrados(filtros);
        
        if (!datos || datos.length === 0) {
            mostrarMensaje('❌ No hay historial de mantenimientos para exportar', true);
            return;
        }

        console.log(`📊 Historial de mantenimientos obtenidos: ${datos.length} registros`);

        const wb = XLSX.utils.book_new();
        
        // Hoja 1: Historial completo
        const wsHistorial = generarHojaHistorialMantenimientos(datos);
        XLSX.utils.book_append_sheet(wb, wsHistorial, "Historial Completo");

        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = `Historial_Mantenimientos_IPS_${fecha}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);
        
        mostrarMensaje('✅ Historial de mantenimientos generado correctamente', false);

    } catch (error) {
        console.error('❌ Error generando historial:', error);
        mostrarMensaje('❌ Error al generar historial: ' + error.message, true);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ========================= FUNCIONES DE GENERACIÓN DE HOJAS EXCEL =========================

// Generar hoja de equipos detallados CON CAMPOS PERSONALIZADOS
function generarHojaEquiposDetallados(datos) {
    // Obtener todos los campos personalizados únicos de todos los equipos
    const todosCamposPersonalizados = new Set();
    datos.forEach(equipo => {
        if (equipo.campos_personalizados) {
            Object.keys(equipo.campos_personalizados).forEach(campo => {
                todosCamposPersonalizados.add(campo);
            });
        }
    });

    const camposPersonalizadosArray = Array.from(todosCamposPersonalizados);

    // Preparar datos para Excel
    const datosExcel = datos.map(equipo => {
        const row = {
            'Código': equipo.codigo_interno || '',
            'Nombre': equipo.nombre || '',
            'Descripción': equipo.descripcion || '',
            'Tipo de Equipo': equipo.tipo_equipo_nombre || '',
            'Estado': equipo.estado || '',
            'Sede': equipo.sede_nombre || '',
            'Área': equipo.area_nombre || '',
            'Ubicación': equipo.ubicacion || '',
            'Puesto': equipo.puesto_codigo || '',
            'Responsable': equipo.responsable_nombre || '',
            'Documento Responsable': equipo.responsable_documento || '',
            'Estado Mantenimiento': equipo.estado_mantenimiento || 'SIN_DATOS',
            'Tiene Imagen': equipo.imagen_url ? 'Sí' : 'No'
        };
        
        // Agregar campos personalizados
        camposPersonalizadosArray.forEach(campo => {
            row[campo] = equipo.campos_personalizados?.[campo] || '';
        });
        
        return row;
    });
    
    // Crear worksheet
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    
    // Ajustar anchos de columnas
    const columnWidths = [
        { wch: 15 }, // Código
        { wch: 25 }, // Nombre
        { wch: 30 }, // Descripción
        { wch: 20 }, // Tipo
        { wch: 12 }, // Estado
        { wch: 20 }, // Sede
        { wch: 20 }, // Área
        { wch: 15 }, // Ubicación
        { wch: 15 }, // Puesto
        { wch: 20 }, // Responsable
        { wch: 20 }, // Doc Responsable
        { wch: 18 }, // Estado Mant
        { wch: 12 }  // Tiene Imagen
    ];
    
    // Agregar anchos para campos personalizados
    camposPersonalizadosArray.forEach(() => {
        columnWidths.push({ wch: 20 });
    });
    
    ws['!cols'] = columnWidths;
    
    return ws;
}

// Generar hoja de resumen de equipos
function generarHojaResumenEquipos(datos, filtros) {
    // Resumen por sede
    const resumenSedes = {};
    const resumenTipos = {};
    const resumenEstados = {};
    const resumenMantenimiento = {};
    
    datos.forEach(equipo => {
        // Por sede
        const sede = equipo.sede_nombre || 'Sin Sede';
        resumenSedes[sede] = (resumenSedes[sede] || 0) + 1;
        
        // Por tipo
        const tipo = equipo.tipo_equipo_nombre || 'Sin Tipo';
        resumenTipos[tipo] = (resumenTipos[tipo] || 0) + 1;
        
        // Por estado
        const estado = equipo.estado || 'Sin Estado';
        resumenEstados[estado] = (resumenEstados[estado] || 0) + 1;
        
        // Por estado de mantenimiento
        const estadoMant = equipo.estado_mantenimiento || 'SIN_DATOS';
        resumenMantenimiento[estadoMant] = (resumenMantenimiento[estadoMant] || 0) + 1;
    });
    
    // Preparar datos para Excel
    const datosResumen = [
        // Encabezado
        ['REPORTE DE EQUIPOS - IPS PROGRESANDO'],
        ['Fecha de generación:', new Date().toLocaleDateString()],
        ['Hora de generación:', new Date().toLocaleTimeString()],
        ['Total de equipos:', datos.length],
        ['Filtros aplicados:', obtenerTextoFiltrosEquipos(filtros)],
        [],
        ['RESUMEN POR SEDE'],
        ['Sede', 'Cantidad', 'Porcentaje']
    ];
    
    // Agregar datos de sedes
    Object.entries(resumenSedes).forEach(([sede, cantidad]) => {
        const porcentaje = ((cantidad / datos.length) * 100).toFixed(1);
        datosResumen.push([sede, cantidad, `${porcentaje}%`]);
    });
    
    datosResumen.push([]);
    datosResumen.push(['RESUMEN POR TIPO DE EQUIPO']);
    datosResumen.push(['Tipo de Equipo', 'Cantidad', 'Porcentaje']);
    
    // Agregar datos de tipos
    Object.entries(resumenTipos).forEach(([tipo, cantidad]) => {
        const porcentaje = ((cantidad / datos.length) * 100).toFixed(1);
        datosResumen.push([tipo, cantidad, `${porcentaje}%`]);
    });
    
    datosResumen.push([]);
    datosResumen.push(['RESUMEN POR ESTADO']);
    datosResumen.push(['Estado', 'Cantidad', 'Porcentaje']);
    
    // Agregar datos de estados
    Object.entries(resumenEstados).forEach(([estado, cantidad]) => {
        const porcentaje = ((cantidad / datos.length) * 100).toFixed(1);
        datosResumen.push([estado, cantidad, `${porcentaje}%`]);
    });
    
    datosResumen.push([]);
    datosResumen.push(['RESUMEN POR ESTADO DE MANTENIMIENTO']);
    datosResumen.push(['Estado Mantenimiento', 'Cantidad', 'Porcentaje']);
    
    // Agregar datos de estados de mantenimiento
    Object.entries(resumenMantenimiento).forEach(([estado, cantidad]) => {
        const porcentaje = ((cantidad / datos.length) * 100).toFixed(1);
        datosResumen.push([estado, cantidad, `${porcentaje}%`]);
    });
    
    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet(datosResumen);
    
    return ws;
}

// Generar hoja de mantenimientos programados por equipo
async function generarHojaMantenimientosPorEquipo(datos) {
    try {
        const mantenimientosData = [];
        
        for (const equipo of datos) {
            if (equipo.mantenimientos_configurados && equipo.mantenimientos_configurados.length > 0) {
                equipo.mantenimientos_configurados.forEach(mant => {
                    const hoy = new Date();
                    const proxima = new Date(mant.proxima_fecha);
                    const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
                    
                    let estado = 'Al día';
                    if (diffDias <= 0) estado = 'Vencido';
                    else if (diffDias <= 10) estado = 'Próximo';
                    
                    mantenimientosData.push({
                        'Equipo': equipo.nombre || '',
                        'Código Equipo': equipo.codigo_interno || '',
                        'Sede': equipo.sede_nombre || '',
                        'Área': equipo.area_nombre || '',
                        'Tipo Mantenimiento': mant.tipo_mantenimiento_nombre || '',
                        'Nombre Personalizado': mant.nombre_personalizado || '',
                        'Próxima Fecha': mant.proxima_fecha ? new Date(mant.proxima_fecha).toLocaleDateString() : '',
                        'Días Restantes': diffDias,
                        'Estado': estado,
                        'Intervalo (días)': mant.intervalo_dias || ''
                    });
                });
            }
        }
        
        if (mantenimientosData.length === 0) return null;
        
        const ws = XLSX.utils.json_to_sheet(mantenimientosData);
        
        // Ajustar anchos de columnas
        const columnWidths = [
            { wch: 25 }, // Equipo
            { wch: 15 }, // Código Equipo
            { wch: 20 }, // Sede
            { wch: 20 }, // Área
            { wch: 20 }, // Tipo Mantenimiento
            { wch: 25 }, // Nombre Personalizado
            { wch: 15 }, // Próxima Fecha
            { wch: 15 }, // Días Restantes
            { wch: 12 }, // Estado
            { wch: 15 }  // Intervalo
        ];
        
        ws['!cols'] = columnWidths;
        
        return ws;
        
    } catch (error) {
        console.error('Error generando hoja de mantenimientos:', error);
        return null;
    }
}

// Generar hoja de mantenimientos programados
function generarHojaMantenimientosProgramados(datos) {
    const datosExcel = datos.map(mant => {
        const hoy = new Date();
        const proxima = new Date(mant.proxima_fecha);
        const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
        
        let estado = 'Al día';
        if (diffDias <= 0) estado = 'Vencido';
        else if (diffDias <= 10) estado = 'Próximo';
        
        return {
            'Equipo': mant.equipo_nombre || '',
            'Código Equipo': mant.equipo_codigo || '',
            'Sede': mant.sede_nombre || '',
            'Área': mant.area_nombre || '',
            'Tipo Mantenimiento': mant.tipo_mantenimiento_nombre || '',
            'Nombre Personalizado': mant.nombre_personalizado || '',
            'Próxima Fecha': mant.proxima_fecha ? new Date(mant.proxima_fecha).toLocaleDateString() : '',
            'Días Restantes': diffDias,
            'Estado': estado,
            'Intervalo (días)': mant.intervalo_dias || '',
            'Fecha Inicio': mant.fecha_inicio ? new Date(mant.fecha_inicio).toLocaleDateString() : ''
        };
    });
    
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    
    const columnWidths = [
        { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, 
        { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, 
        { wch: 12 }, { wch: 15 }, { wch: 15 }
    ];
    
    ws['!cols'] = columnWidths;
    return ws;
}

// Generar hoja de resumen de mantenimientos
function generarHojaResumenMantenimientos(datos, filtros) {
    const resumenEstado = {};
    const resumenTipo = {};
    const resumenSede = {};
    
    datos.forEach(mant => {
        // Por estado
        const estado = mant.Estado || 'Sin Estado';
        resumenEstado[estado] = (resumenEstado[estado] || 0) + 1;
        
        // Por tipo
        const tipo = mant['Tipo Mantenimiento'] || 'Sin Tipo';
        resumenTipo[tipo] = (resumenTipo[tipo] || 0) + 1;
        
        // Por sede
        const sede = mant.Sede || 'Sin Sede';
        resumenSede[sede] = (resumenSede[sede] || 0) + 1;
    });
    
    const datosResumen = [
        ['RESUMEN DE MANTENIMIENTOS PROGRAMADOS'],
        ['Fecha de generación:', new Date().toLocaleDateString()],
        ['Total de mantenimientos:', datos.length],
        [],
        ['RESUMEN POR ESTADO'],
        ['Estado', 'Cantidad', 'Porcentaje']
    ];
    
    Object.entries(resumenEstado).forEach(([estado, cantidad]) => {
        const porcentaje = ((cantidad / datos.length) * 100).toFixed(1);
        datosResumen.push([estado, cantidad, `${porcentaje}%`]);
    });
    
    datosResumen.push([]);
    datosResumen.push(['RESUMEN POR TIPO']);
    datosResumen.push(['Tipo de Mantenimiento', 'Cantidad', 'Porcentaje']);
    
    Object.entries(resumenTipo).forEach(([tipo, cantidad]) => {
        const porcentaje = ((cantidad / datos.length) * 100).toFixed(1);
        datosResumen.push([tipo, cantidad, `${porcentaje}%`]);
    });
    
    datosResumen.push([]);
    datosResumen.push(['RESUMEN POR SEDE']);
    datosResumen.push(['Sede', 'Cantidad', 'Porcentaje']);
    
    Object.entries(resumenSede).forEach(([sede, cantidad]) => {
        const porcentaje = ((cantidad / datos.length) * 100).toFixed(1);
        datosResumen.push([sede, cantidad, `${porcentaje}%`]);
    });
    
    return XLSX.utils.aoa_to_sheet(datosResumen);
}

// Generar hoja de historial de mantenimientos
function generarHojaHistorialMantenimientos(datos) {
    const datosExcel = datos.map(mant => {
        return {
            'Equipo': mant.equipo_nombre || '',
            'Tipo Mantenimiento': mant.tipo_mantenimiento || '',
            'Fecha Realizado': mant.fecha_realizado ? new Date(mant.fecha_realizado).toLocaleDateString() : '',
            'Fecha Programada': mant.fecha_programada ? new Date(mant.fecha_programada).toLocaleDateString() : '',
            'Descripción': mant.descripcion || '',
            'Realizado Por': mant.realizado_por || '',
            'Observaciones': mant.observaciones || '',
            'Estado': mant.estado || '',
            'Tiene Documento': mant.documento_url ? 'Sí' : 'No'
        };
    });
    
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    
    const columnWidths = [
        { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, 
        { wch: 30 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, 
        { wch: 15 }
    ];
    
    ws['!cols'] = columnWidths;
    return ws;
}

// ========================= FUNCIONES DE REPORTES ESPECIALES =========================

async function generarReporteEstadoMantenimiento() {
    try {
        mostrarMensaje('🔄 Generando reporte de estado de mantenimiento...', false);
        
        const equipos = await obtenerTodosLosEquipos();
        const wb = XLSX.utils.book_new();
        
        // Agrupar equipos por estado de mantenimiento
        const equiposPorEstado = {
            'VENCIDO': equipos.filter(e => e.estado_mantenimiento === 'VENCIDO'),
            'PRÓXIMO': equipos.filter(e => e.estado_mantenimiento === 'PRÓXIMO'),
            'OK': equipos.filter(e => e.estado_mantenimiento === 'OK'),
            'SIN_DATOS': equipos.filter(e => !e.estado_mantenimiento || e.estado_mantenimiento === 'SIN_DATOS')
        };
        
        // Crear una hoja por cada estado
        Object.entries(equiposPorEstado).forEach(([estado, equipos]) => {
            if (equipos.length > 0) {
                const ws = generarHojaEquiposDetallados(equipos);
                XLSX.utils.book_append_sheet(wb, ws, `Equipos ${estado}`);
            }
        });
        
        // Hoja de resumen general
        const wsResumen = generarHojaResumenEstadoMantenimiento(equiposPorEstado);
        XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen General");
        
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Reporte_Estado_Mantenimiento_${fecha}.xlsx`);
        
        mostrarMensaje('✅ Reporte de estado de mantenimiento generado', false);
        
    } catch (error) {
        console.error('❌ Error generando reporte especial:', error);
        mostrarMensaje('❌ Error al generar reporte especial', true);
    }
}

function generarHojaResumenEstadoMantenimiento(equiposPorEstado) {
    const datosResumen = [
        ['REPORTE DE ESTADO DE MANTENIMIENTO - IPS PROGRESANDO'],
        ['Fecha de generación:', new Date().toLocaleDateString()],
        [],
        ['RESUMEN POR ESTADO DE MANTENIMIENTO'],
        ['Estado', 'Cantidad', 'Porcentaje']
    ];
    
    const totalEquipos = Object.values(equiposPorEstado).reduce((sum, equipos) => sum + equipos.length, 0);
    
    Object.entries(equiposPorEstado).forEach(([estado, equipos]) => {
        const porcentaje = totalEquipos > 0 ? ((equipos.length / totalEquipos) * 100).toFixed(1) : '0.0';
        datosResumen.push([estado, equipos.length, `${porcentaje}%`]);
    });
    
    datosResumen.push([]);
    datosResumen.push(['TOTAL GENERAL', totalEquipos, '100%']);
    
    return XLSX.utils.aoa_to_sheet(datosResumen);
}

async function generarReporteMantenimientosSede() {
    try {
        mostrarMensaje('🔄 Generando reporte por sede...', false);
        
        const mantenimientos = await obtenerMantenimientosProgramadosCompletos();
        const wb = XLSX.utils.book_new();
        
        // Agrupar por sede
        const mantenimientosPorSede = {};
        mantenimientos.forEach(mant => {
            const sedeNombre = mant.sede_nombre || 'Sin Sede';
            if (!mantenimientosPorSede[sedeNombre]) {
                mantenimientosPorSede[sedeNombre] = [];
            }
            mantenimientosPorSede[sedeNombre].push(mant);
        });
        
        // Crear una hoja por sede
        Object.entries(mantenimientosPorSede).forEach(([sede, mantenimientos]) => {
            const ws = generarHojaMantenimientosProgramados(mantenimientos);
            // Limitar nombre de hoja a 31 caracteres (límite de Excel)
            const nombreHoja = `Sede ${sede}`.substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
        });
        
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Reporte_Mantenimientos_Sede_${fecha}.xlsx`);
        
        mostrarMensaje('✅ Reporte por sede generado', false);
        
    } catch (error) {
        console.error('❌ Error generando reporte por sede:', error);
        mostrarMensaje('❌ Error al generar reporte por sede', true);
    }
}

async function generarReporteEstadisticas() {
    try {
        mostrarMensaje('🔄 Generando reporte de estadísticas...', false);
        
        const [equipos, mantenimientos] = await Promise.all([
            obtenerTodosLosEquipos(),
            obtenerMantenimientosProgramadosCompletos()
        ]);
        
        const wb = XLSX.utils.book_new();
        
        // Hoja de estadísticas generales
        const wsEstadisticas = generarHojaEstadisticasGenerales(equipos, mantenimientos);
        XLSX.utils.book_append_sheet(wb, wsEstadisticas, "Estadísticas Generales");
        
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Reporte_Estadisticas_IPS_${fecha}.xlsx`);
        
        mostrarMensaje('✅ Reporte de estadísticas generado', false);
        
    } catch (error) {
        console.error('❌ Error generando estadísticas:', error);
        mostrarMensaje('❌ Error al generar estadísticas', true);
    }
}

function generarHojaEstadisticasGenerales(equipos, mantenimientos) {
    const totalEquipos = equipos.length;
    const equiposActivos = equipos.filter(e => e.estado === 'activo').length;
    const equiposInactivos = equipos.filter(e => e.estado === 'inactivo').length;
    const totalMantenimientos = mantenimientos.length;
    
    const mantenimientosVencidos = mantenimientos.filter(m => {
        const hoy = new Date();
        const proxima = new Date(m.proxima_fecha);
        return Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24)) <= 0;
    }).length;
    
    const mantenimientosProximos = mantenimientos.filter(m => {
        const hoy = new Date();
        const proxima = new Date(m.proxima_fecha);
        const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
        return diffDias > 0 && diffDias <= 10;
    }).length;
    
    const datosResumen = [
        ['ESTADÍSTICAS GENERALES - IPS PROGRESANDO'],
        ['Fecha de generación:', new Date().toLocaleDateString()],
        [],
        ['INFORMACIÓN GENERAL'],
        ['Total de equipos:', totalEquipos],
        ['Equipos activos:', equiposActivos],
        ['Equipos inactivos:', equiposInactivos],
        ['Total mantenimientos programados:', totalMantenimientos],
        [],
        ['ESTADO DE MANTENIMIENTOS'],
        ['Mantenimientos vencidos:', mantenimientosVencidos],
        ['Mantenimientos próximos (≤10 días):', mantenimientosProximos],
        ['Mantenimientos al día:', totalMantenimientos - mantenimientosVencidos - mantenimientosProximos],
        [],
        ['DISTRIBUCIÓN POR SEDE']
    ];
    
    // Agregar distribución por sede
    const distribucionSedes = {};
    equipos.forEach(equipo => {
        const sede = equipo.sede_nombre || 'Sin Sede';
        distribucionSedes[sede] = (distribucionSedes[sede] || 0) + 1;
    });
    
    Object.entries(distribucionSedes).forEach(([sede, cantidad]) => {
        datosResumen.push([sede, cantidad]);
    });
    
    return XLSX.utils.aoa_to_sheet(datosResumen);
}

async function generarReporteInactivos() {
    try {
        mostrarMensaje('🔄 Generando reporte de equipos inactivos...', false);
        
        const equiposInactivos = await obtenerEquiposInactivos();
        const wb = XLSX.utils.book_new();
        
        const wsInactivos = generarHojaEquiposInactivos(equiposInactivos);
        XLSX.utils.book_append_sheet(wb, wsInactivos, "Equipos Inactivos");
        
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Reporte_Equipos_Inactivos_${fecha}.xlsx`);
        
        mostrarMensaje('✅ Reporte de equipos inactivos generado', false);
        
    } catch (error) {
        console.error('❌ Error generando reporte inactivos:', error);
        mostrarMensaje('❌ Error al generar reporte inactivos', true);
    }
}

function generarHojaEquiposInactivos(datos) {
    const datosExcel = datos.map(equipo => {
        return {
            'Código': equipo.codigo_interno || '',
            'Nombre': equipo.nombre || '',
            'Descripción': equipo.descripcion || '',
            'Tipo de Equipo': equipo.tipo_equipo_nombre || '',
            'Sede': equipo.sede_nombre || '',
            'Área': equipo.area_nombre || '',
            'Ubicación': equipo.ubicacion || '',
            'Responsable': equipo.responsable_nombre || '',
            'Motivo Baja': equipo.motivo || '',
            'Observaciones Baja': equipo.observaciones || '',
            'Fecha Baja': equipo.fecha_baja ? new Date(equipo.fecha_baja).toLocaleDateString() : '',
            'Realizado Por': equipo.realizado_por || ''
        };
    });
    
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    
    const columnWidths = [
        { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, 
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, 
        { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 }
    ];
    
    ws['!cols'] = columnWidths;
    return ws;
}

// ========================= FUNCIONES AUXILIARES =========================

// Obtener filtros
function obtenerFiltrosEquipos() {
    return {
        sede: document.getElementById('filtro-sede')?.value || '',
        area: document.getElementById('filtro-area')?.value || '',
        tipo: document.getElementById('filtro-tipo')?.value || '',
        estado: document.getElementById('filtro-estado')?.value || '',
        estadoMantenimiento: document.getElementById('filtro-estado-mantenimiento')?.value || '',
        ubicacion: document.getElementById('filtro-ubicacion')?.value || '',
        conMantenimiento: document.getElementById('filtro-con-mantenimiento')?.value || ''
    };
}

function obtenerFiltrosMantenimientosProgramados() {
    return {
        estado: document.getElementById('filtro-estado-mantenimiento-programado')?.value || '',
        tipo: document.getElementById('filtro-tipo-mantenimiento-programado')?.value || '',
        diasProximos: document.getElementById('filtro-dias-proximos')?.value || ''
    };
}

function obtenerFiltrosHistorialMantenimientos() {
    return {
        fechaDesde: document.getElementById('filtro-fecha-desde')?.value || '',
        fechaHasta: document.getElementById('filtro-fecha-hasta')?.value || '',
        tipo: document.getElementById('filtro-tipo-mantenimiento-historial')?.value || '',
        realizadoPor: document.getElementById('filtro-realizado-por')?.value || ''
    };
}

// Funciones para obtener datos
async function obtenerEquiposFiltrados(filtros) {
    try {
        const response = await fetch(API_EQUIPOS);
        if (!response.ok) throw new Error('Error obteniendo equipos');
        let equipos = await response.json();
        
        // Aplicar filtros
        return equipos.filter(equipo => {
            if (filtros.sede && equipo.id_sede != filtros.sede) return false;
            if (filtros.area && equipo.id_area != filtros.area) return false;
            if (filtros.tipo && equipo.id_tipo_equipo != filtros.tipo) return false;
            if (filtros.estado && equipo.estado !== filtros.estado) return false;
            if (filtros.estadoMantenimiento && equipo.estado_mantenimiento !== filtros.estadoMantenimiento) return false;
            if (filtros.ubicacion && equipo.ubicacion !== filtros.ubicacion) return false;
            if (filtros.conMantenimiento === 'si' && (!equipo.mantenimientos_configurados || equipo.mantenimientos_configurados.length === 0)) return false;
            if (filtros.conMantenimiento === 'no' && equipo.mantenimientos_configurados && equipo.mantenimientos_configurados.length > 0) return false;
            return true;
        });
    } catch (error) {
        console.error('Error obteniendo equipos:', error);
        throw error;
    }
}

async function obtenerMantenimientosProgramadosFiltrados(filtros) {
    try {
        const equipos = await obtenerTodosLosEquipos();
        let todosMantenimientos = [];
        
        equipos.forEach(equipo => {
            if (equipo.mantenimientos_configurados) {
                equipo.mantenimientos_configurados.forEach(mant => {
                    todosMantenimientos.push({
                        ...mant,
                        equipo_nombre: equipo.nombre,
                        equipo_codigo: equipo.codigo_interno,
                        sede_nombre: equipo.sede_nombre,
                        area_nombre: equipo.area_nombre
                    });
                });
            }
        });
        
        // Aplicar filtros
        return todosMantenimientos.filter(mant => {
            if (filtros.estado) {
                const hoy = new Date();
                const proxima = new Date(mant.proxima_fecha);
                const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
                
                if (filtros.estado === 'vencido' && diffDias >= 0) return false;
                if (filtros.estado === 'proximo' && (diffDias > 10 || diffDias < 0)) return false;
                if (filtros.estado === 'al-dia' && diffDias <= 10) return false;
            }
            
            if (filtros.tipo && mant.id_tipo_mantenimiento != filtros.tipo) return false;
            
            if (filtros.diasProximos) {
                const hoy = new Date();
                const proxima = new Date(mant.proxima_fecha);
                const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
                
                if (filtros.diasProximos === 'vencidos' && diffDias >= 0) return false;
                if (filtros.diasProximos !== 'vencidos' && diffDias > parseInt(filtros.diasProximos)) return false;
            }
            
            return true;
        });
    } catch (error) {
        console.error('Error obteniendo mantenimientos:', error);
        throw error;
    }
}

async function obtenerHistorialMantenimientosFiltrados(filtros) {
    try {
        const response = await fetch(API_MANTENIMIENTOS);
        if (!response.ok) throw new Error('Error obteniendo historial');
        let historial = await response.json();
        
        // Aplicar filtros básicos (se pueden expandir)
        return historial.filter(mant => {
            if (filtros.fechaDesde && mant.fecha_realizado < filtros.fechaDesde) return false;
            if (filtros.fechaHasta && mant.fecha_realizado > filtros.fechaHasta) return false;
            if (filtros.tipo && mant.id_tipo != filtros.tipo) return false;
            if (filtros.realizadoPor && !mant.realizado_por?.toLowerCase().includes(filtros.realizadoPor.toLowerCase())) return false;
            return true;
        });
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        throw error;
    }
}

// Funciones auxiliares para obtener datos completos
async function obtenerTodosLosEquipos() {
    const response = await fetch(API_EQUIPOS);
    if (!response.ok) throw new Error('Error obteniendo equipos');
    return await response.json();
}

async function obtenerMantenimientosProgramadosCompletos() {
    const equipos = await obtenerTodosLosEquipos();
    let todosMantenimientos = [];
    
    equipos.forEach(equipo => {
        if (equipo.mantenimientos_configurados) {
            equipo.mantenimientos_configurados.forEach(mant => {
                todosMantenimientos.push({
                    ...mant,
                    equipo_nombre: equipo.nombre,
                    equipo_codigo: equipo.codigo_interno,
                    sede_nombre: equipo.sede_nombre,
                    area_nombre: equipo.area_nombre
                });
            });
        }
    });
    
    return todosMantenimientos;
}

async function obtenerEquiposInactivos() {
    const response = await fetch(API_EQUIPOS_INACTIVOS);
    if (!response.ok) throw new Error('Error obteniendo equipos inactivos');
    return await response.json();
}

// Función para mostrar mensajes
function mostrarMensaje(texto, esError = false) {
    let mensajeContainer = document.getElementById('mensaje-exportacion');
    
    if (!mensajeContainer) {
        mensajeContainer = document.createElement('div');
        mensajeContainer.id = 'mensaje-exportacion';
        mensajeContainer.className = 'fixed top-4 right-4 z-50 max-w-sm';
        document.body.appendChild(mensajeContainer);
    }
    
    const mensaje = document.createElement('div');
    mensaje.className = `p-4 rounded-lg shadow-lg border-l-4 ${
        esError 
            ? 'bg-red-50 border-red-500 text-red-700' 
            : 'bg-green-50 border-green-500 text-green-700'
    } mb-2`;
    
    mensaje.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${esError ? 'fa-exclamation-triangle' : 'fa-check-circle'} mr-2"></i>
            <span class="font-medium">${texto}</span>
        </div>
    `;
    
    mensajeContainer.appendChild(mensaje);
    
    setTimeout(() => {
        if (mensaje.parentNode) {
            mensaje.parentNode.removeChild(mensaje);
        }
    }, 5000);
}

// Funciones auxiliares para texto de filtros
function obtenerTextoFiltrosEquipos(filtros) {
    const textos = [];
    
    if (filtros.sede) {
        const sede = sedes.find(s => s.id == filtros.sede);
        if (sede) textos.push(`Sede: ${sede.nombre}`);
    }
    
    if (filtros.area) {
        const area = areas.find(a => a.id == filtros.area);
        if (area) textos.push(`Área: ${area.nombre}`);
    }
    
    if (filtros.tipo) {
        const tipo = tiposEquipo.find(t => t.id == filtros.tipo);
        if (tipo) textos.push(`Tipo: ${tipo.nombre}`);
    }
    
    if (filtros.estado) textos.push(`Estado: ${filtros.estado}`);
    if (filtros.estadoMantenimiento) textos.push(`Estado Mant: ${filtros.estadoMantenimiento}`);
    if (filtros.ubicacion) textos.push(`Ubicación: ${filtros.ubicacion}`);
    if (filtros.conMantenimiento) textos.push(`Con Mant: ${filtros.conMantenimiento}`);
    
    return textos.length > 0 ? textos.join(', ') : 'Sin filtros';
}

// Actualizar información de filtros
function actualizarInfoFiltros() {
    const tabActivo = document.querySelector('.tab-button.active');
    if (!tabActivo) return;
    
    const tabName = tabActivo.getAttribute('data-tab');
    let filtrosTexto = '';
    
    switch(tabName) {
        case 'equipos':
            const filtrosEquipos = obtenerFiltrosEquipos();
            filtrosTexto = Object.entries(filtrosEquipos)
                .filter(([_, value]) => value)
                .map(([key, value]) => {
                    if (key === 'sede' && value) {
                        const sede = sedes.find(s => s.id == value);
                        return sede ? `Sede: ${sede.nombre}` : '';
                    }
                    if (key === 'area' && value) {
                        const area = areas.find(a => a.id == value);
                        return area ? `Área: ${area.nombre}` : '';
                    }
                    if (key === 'tipo' && value) {
                        const tipo = tiposEquipo.find(t => t.id == value);
                        return tipo ? `Tipo: ${tipo.nombre}` : '';
                    }
                    return `${key}: ${value}`;
                })
                .filter(text => text)
                .join(', ');
            break;
        // Se pueden agregar casos para otros tabs
    }
    
    const infoFiltros = document.getElementById('info-filtros');
    const textoFiltros = document.getElementById('texto-filtros');
    
    if (!infoFiltros || !textoFiltros) return;
    
    if (filtrosTexto) {
        textoFiltros.textContent = filtrosTexto;
        infoFiltros.classList.remove('hidden');
    } else {
        textoFiltros.textContent = 'Ninguno';
        infoFiltros.classList.add('hidden');
    }
}

// Limpiar filtros
function limpiarFiltros() {
    const inputs = document.querySelectorAll('select, input');
    inputs.forEach(input => {
        if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        } else {
            input.value = '';
        }
    });
    actualizarInfoFiltros();
    mostrarMensaje('✅ Filtros limpiados', false);
}

// Actualizar áreas según sede
function actualizarFiltroAreas() {
    const sedeId = document.getElementById('filtro-sede').value;
    const areaSelect = document.getElementById('filtro-area');
    
    if (!areaSelect) return;

    areaSelect.innerHTML = '<option value="">Todas las áreas</option>';
    
    if (sedeId) {
        const areasFiltradas = areas.filter(area => area.id_sede == sedeId);
        areasFiltradas.forEach(area => {
            areaSelect.innerHTML += `<option value="${area.id}">${area.nombre}</option>`;
        });
    } else {
        areas.forEach(area => {
            areaSelect.innerHTML += `<option value="${area.id}">${area.nombre} - ${area.sede_nombre}</option>`;
        });
    }
}