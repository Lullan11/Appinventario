// src/js/suspendidos.js - SISTEMA DE EQUIPOS SUSPENDIDOS (VERSIÓN CON INACTIVACIÓN)

const API_BASE = "https://inventario-api-gw73.onrender.com";
const API_EQUIPOS_SUSPENDIDOS = `${API_BASE}/equipos/suspendidos`;
const API_REINTEGRAR = `${API_BASE}/equipos`;

// Variables globales
let equiposSuspendidos = [];
let equiposFiltrados = [];
let sedesDisponibles = [];

// Variables de paginación
const ITEMS_POR_PAGINA = 10;
let paginaActual = 1;
let totalPaginas = 1;

// Elementos DOM
let elementosDOM = {};

// ========================= INICIALIZACIÓN =========================

document.addEventListener("DOMContentLoaded", async () => {
    try {
        console.log("🚀 Inicializando módulo de equipos suspendidos...");

        // Inicializar elementos DOM
        inicializarElementosDOM();

        // Mostrar skeleton loading
        mostrarSkeleton(true);

        // Cargar sedes y equipos en paralelo
        const [sedesRes, equiposRes] = await Promise.all([
            fetch(`${API_BASE}/sedes`),
            fetch(API_EQUIPOS_SUSPENDIDOS)
        ]);

        if (!sedesRes.ok) throw new Error("Error al obtener sedes");
        if (!equiposRes.ok) {
            const errorText = await equiposRes.text();
            console.error("Error API:", errorText);
            throw new Error("Error al obtener equipos suspendidos");
        }

        sedesDisponibles = await sedesRes.json();
        equiposSuspendidos = await equiposRes.json();
        equiposFiltrados = [...equiposSuspendidos];

        console.log(`📊 Equipos suspendidos recibidos: ${equiposSuspendidos.length}`);

        // Actualizar estadísticas
        actualizarEstadisticas();

        // Cargar sedes en el filtro
        cargarSedesEnFiltro();

        // Configurar eventos
        configurarEventos();

        // Ocultar skeleton y renderizar
        mostrarSkeleton(false);
        renderizarTabla();
        actualizarContador();

        console.log(`✅ Carga completada: ${equiposSuspendidos.length} equipos suspendidos cargados`);

    } catch (err) {
        console.error("❌ Error cargando datos:", err);
        mostrarSkeleton(false);
        mostrarError("Error al cargar los equipos suspendidos: " + err.message);
    }
});

// ========================= FUNCIONES DE INICIALIZACIÓN =========================

function inicializarElementosDOM() {
    elementosDOM = {
        // Tabla y contenedores
        tabla: document.getElementById('tablaSuspendidos'),
        mensajeVacio: document.getElementById('mensaje-vacio'),
        skeleton: document.getElementById('skeleton-container'),
        loading: document.getElementById('loading-suspendidos'),

        // Filtros
        filtroCodigo: document.getElementById('filtro-codigo'),
        filtroNombre: document.getElementById('filtro-nombre'),
        filtroSede: document.getElementById('filtro-sede'),

        // Contadores y estadísticas
        contadorResultados: document.getElementById('contador-resultados'),
        infoPaginacion: document.getElementById('info-paginacion'),
        controlesPaginacion: document.getElementById('controles-paginacion'),

        // Estadísticas
        totalSuspendidos: document.getElementById('total-suspendidos'),
        proximosReintegrar: document.getElementById('proximos-reintegrar'),
        reintegroVencido: document.getElementById('reintegro-vencido'),

        // Modal reintegrar
        modalReintegrar: document.getElementById('modal-reintegrar'),
        formReintegrar: document.getElementById('form-reintegrar'),
        equipoIdReintegrar: document.getElementById('equipo-id-reintegrar'),

        // Modal detalles
        modalDetalles: document.getElementById('modal-detalles')
    };
}

function configurarEventos() {
    // Eventos de filtros
    if (elementosDOM.filtroCodigo) {
        elementosDOM.filtroCodigo.addEventListener('input', debounce(aplicarFiltros, 300));
    }
    if (elementosDOM.filtroNombre) {
        elementosDOM.filtroNombre.addEventListener('input', debounce(aplicarFiltros, 300));
    }
    if (elementosDOM.filtroSede) {
        elementosDOM.filtroSede.addEventListener('change', aplicarFiltros);
    }

    // Evento del formulario de reintegro
    if (elementosDOM.formReintegrar) {
        elementosDOM.formReintegrar.addEventListener('submit', reintegrarEquipo);
    }

    // Configurar fecha de reintegro real por defecto (hoy)
    const fechaReintegro = document.getElementById('fecha-reintegro-real');
    if (fechaReintegro) {
        fechaReintegro.valueAsDate = new Date();
    }
}

function cargarSedesEnFiltro() {
    const select = elementosDOM.filtroSede;
    if (!select) return;

    select.innerHTML = '<option value="">Todas las sedes</option>';

    sedesDisponibles.forEach(sede => {
        const option = document.createElement('option');
        option.value = sede.nombre;
        option.textContent = sede.nombre;
        select.appendChild(option);
    });
}

// ========================= FUNCIONES DE RENDERIZADO =========================

function renderizarTabla() {
    const tbody = elementosDOM.tabla;

    if (!tbody) return;

    // Verificar si hay equipos
    if (equiposFiltrados.length === 0) {
        tbody.innerHTML = '';
        if (elementosDOM.mensajeVacio) {
            elementosDOM.mensajeVacio.classList.remove('hidden');
        }
        actualizarControlesPaginacion();
        return;
    }

    if (elementosDOM.mensajeVacio) {
        elementosDOM.mensajeVacio.classList.add('hidden');
    }

    // Calcular índices para la página actual
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    const equiposPagina = equiposFiltrados.slice(inicio, fin);

    // Limpiar tabla
    tbody.innerHTML = '';

    // Renderizar cada equipo
    equiposPagina.forEach(equipo => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors';
        tr.innerHTML = crearFilaEquipo(equipo);
        tbody.appendChild(tr);
    });

    // Actualizar controles de paginación
    calcularPaginacion();
    actualizarControlesPaginacion();
    actualizarInfoPaginacion();
}

function crearFilaEquipo(equipo) {
    // Determinar estado del reintegro
    const estadoReintegro = determinarEstadoReintegro(equipo);

    // Formatear fechas
    const fechaSuspension = formatearFecha(equipo.fecha_suspension);
    const fechaEstimada = equipo.fecha_reintegro_estimada
        ? formatearFecha(equipo.fecha_reintegro_estimada)
        : '<span class="text-gray-500 italic">Indefinido</span>';

    const diasTranscurridos = calcularDiasTranscurridos(equipo.fecha_suspension);
    const diasRestantes = equipo.fecha_reintegro_estimada
        ? calcularDiasRestantes(equipo.fecha_reintegro_estimada)
        : null;

    let claseEstado = '';
    let textoEstado = '';
    let iconoEstado = '';

    if (estadoReintegro === 'VENCIDO') {
        claseEstado = 'bg-red-100 text-red-800 border border-red-200';
        textoEstado = 'VENCIDO';
        iconoEstado = '<i class="fas fa-exclamation-triangle mr-1"></i>';
    } else if (estadoReintegro === 'PRÓXIMO') {
        claseEstado = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
        textoEstado = `PRÓXIMO (${diasRestantes} días)`;
        iconoEstado = '<i class="fas fa-clock mr-1"></i>';
    } else if (estadoReintegro === 'EN_PLAZO') {
        claseEstado = 'bg-green-100 text-green-800 border border-green-200';
        textoEstado = 'EN PLAZO';
        iconoEstado = '<i class="fas fa-check-circle mr-1"></i>';
    } else if (estadoReintegro === 'INDEFINIDO') {
        claseEstado = 'bg-purple-100 text-purple-800 border border-purple-200';
        textoEstado = 'INDEFINIDO';
        iconoEstado = '<i class="fas fa-infinity mr-1"></i>';
    } else {
        claseEstado = 'bg-gray-100 text-gray-800 border border-gray-200';
        textoEstado = 'SIN FECHA';
        iconoEstado = '<i class="fas fa-question-circle mr-1"></i>';
    }
    
    // Información de ubicación
    let ubicacionInfo = '';
    if (equipo.ubicacion === 'puesto') {
        ubicacionInfo = `
            <div class="text-sm">
                <div class="font-medium">💼 Puesto: ${equipo.puesto_codigo || '-'}</div>
                <div class="text-gray-600">${equipo.area_nombre || '-'}</div>
            </div>
        `;
    } else {
        ubicacionInfo = `
            <div class="text-sm">
                <div class="font-medium">🏢 Área: ${equipo.area_nombre || '-'}</div>
            </div>
        `;
    }

    // Información de fechas
    const fechasInfo = `
        <div class="text-sm">
            <div class="font-medium">📅 Suspendido: ${fechaSuspension}</div>
            <div class="text-gray-600">⏳ Estimado: ${fechaEstimada}</div>
            <div class="text-xs text-gray-500">(${diasTranscurridos} días transcurridos)</div>
        </div>
    `;

    // Motivo truncado si es muy largo
    const motivoTruncado = equipo.motivo && equipo.motivo.length > 30
        ? equipo.motivo.substring(0, 30) + '...'
        : equipo.motivo || 'Sin especificar';

    return `
        <td class="px-4 py-3">
            <div class="font-mono text-sm font-semibold text-[#0F172A]">
                ${equipo.codigo_interno || '-'}
            </div>
        </td>
        <td class="px-4 py-3">
            <div class="font-medium">${equipo.nombre || '-'}</div>
            <div class="text-xs text-gray-500">${equipo.tipo_equipo_nombre || ''}</div>
        </td>
        <td class="px-4 py-3">
            ${ubicacionInfo}
            <div class="text-xs text-gray-500">📍 ${equipo.sede_nombre || ''}</div>
        </td>
        <td class="px-4 py-3">
            <div class="text-sm">${motivoTruncado}</div>
            <button onclick="mostrarDetalles(${equipo.id})" 
                    class="text-xs text-[#639A33] hover:text-[#4a7a26] mt-1">
                <i class="fas fa-eye mr-1"></i> Ver detalles
            </button>
        </td>
        <td class="px-4 py-3">
            ${fechasInfo}
        </td>
        <td class="px-4 py-3">
            <div class="${claseEstado} px-3 py-1 rounded-full text-xs font-medium flex items-center w-fit">
                ${iconoEstado}
                ${textoEstado}
            </div>
        </td>
        <td class="px-4 py-3">
            <div class="flex gap-2">
                <button onclick="mostrarModalReintegrar(${equipo.id})"
                        class="px-3 py-1 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] text-sm flex items-center gap-1">
                    <i class="fas fa-play mr-1"></i> Reintegrar
                </button>
                <button onclick="mostrarDetalles(${equipo.id})"
                        class="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1">
                    <i class="fas fa-info-circle mr-1"></i> Info
                </button>
                <button onclick="window.location.href='editarEquipo.html?id=${equipo.id}'"
                    class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm flex items-center gap-1">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <!-- BOTÓN DE INACTIVAR CON CONFIRMACIÓN (ESTILO EQUIPOS.JS) -->
                <div id="delete-controls-suspendido-${equipo.id}">
                    <button onclick="mostrarConfirmacionSuspendido(${equipo.id})"
                        class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm flex items-center gap-1">
                        <i class="fas fa-ban"></i> Inactivar
                    </button>
                </div>
            </div>
        </td>
    `;
}

// ========================= FUNCIONES DE CONFIRMACIÓN PARA INACTIVAR (ESTILO EQUIPOS.JS) =========================

function mostrarConfirmacionSuspendido(id) {
    const container = document.getElementById(`delete-controls-suspendido-${id}`);
    if (!container) return;
    
    container.innerHTML = `
        <div class="flex gap-1">
            <button onclick="inactivarEquipoSuspendidoConfirmado(${id})" 
                    class="bg-red-700 text-white px-2 py-1 rounded text-sm">
                Sí
            </button>
            <button onclick="cancelarInactivacionSuspendido(${id})" 
                    class="bg-gray-400 text-white px-2 py-1 rounded text-sm">
                No
            </button>
        </div>
    `;
}

function cancelarInactivacionSuspendido(id) {
    const container = document.getElementById(`delete-controls-suspendido-${id}`);
    if (!container) return;
    
    container.innerHTML = `
        <button onclick="mostrarConfirmacionSuspendido(${id})"
            class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm flex items-center gap-1">
            <i class="fas fa-ban"></i> Inactivar
        </button>
    `;
}

async function inactivarEquipoSuspendidoConfirmado(id) {
    mostrarLoading(true);
    
    try {
        // Buscar el equipo
        const equipo = equiposFiltrados.find(e => e.id == id);
        if (!equipo) throw new Error('Equipo no encontrado');
        
        // Mostrar modal de inactivación
        await mostrarModalInactivar(id);
        
    } catch (err) {
        console.error('Error al preparar inactivación:', err);
        mostrarError('Error: ' + err.message);
    } finally {
        mostrarLoading(false);
    }
}

// ========================= FUNCIONES DE FILTRADO =========================

function aplicarFiltros() {
    const filtroCodigo = elementosDOM.filtroCodigo?.value?.toLowerCase().trim() || '';
    const filtroNombre = elementosDOM.filtroNombre?.value?.toLowerCase().trim() || '';
    const filtroSede = elementosDOM.filtroSede?.value || '';

    equiposFiltrados = equiposSuspendidos.filter(equipo => {
        // Filtrar por código
        if (filtroCodigo && !equipo.codigo_interno?.toLowerCase().includes(filtroCodigo)) {
            return false;
        }

        // Filtrar por nombre
        if (filtroNombre && !equipo.nombre?.toLowerCase().includes(filtroNombre)) {
            return false;
        }

        // Filtrar por sede
        if (filtroSede && equipo.sede_nombre !== filtroSede) {
            return false;
        }

        return true;
    });

    // Reiniciar paginación
    paginaActual = 1;

    // Actualizar estadísticas con los filtros aplicados
    actualizarEstadisticasFiltradas();

    // Renderizar
    renderizarTabla();
    actualizarContador();
}

function limpiarFiltros() {
    if (elementosDOM.filtroCodigo) elementosDOM.filtroCodigo.value = '';
    if (elementosDOM.filtroNombre) elementosDOM.filtroNombre.value = '';
    if (elementosDOM.filtroSede) elementosDOM.filtroSede.value = '';

    equiposFiltrados = [...equiposSuspendidos];
    paginaActual = 1;

    actualizarEstadisticas();
    renderizarTabla();
    actualizarContador();
}

// ========================= FUNCIONES DE ESTADÍSTICAS =========================

function actualizarEstadisticas() {
    if (elementosDOM.totalSuspendidos) {
        elementosDOM.totalSuspendidos.textContent = equiposSuspendidos.length;
    }

    // Calcular equipos próximos a reintegrar (menos de 7 días)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const equiposProximos = equiposSuspendidos.filter(equipo => {
        if (!equipo.fecha_reintegro_estimada) return false;
        const fechaEstimada = new Date(equipo.fecha_reintegro_estimada);
        fechaEstimada.setHours(0, 0, 0, 0);
        const diasRestantes = Math.ceil((fechaEstimada - hoy) / (1000 * 60 * 60 * 24));
        return diasRestantes <= 7 && diasRestantes > 0;
    });

    if (elementosDOM.proximosReintegrar) {
        elementosDOM.proximosReintegrar.textContent = equiposProximos.length;
    }

    // Calcular equipos con reintegro vencido
    const equiposVencidos = equiposSuspendidos.filter(equipo => {
        if (!equipo.fecha_reintegro_estimada) return false;
        const fechaEstimada = new Date(equipo.fecha_reintegro_estimada);
        fechaEstimada.setHours(0, 0, 0, 0);
        return fechaEstimada < hoy;
    });

    if (elementosDOM.reintegroVencido) {
        elementosDOM.reintegroVencido.textContent = equiposVencidos.length;
    }
}

function actualizarEstadisticasFiltradas() {
    if (elementosDOM.totalSuspendidos) {
        elementosDOM.totalSuspendidos.textContent = equiposFiltrados.length;
    }

    // Calcular equipos próximos a reintegrar (filtrados)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const equiposProximos = equiposFiltrados.filter(equipo => {
        if (!equipo.fecha_reintegro_estimada) return false;
        const fechaEstimada = new Date(equipo.fecha_reintegro_estimada);
        fechaEstimada.setHours(0, 0, 0, 0);
        const diasRestantes = Math.ceil((fechaEstimada - hoy) / (1000 * 60 * 60 * 24));
        return diasRestantes <= 7 && diasRestantes > 0;
    });

    if (elementosDOM.proximosReintegrar) {
        elementosDOM.proximosReintegrar.textContent = equiposProximos.length;
    }

    // Calcular equipos con reintegro vencido (filtrados)
    const equiposVencidos = equiposFiltrados.filter(equipo => {
        if (!equipo.fecha_reintegro_estimada) return false;
        const fechaEstimada = new Date(equipo.fecha_reintegro_estimada);
        fechaEstimada.setHours(0, 0, 0, 0);
        return fechaEstimada < hoy;
    });

    if (elementosDOM.reintegroVencido) {
        elementosDOM.reintegroVencido.textContent = equiposVencidos.length;
    }
}

// ========================= FUNCIONES DE PAGINACIÓN =========================

function calcularPaginacion() {
    totalPaginas = Math.ceil(equiposFiltrados.length / ITEMS_POR_PAGINA);
    if (totalPaginas === 0) totalPaginas = 1;

    if (paginaActual > totalPaginas) {
        paginaActual = totalPaginas;
    }
}

function actualizarControlesPaginacion() {
    const container = elementosDOM.controlesPaginacion;
    if (!container) return;

    container.innerHTML = '';

    // Botón anterior
    const btnAnterior = document.createElement('button');
    btnAnterior.innerHTML = '<i class="fas fa-chevron-left"></i>';
    btnAnterior.className = `px-3 py-1 rounded-lg ${paginaActual === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
    btnAnterior.disabled = paginaActual === 1;
    btnAnterior.addEventListener('click', () => cambiarPagina(paginaActual - 1));
    container.appendChild(btnAnterior);

    // Números de página
    const maxNumeros = 5;
    let inicio = Math.max(1, paginaActual - Math.floor(maxNumeros / 2));
    let fin = Math.min(totalPaginas, inicio + maxNumeros - 1);

    if (fin - inicio + 1 < maxNumeros) {
        inicio = Math.max(1, fin - maxNumeros + 1);
    }

    if (inicio > 1) {
        const btnPrimera = document.createElement('button');
        btnPrimera.textContent = '1';
        btnPrimera.className = 'px-3 py-1 rounded-lg hover:bg-gray-200';
        btnPrimera.addEventListener('click', () => cambiarPagina(1));
        container.appendChild(btnPrimera);

        if (inicio > 2) {
            const puntos = document.createElement('span');
            puntos.textContent = '...';
            puntos.className = 'px-2 py-1';
            container.appendChild(puntos);
        }
    }

    for (let i = inicio; i <= fin; i++) {
        const btnPagina = document.createElement('button');
        btnPagina.textContent = i;
        btnPagina.className = `px-3 py-1 rounded-lg ${i === paginaActual ? 'bg-[#639A33] text-white' : 'hover:bg-gray-200'}`;
        btnPagina.addEventListener('click', () => cambiarPagina(i));
        container.appendChild(btnPagina);
    }

    if (fin < totalPaginas) {
        if (fin < totalPaginas - 1) {
            const puntos = document.createElement('span');
            puntos.textContent = '...';
            puntos.className = 'px-2 py-1';
            container.appendChild(puntos);
        }

        const btnUltima = document.createElement('button');
        btnUltima.textContent = totalPaginas;
        btnUltima.className = 'px-3 py-1 rounded-lg hover:bg-gray-200';
        btnUltima.addEventListener('click', () => cambiarPagina(totalPaginas));
        container.appendChild(btnUltima);
    }

    // Botón siguiente
    const btnSiguiente = document.createElement('button');
    btnSiguiente.innerHTML = '<i class="fas fa-chevron-right"></i>';
    btnSiguiente.className = `px-3 py-1 rounded-lg ${paginaActual === totalPaginas ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
    btnSiguiente.disabled = paginaActual === totalPaginas;
    btnSiguiente.addEventListener('click', () => cambiarPagina(paginaActual + 1));
    container.appendChild(btnSiguiente);
}

function cambiarPagina(nuevaPagina) {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;

    paginaActual = nuevaPagina;
    renderizarTabla();

    // Scroll suave hacia arriba de la tabla
    const tabla = elementosDOM.tabla;
    if (tabla) {
        tabla.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function actualizarInfoPaginacion() {
    const info = elementosDOM.infoPaginacion;
    if (!info) return;

    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA + 1;
    const fin = Math.min(paginaActual * ITEMS_POR_PAGINA, equiposFiltrados.length);
    const total = equiposFiltrados.length;

    info.textContent = `Mostrando ${inicio}-${fin} de ${total} equipos`;
}

function actualizarContador() {
    const contador = elementosDOM.contadorResultados;
    if (contador) {
        contador.textContent = equiposFiltrados.length;
    }
}

// ========================= FUNCIONES DE MODALES =========================

async function mostrarModalReintegrar(id) {
    try {
        mostrarLoading(true);

        // Buscar el equipo en los datos ya cargados
        const equipo = equiposFiltrados.find(e => e.id == id);

        if (!equipo) {
            throw new Error('Equipo no encontrado');
        }

        // Configurar información en el modal
        if (elementosDOM.equipoIdReintegrar) {
            elementosDOM.equipoIdReintegrar.value = id;
        }

        // Información del equipo
        const infoEquipo = document.getElementById('info-equipo-reintegrar');
        if (infoEquipo) {
            infoEquipo.innerHTML = `
                <p><strong>Nombre:</strong> ${equipo.nombre || '-'}</p>
                <p><strong>Código:</strong> ${equipo.codigo_interno || '-'}</p>
                <p><strong>Ubicación:</strong> ${equipo.ubicacion === 'puesto'
                    ? `Puesto: ${equipo.puesto_codigo || '-'}`
                    : `Área: ${equipo.area_nombre || '-'}`}</p>
                <p><strong>Responsable:</strong> ${equipo.responsable_nombre || '-'}</p>
                <p><strong>Sede:</strong> ${equipo.sede_nombre || '-'}</p>
            `;
        }

        // Información de suspensión
        const motivoOriginal = document.getElementById('motivo-original');
        if (motivoOriginal) motivoOriginal.textContent = equipo.motivo || 'No especificado';

        const fechaSuspension = document.getElementById('fecha-suspension-original');
        if (fechaSuspension) fechaSuspension.textContent = formatearFecha(equipo.fecha_suspension);

        const fechaEstimada = document.getElementById('fecha-estimada-reintegro');
        if (fechaEstimada) fechaEstimada.textContent = formatearFecha(equipo.fecha_reintegro_estimada);

        // Configurar fecha de reintegro real (por defecto hoy)
        const fechaReintegro = document.getElementById('fecha-reintegro-real');
        if (fechaReintegro) {
            fechaReintegro.valueAsDate = new Date();
        }

        // Mostrar modal
        if (elementosDOM.modalReintegrar) {
            elementosDOM.modalReintegrar.classList.remove('hidden');
        }

        mostrarLoading(false);

    } catch (err) {
        console.error('Error al cargar datos para reintegrar:', err);
        mostrarLoading(false);
        mostrarError('Error al cargar datos del equipo: ' + err.message);
    }
}

async function mostrarDetalles(id) {
    try {
        mostrarLoading(true);

        // Buscar el equipo
        const equipo = equiposFiltrados.find(e => e.id == id);

        if (!equipo) {
            throw new Error('Equipo no encontrado');
        }

        // Información del equipo
        const detallesInfo = document.getElementById('detalles-equipo-info');
        if (detallesInfo) {
            detallesInfo.innerHTML = `
                <p><strong>Nombre:</strong> ${equipo.nombre || '-'}</p>
                <p><strong>Código:</strong> ${equipo.codigo_interno || '-'}</p>
                <p><strong>Tipo:</strong> ${equipo.tipo_equipo_nombre || '-'}</p>
                <p><strong>Ubicación:</strong> ${equipo.ubicacion === 'puesto'
                    ? `Puesto: ${equipo.puesto_codigo || '-'}`
                    : `Área: ${equipo.area_nombre || '-'}`}</p>
                <p><strong>Sede:</strong> ${equipo.sede_nombre || '-'}</p>
                <p><strong>Responsable:</strong> ${equipo.responsable_nombre || '-'}</p>
            `;
        }

        // Información de suspensión
        const motivo = document.getElementById('detalles-motivo');
        if (motivo) motivo.textContent = equipo.motivo || 'No especificado';

        const observaciones = document.getElementById('detalles-observaciones');
        if (observaciones) observaciones.textContent = equipo.observaciones || 'Sin observaciones';

        const realizadoPor = document.getElementById('detalles-realizado-por');
        if (realizadoPor) realizadoPor.textContent = equipo.realizado_por || 'No especificado';

        const fechaSuspension = document.getElementById('detalles-fecha-suspension');
        if (fechaSuspension) fechaSuspension.textContent = formatearFecha(equipo.fecha_suspension);

        const fechaEstimada = document.getElementById('detalles-fecha-estimada');
        if (fechaEstimada) fechaEstimada.textContent = formatearFecha(equipo.fecha_reintegro_estimada);

        // Calcular días transcurridos
        const diasTranscurridos = calcularDiasTranscurridos(equipo.fecha_suspension);
        const diasElement = document.getElementById('detalles-dias-transcurridos');
        if (diasElement) diasElement.textContent = `${diasTranscurridos} días`;

        // Configurar botón de reintegrar desde detalles
        const btnReintegrar = document.getElementById('btn-reintegrar-desde-detalles');
        if (btnReintegrar) {
            btnReintegrar.onclick = () => {
                cerrarModalDetalles();
                setTimeout(() => mostrarModalReintegrar(id), 300);
            };
        }

        // Configurar botón de inactivar desde detalles
        const btnInactivarDetalles = document.getElementById('btn-inactivar-desde-detalles');
        if (btnInactivarDetalles) {
            btnInactivarDetalles.onclick = () => {
                cerrarModalDetalles();
                setTimeout(() => inactivarEquipoSuspendidoConfirmado(id), 300);
            };
        }

        // Mostrar modal
        if (elementosDOM.modalDetalles) {
            elementosDOM.modalDetalles.classList.remove('hidden');
        }

        mostrarLoading(false);

    } catch (err) {
        console.error('Error al cargar detalles:', err);
        mostrarLoading(false);
        mostrarError('Error al cargar detalles del equipo: ' + err.message);
    }
}

async function reintegrarEquipo(e) {
    e.preventDefault();

    const id = elementosDOM.equipoIdReintegrar?.value;
    const observaciones = document.getElementById('observaciones-reintegro')?.value.trim() || '';
    const realizadoPor = document.getElementById('realizado-por-reintegro')?.value.trim() || '';
    const fechaReintegro = document.getElementById('fecha-reintegro-real')?.value;

    if (!id) {
        mostrarError('ID de equipo no válido');
        return;
    }

    // Validaciones
    if (!observaciones) {
        mostrarError('Por favor ingrese las observaciones de reintegro');
        return;
    }

    if (!realizadoPor) {
        mostrarError('Por favor ingrese el nombre de quien realiza el reintegro');
        return;
    }

    if (!fechaReintegro) {
        mostrarError('Por favor seleccione la fecha de reintegro real');
        return;
    }

    try {
        mostrarLoading(true);

        const response = await fetch(`${API_REINTEGRAR}/${id}/reintegrar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                observaciones_reintegro: observaciones,
                realizado_por_reintegro: realizadoPor,
                fecha_reintegro_real: fechaReintegro
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText };
            }
            throw new Error(errorData.error || errorData.detalle || 'Error al reintegrar equipo');
        }

        const result = await response.json();

        // Mostrar mensaje de éxito
        mostrarMensaje('✅ Equipo reintegrado correctamente');

        // Cerrar modal
        cerrarModalReintegrar();

        // Actualizar la lista
        await recargarDatos();

        mostrarLoading(false);

    } catch (err) {
        console.error('Error al reintegrar equipo:', err);
        mostrarLoading(false);
        mostrarError(`Error al reintegrar equipo: ${err.message}`);
    }
}

function cerrarModalReintegrar() {
    if (elementosDOM.modalReintegrar) {
        elementosDOM.modalReintegrar.classList.add('hidden');
    }
    if (elementosDOM.formReintegrar) {
        elementosDOM.formReintegrar.reset();
    }

    // Restablecer fecha a hoy
    const fechaReintegro = document.getElementById('fecha-reintegro-real');
    if (fechaReintegro) {
        fechaReintegro.valueAsDate = new Date();
    }
}

function cerrarModalDetalles() {
    if (elementosDOM.modalDetalles) {
        elementosDOM.modalDetalles.classList.add('hidden');
    }
}

// ========================= MODAL DE INACTIVACIÓN (EXACTO A EQUIPOS.JS) =========================

async function mostrarModalInactivar(id) {
    try {
        mostrarLoading(true);

        // Buscar el equipo en los datos ya cargados
        const equipo = equiposFiltrados.find(e => e.id == id);

        if (!equipo) {
            throw new Error('Equipo no encontrado');
        }

        // Crear modal si no existe
        if (!document.getElementById('modal-inactivar-suspendido')) {
            crearModalInactivar();
        }

        // Configurar información
        document.getElementById('equipo-id-inactivar-suspendido').value = id;
        
        // Información del equipo
        const infoEquipo = document.getElementById('info-equipo-inactivar-suspendido');
        if (infoEquipo) {
            infoEquipo.innerHTML = `
                <p><strong>Nombre:</strong> ${equipo.nombre || '-'}</p>
                <p><strong>Código:</strong> ${equipo.codigo_interno || '-'}</p>
                <p><strong>Ubicación:</strong> ${equipo.ubicacion === 'puesto' 
                    ? `Puesto: ${equipo.puesto_codigo || '-'}` 
                    : `Área: ${equipo.area_nombre || '-'}`}</p>
                <p><strong>Responsable:</strong> ${equipo.responsable_nombre || '-'}</p>
                <p><strong>Tipo:</strong> ${equipo.tipo_equipo_nombre || '-'}</p>
            `;
        }
        
        // Estado actual
        const estadoActual = document.getElementById('estado-actual-inactivar-suspendido');
        if (estadoActual) {
            const diasTranscurridos = calcularDiasTranscurridos(equipo.fecha_suspension);
            const fechaSuspension = formatearFecha(equipo.fecha_suspension);
            const fechaEstimada = formatearFecha(equipo.fecha_reintegro_estimada);
            const estadoReintegro = determinarEstadoReintegro(equipo);
            
            estadoActual.innerHTML = `
                <p><strong>Suspensión:</strong> ${fechaSuspension} (hace ${diasTranscurridos} días)</p>
                <p><strong>Reintegro estimado:</strong> ${fechaEstimada}</p>
                <p><strong>Estado reintegro:</strong> ${estadoReintegro}</p>
                <p><strong>Motivo suspensión:</strong> ${equipo.motivo || 'No especificado'}</p>
            `;
        }

        // Mostrar modal
        document.getElementById('modal-inactivar-suspendido').classList.remove('hidden');
        mostrarLoading(false);

    } catch (err) {
        console.error('Error al cargar datos para inactivar:', err);
        mostrarLoading(false);
        mostrarError('Error al cargar datos del equipo: ' + err.message);
    }
}

function crearModalInactivar() {
    // Verificar si ya existe
    if (document.getElementById('modal-inactivar-suspendido')) {
        return;
    }
    
    const modalHTML = `
        <div id="modal-inactivar-suspendido" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-md w-full max-h-90vh overflow-y-auto border-2 border-[#0F172A] p-6">
                <h2 class="text-2xl font-bold text-[#0F172A] mb-6">Inactivar Equipo Suspendido</h2>
                <form id="form-inactivar-suspendido">
                    <input type="hidden" id="equipo-id-inactivar-suspendido">
                    
                    <div class="mb-4 p-3 bg-gray-50 rounded">
                        <h3 class="font-semibold text-gray-700 mb-2">Información del Equipo</h3>
                        <div id="info-equipo-inactivar-suspendido" class="text-sm text-gray-600"></div>
                    </div>
                    
                    <div class="mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                        <h3 class="font-semibold text-yellow-700 mb-2">⚠️ Estado Actual: SUSPENDIDO</h3>
                        <div id="estado-actual-inactivar-suspendido" class="text-sm text-yellow-600"></div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Motivo de baja *</label>
                            <select id="motivo-baja-suspendido" class="w-full px-3 py-2 border border-gray-300 rounded" required>
                                <option value="">Seleccionar...</option>
                                <option value="Daño irreparable">Daño irreparable</option>
                                <option value="Obsolescencia">Obsolescencia</option>
                                <option value="Sustitución por equipo nuevo">Sustitución por equipo nuevo</option>
                                <option value="Pérdida">Pérdida</option>
                                <option value="Razones administrativas">Razones administrativas</option>
                                <option value="Fin de vida útil">Fin de vida útil</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Observaciones *</label>
                            <textarea id="observaciones-baja-suspendido" rows="3" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded" 
                                      placeholder="Describa el motivo de la baja (incluya detalles sobre por qué no se puede reintegrar)..." 
                                      required></textarea>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Realizado por *</label>
                            <input type="text" id="realizado-por-suspendido" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded" 
                                   required placeholder="Nombre de quien realiza la baja">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de baja</label>
                            <input type="date" id="fecha-baja-suspendido" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded"
                                   value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>
                    
                    <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <button type="button" onclick="cerrarModalInactivarSuspendido()" 
                                class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                            Cancelar
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center">
                            <i class="fas fa-ban mr-2"></i> Inactivar Equipo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Configurar evento del formulario
    document.getElementById('form-inactivar-suspendido').addEventListener('submit', async (e) => {
        e.preventDefault();
        await inactivarEquipoSuspendido();
    });
}

async function inactivarEquipoSuspendido() {
    const id = document.getElementById('equipo-id-inactivar-suspendido').value;
    const formData = {
        motivo: document.getElementById('motivo-baja-suspendido').value,
        observaciones: document.getElementById('observaciones-baja-suspendido').value,
        fecha_baja: document.getElementById('fecha-baja-suspendido').value,
        realizado_por: document.getElementById('realizado-por-suspendido').value.trim()
    };

    // Validaciones
    if (!formData.motivo) {
        mostrarError("❌ Complete el motivo de la baja", true);
        return;
    }
    
    if (!formData.realizado_por) {
        mostrarError("❌ Complete el nombre de quien realiza la baja", true);
        return;
    }

    try {
        mostrarLoading(true);
        
        // Agregar nota especial de que viene de suspensión
        const equipo = equiposFiltrados.find(e => e.id == id);
        const observacionesCompletas = `[EQUIPO SUSPENDIDO - NO SE PUDO REINTEGRAR]\nMotivo suspensión: ${equipo?.motivo || 'No especificado'}\n---\n${formData.observaciones}`;
        formData.observaciones = observacionesCompletas;
        
        const res = await fetch(`${API_BASE}/equipos/${id}/inactivar`, {
            method: "PUT",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(formData)
        });

        const responseText = await res.text();

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Respuesta inválida del servidor: ${responseText.substring(0, 100)}...`);
        }

        if (!res.ok) {
            throw new Error(data.error || data.detalle || `Error ${res.status}: ${res.statusText}`);
        }

        mostrarMensaje("✅ Equipo suspendido inactivado correctamente");
        cerrarModalInactivarSuspendido();
        mostrarLoading(false);
        
        // Recargar la página después de un momento
        setTimeout(() => {
            location.reload();
        }, 1500);

    } catch (err) {
        console.error("❌ Error al inactivar equipo suspendido:", err);
        mostrarLoading(false);
        mostrarError("❌ Error: " + err.message, true);
    }
}

function cerrarModalInactivarSuspendido() {
    const modal = document.getElementById('modal-inactivar-suspendido');
    if (modal) {
        modal.classList.add('hidden');
        const form = document.getElementById('form-inactivar-suspendido');
        if (form) form.reset();
    }
}

// ========================= FUNCIONES AUXILIARES =========================

function mostrarSkeleton(mostrar) {
    if (elementosDOM.skeleton) {
        if (mostrar) {
            elementosDOM.skeleton.classList.remove('hidden');
        } else {
            elementosDOM.skeleton.classList.add('hidden');
        }
    }

    if (elementosDOM.tabla && mostrar) {
        elementosDOM.tabla.innerHTML = '';
    }

    if (elementosDOM.mensajeVacio && mostrar) {
        elementosDOM.mensajeVacio.classList.add('hidden');
    }
}

function mostrarLoading(mostrar) {
    if (elementosDOM.loading) {
        if (mostrar) {
            elementosDOM.loading.classList.remove('hidden');
        } else {
            elementosDOM.loading.classList.add('hidden');
        }
    }
}

function mostrarMensaje(texto) {
    // Crear o actualizar elemento de mensaje
    let mensaje = document.getElementById('mensaje-flotante');
    if (!mensaje) {
        mensaje = document.createElement('div');
        mensaje.id = 'mensaje-flotante';
        mensaje.className = 'fixed top-4 right-4 z-50 animate-slide-in';
        document.body.appendChild(mensaje);
    }

    mensaje.innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
            <div class="flex items-center gap-3">
                <div class="bg-green-100 p-2 rounded-md">
                    <i class="fas fa-check text-green-600"></i>
                </div>
                <div>
                    <p class="font-medium text-green-800">${texto}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="ml-4 text-green-400 hover:text-green-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;

    // Auto-remover después de 3 segundos
    setTimeout(() => {
        if (mensaje && mensaje.parentNode) {
            mensaje.remove();
        }
    }, 3000);
}

function mostrarError(texto) {
    // Crear o actualizar elemento de error
    let error = document.getElementById('error-flotante');
    if (!error) {
        error = document.createElement('div');
        error.id = 'error-flotante';
        error.className = 'fixed top-4 right-4 z-50 animate-slide-in';
        document.body.appendChild(error);
    }

    error.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <div class="flex items-center gap-3">
                <div class="bg-red-100 p-2 rounded-md">
                    <i class="fas fa-exclamation-triangle text-red-600"></i>
                </div>
                <div>
                    <p class="font-medium text-red-800">${texto}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="ml-4 text-red-400 hover:text-red-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (error && error.parentNode) {
            error.remove();
        }
    }, 5000);
}

async function recargarDatos() {
    try {
        mostrarLoading(true);

        const response = await fetch(API_EQUIPOS_SUSPENDIDOS);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al cargar equipos suspendidos: ${errorText}`);
        }

        equiposSuspendidos = await response.json();
        equiposFiltrados = [...equiposSuspendidos];

        console.log(`🔄 Datos recargados: ${equiposSuspendidos.length} equipos`);

        actualizarEstadisticas();
        renderizarTabla();
        actualizarContador();

        mostrarLoading(false);

    } catch (err) {
        console.error('Error al recargar datos:', err);
        mostrarLoading(false);
        mostrarError('Error al actualizar la lista de equipos: ' + err.message);
    }
}

// ========================= FUNCIONES DE UTILIDAD =========================

function determinarEstadoReintegro(equipo) {
    if (!equipo.fecha_reintegro_estimada) return 'INDEFINIDO';

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaEstimada = new Date(equipo.fecha_reintegro_estimada);
    fechaEstimada.setHours(0, 0, 0, 0);

    const diasRestantes = Math.ceil((fechaEstimada - hoy) / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) {
        return 'VENCIDO';
    } else if (diasRestantes <= 7) {
        return 'PRÓXIMO';
    } else {
        return 'EN_PLAZO';
    }
}

function formatearFecha(fechaString) {
    if (!fechaString) return 'No especificada';

    try {
        const fecha = new Date(fechaString);
        if (isNaN(fecha.getTime())) return 'Fecha inválida';

        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return 'Fecha inválida';
    }
}

function calcularDiasTranscurridos(fechaString) {
    if (!fechaString) return 0;

    try {
        const fecha = new Date(fechaString);
        const hoy = new Date();

        if (isNaN(fecha.getTime())) return 0;

        const diferencia = hoy - fecha;
        return Math.floor(diferencia / (1000 * 60 * 60 * 24));
    } catch (e) {
        return 0;
    }
}

function calcularDiasRestantes(fechaString) {
    if (!fechaString) return 0;

    try {
        const fechaEstimada = new Date(fechaString);
        const hoy = new Date();

        if (isNaN(fechaEstimada.getTime())) return 0;

        const diferencia = fechaEstimada - hoy;
        return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
    } catch (e) {
        return 0;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========================= Hacer funciones disponibles globalmente =========================

window.mostrarModalReintegrar = mostrarModalReintegrar;
window.cerrarModalReintegrar = cerrarModalReintegrar;
window.mostrarDetalles = mostrarDetalles;
window.cerrarModalDetalles = cerrarModalDetalles;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.recargarDatos = recargarDatos;

// NUEVAS FUNCIONES PARA INACTIVAR
window.mostrarConfirmacionSuspendido = mostrarConfirmacionSuspendido;
window.cancelarInactivacionSuspendido = cancelarInactivacionSuspendido;
window.inactivarEquipoSuspendidoConfirmado = inactivarEquipoSuspendidoConfirmado;
window.mostrarModalInactivar = mostrarModalInactivar;
window.cerrarModalInactivarSuspendido = cerrarModalInactivarSuspendido;