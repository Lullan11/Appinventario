// src/js/mantenimientos.js - MÓDULO ESPECIAL PARA TÉCNICOS
// Solo permite ver equipos y agregar mantenimientos (sin editar/eliminar)

const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";
const API_TIPOS_EQUIPO = "https://inventario-api-gw73.onrender.com/tipos-equipo";
const API_MANTENIMIENTOS = "https://inventario-api-gw73.onrender.com/mantenimientos";
const API_TIPOS_MANTENIMIENTO = "https://inventario-api-gw73.onrender.com/tipos-mantenimiento/todos";

// ✅ CONFIGURACIÓN CLOUDINARY
const CLOUDINARY_CONFIG = {
    cloudName: 'dzkccjhn9',
    uploadPreset: 'inventario'
};

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}`;
const CLOUDINARY_RAW_UPLOAD = `${CLOUDINARY_UPLOAD_URL}/raw/upload`;

// Variables globales
let todosLosEquipos = [];
let equiposFiltrados = [];
let tiposEquipoDisponibles = [];
let tiposMantenimiento = [];
let mantenimientosRealizados = [];
let mantenimientosProgramados = [];

// Variables para paginación
const ITEMS_POR_PAGINA = 20;
let paginaActual = 1;
let totalPaginas = 1;
let itemsPorPagina = ITEMS_POR_PAGINA;

// Variable para controlar loading
let loadingTimeout = null;

// Variables para el equipo seleccionado
let equipoSeleccionado = null;
let mantenimientosEquipoSeleccionado = [];
let mantenimientosProgramadosEquipoSeleccionado = [];

// Elementos DOM para paginación
let elementosPaginacion = {
    contadorResultados: null,
    infoPaginacion: null,
    botonAnterior: null,
    botonSiguiente: null,
    contenedorNumeros: null,
    selectItemsPorPagina: null
};

// ========================= INICIALIZACIÓN =========================

document.addEventListener("DOMContentLoaded", async () => {
    try {
        console.log("🔧 Inicializando módulo de mantenimientos...");
        
        // 1. Inicializar elementos de paginación
        inicializarElementosPaginacion();
        
        // 2. Mostrar skeleton
        mostrarSkeletonTabla(true);
        
        // 3. Cargar datos en paralelo
        const [equiposRes, tiposRes, tiposMantRes] = await Promise.all([
            fetch(API_EQUIPOS),
            fetch(API_TIPOS_EQUIPO),
            fetch(API_TIPOS_MANTENIMIENTO)
        ]);

        if (!equiposRes.ok) throw new Error("Error al obtener equipos");
        if (!tiposRes.ok) throw new Error("Error al obtener tipos de equipo");
        if (!tiposMantRes.ok) throw new Error("Error al obtener tipos de mantenimiento");

        todosLosEquipos = await equiposRes.json();
        tiposEquipoDisponibles = await tiposRes.json();
        tiposMantenimiento = await tiposMantRes.json();
        equiposFiltrados = [...todosLosEquipos];

        // 4. Cargar mantenimientos realizados para cada equipo
        await cargarMantenimientosParaEquipos();

        // 5. Ocultar skeleton y mostrar datos
        mostrarSkeletonTabla(false);
        
        if (todosLosEquipos.length === 0) {
            document.getElementById("tablaEquipos").innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-gray-500">
                        No hay equipos registrados
                    </td>
                </tr>
            `;
        } else {
            // 6. Configurar paginación
            calcularPaginacion();
            renderizarPaginaActual();
            actualizarContador();
            actualizarControlesPaginacion();
            
            // 7. Configurar eventos y cargar filtros
            configurarEventosFiltros();
            cargarTiposEquipoEnFiltro();
            
            console.log(`✅ Carga completada: ${todosLosEquipos.length} equipos cargados`);
        }
    } catch (err) {
        console.error("❌ Error cargando datos:", err);
        mostrarSkeletonTabla(false);
        mostrarMensaje("❌ Error al cargar los datos", true);
        mostrarLoadingMantenimientos(false);
    }
});

// ========================= FUNCIONES PARA CARGAR DATOS =========================

// Función para cargar mantenimientos de cada equipo
async function cargarMantenimientosParaEquipos() {
    console.log("🔄 Cargando mantenimientos realizados...");
    
    // Crear array para almacenar mantenimientos por equipo
    mantenimientosRealizados = [];
    
    try {
        // Obtener todos los mantenimientos
        const response = await fetch(API_MANTENIMIENTOS);
        if (!response.ok) throw new Error("Error al obtener mantenimientos");
        
        const todosLosMantenimientos = await response.json();
        
        // Organizar mantenimientos por equipo
        todosLosEquipos.forEach(equipo => {
            const mantEquipo = todosLosMantenimientos.filter(m => m.id_equipo === equipo.id);
            mantenimientosRealizados.push({
                equipoId: equipo.id,
                mantenimientos: mantEquipo
            });
        });
        
        console.log(`✅ Mantenimientos cargados: ${todosLosMantenimientos.length} registros`);
    } catch (error) {
        console.error("❌ Error al cargar mantenimientos:", error);
        // Continuar sin mantenimientos
        mantenimientosRealizados = todosLosEquipos.map(equipo => ({
            equipoId: equipo.id,
            mantenimientos: []
        }));
    }
}

// Obtener mantenimientos de un equipo específico
function obtenerMantenimientosEquipo(equipoId) {
    const encontrado = mantenimientosRealizados.find(m => m.equipoId === equipoId);
    return encontrado ? encontrado.mantenimientos : [];
}

// Obtener el último mantenimiento de un equipo
function obtenerUltimoMantenimiento(equipoId) {
    const mantenimientos = obtenerMantenimientosEquipo(equipoId);
    if (mantenimientos.length === 0) return null;
    
    // Ordenar por fecha descendente y tomar el primero
    return mantenimientos.sort((a, b) => 
        new Date(b.fecha_realizado) - new Date(a.fecha_realizado)
    )[0];
}

// ✅ FUNCIÓN MEJORADA: Formatear fecha exacta (DD/MM/YYYY)
function formatearFechaExacta(fecha) {
    if (!fecha) return "Nunca";
    
    try {
        const fechaObj = new Date(fecha);
        const dia = fechaObj.getUTCDate().toString().padStart(2, '0');
        const mes = (fechaObj.getUTCMonth() + 1).toString().padStart(2, '0');
        const año = fechaObj.getUTCFullYear();
        return `${dia}/${mes}/${año}`;
    } catch (error) {
        console.error("Error formateando fecha:", error);
        return "Fecha inválida";
    }
}

// ========================= FUNCIONES DE INTERFAZ =========================

// ✅ FUNCIÓN: Mostrar loading discreto en esquina
function mostrarLoadingMantenimientos(mostrar) {
    let loadingElement = document.getElementById('mantenimientos-loading');
    
    if (mostrar) {
        // Limpiar timeout anterior si existe
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
        }
        
        // Solo mostrar después de 500ms (si la carga es rápida, no se muestra)
        loadingTimeout = setTimeout(() => {
            if (!document.getElementById('mantenimientos-loading')) {
                loadingElement = document.createElement('div');
                loadingElement.id = 'mantenimientos-loading';
                loadingElement.className = 'fixed top-4 right-4 z-50 animate-slide-in loading-mantenimientos';
                loadingElement.innerHTML = `
                    <div class="bg-white rounded-lg p-4 shadow-xl border border-gray-200">
                        <div class="flex items-center space-x-3">
                            <div class="animate-spin rounded-full h-5 w-5 border-2 border-[#639A33] border-t-transparent"></div>
                            <div>
                                <p class="text-sm font-medium text-gray-800">Procesando mantenimiento</p>
                                <p class="text-xs text-gray-600">Guardando datos...</p>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(loadingElement);
            }
        }, 500);
    } else {
        // Limpiar timeout si aún no se mostró
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
        }
        
        // Ocultar loading con animación
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            loadingElement.style.transform = 'translateY(-10px)';
            loadingElement.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                if (loadingElement && loadingElement.parentNode) {
                    loadingElement.remove();
                }
            }, 300);
        }
    }
}

// ✅ FUNCIÓN: Mostrar skeleton
function mostrarSkeletonTabla(mostrar) {
    const tbody = document.getElementById("tablaEquipos");
    
    if (!tbody) return;
    
    if (mostrar) {
        // Crear skeleton de filas
        let skeletonHTML = '';
        for (let i = 0; i < 10; i++) {
            skeletonHTML += `
                <tr class="animate-pulse">
                    <td class="px-4 py-3 border border-gray-200">
                        <div class="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td class="px-4 py-3 border border-gray-200">
                        <div class="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td class="px-4 py-3 border border-gray-200">
                        <div class="space-y-2">
                            <div class="h-3 bg-gray-200 rounded w-20"></div>
                            <div class="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                    </td>
                    <td class="px-4 py-3 border border-gray-200">
                        <div class="h-4 bg-gray-200 rounded w-28"></div>
                    </td>
                    <td class="px-4 py-3 border border-gray-200">
                        <div class="h-8 bg-gray-200 rounded"></div>
                    </td>
                    <td class="px-4 py-3 border border-gray-200">
                        <div class="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td class="px-4 py-3 border border-gray-200">
                        <div class="flex justify-center gap-2">
                            <div class="h-8 bg-gray-200 rounded w-20"></div>
                        </div>
                    </td>
                </tr>
            `;
        }
        tbody.innerHTML = skeletonHTML;
        
        // Ocultar paginación mientras carga
        const paginacion = document.querySelector('.paginacion-container');
        if (paginacion) {
            paginacion.style.opacity = '0.5';
        }
        
    } else {
        // Restaurar paginación
        const paginacion = document.querySelector('.paginacion-container');
        if (paginacion) {
            paginacion.style.opacity = '1';
        }
    }
}

// ✅ FUNCIÓN: Mostrar mensajes
function mostrarMensaje(texto, esError = false) {
    let mensaje = document.getElementById("mensaje-mantenimientos");
    if (!mensaje) {
        mensaje = document.createElement("div");
        mensaje.id = "mensaje-mantenimientos";
        mensaje.className = "fixed top-4 right-4 px-4 py-3 rounded-lg shadow-xl z-50 animate-slide-in";
        document.body.appendChild(mensaje);
    }

    const icono = esError ? '❌' : '✅';
    mensaje.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="text-xl">${icono}</div>
            <div>
                <p class="font-medium">${texto}</p>
                <div class="h-1 w-full mt-2 ${esError ? 'bg-red-500' : 'bg-green-500'} rounded-full animate-progress"></div>
            </div>
        </div>
    `;

    setTimeout(() => {
        mensaje.style.opacity = '0';
        mensaje.style.transform = 'translateX(100%)';
        mensaje.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            mensaje.remove();
        }, 300);
    }, 4000);
}

// ========================= SISTEMA DE PAGINACIÓN =========================

function inicializarElementosPaginacion() {
    elementosPaginacion = {
        contadorResultados: document.getElementById('contador-resultados'),
        infoPaginacion: document.getElementById('info-paginacion'),
        botonAnterior: document.getElementById('btn-paginacion-anterior'),
        botonSiguiente: document.getElementById('btn-paginacion-siguiente'),
        contenedorNumeros: document.getElementById('numeros-paginacion'),
        selectItemsPorPagina: document.getElementById('items-por-pagina')
    };
    
    // Configurar eventos de paginación
    if (elementosPaginacion.botonAnterior) {
        elementosPaginacion.botonAnterior.addEventListener('click', () => cambiarPagina(paginaActual - 1));
    }
    
    if (elementosPaginacion.botonSiguiente) {
        elementosPaginacion.botonSiguiente.addEventListener('click', () => cambiarPagina(paginaActual + 1));
    }
    
    if (elementosPaginacion.selectItemsPorPagina) {
        elementosPaginacion.selectItemsPorPagina.addEventListener('change', function() {
            mostrarLoadingMantenimientos(true);
            itemsPorPagina = parseInt(this.value);
            paginaActual = 1;
            calcularPaginacion();
            renderizarPaginaActual();
            actualizarControlesPaginacion();
            setTimeout(() => mostrarLoadingMantenimientos(false), 300);
        });
    }
}

function calcularPaginacion() {
    totalPaginas = Math.ceil(equiposFiltrados.length / itemsPorPagina);
    if (totalPaginas === 0) totalPaginas = 1;
    
    if (paginaActual > totalPaginas) {
        paginaActual = totalPaginas;
    }
    
    if (elementosPaginacion.infoPaginacion) {
        actualizarInfoPaginacion();
    }
}

function renderizarPaginaActual() {
    const tbody = document.getElementById("tablaEquipos");
    
    if (!tbody) return;
    
    if (equiposFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-gray-500">
                    No hay equipos que coincidan con los filtros aplicados
                </td>
            </tr>
        `;
        return;
    }
    
    // Calcular índices para la página actual
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const equiposPagina = equiposFiltrados.slice(inicio, fin);
    
    // Usar DocumentFragment para renderizado más rápido
    const fragment = document.createDocumentFragment();
    
    equiposPagina.forEach(eq => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-100 transition";
        tr.innerHTML = crearFilaEquipo(eq);
        fragment.appendChild(tr);
    });
    
    // Limpiar y renderizar de una vez
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

function crearFilaEquipo(equipo) {
    // Determinar información de ubicación completa
    let ubicacionCompleta = "";
    if (equipo.ubicacion === "puesto") {
        ubicacionCompleta = `
            <div class="text-sm">
                <div class="font-medium">💼 Puesto: ${equipo.puesto_codigo || "-"}</div>
                <div class="text-gray-600">🏢 Área: ${equipo.area_nombre || "-"}</div>
                <div class="text-gray-500">📍 Sede: ${equipo.sede_nombre || "-"}</div>
            </div>
        `;
    } else {
        ubicacionCompleta = `
            <div class="text-sm">
                <div class="font-medium">🏢 Área: ${equipo.area_nombre || "-"}</div>
                <div class="text-gray-500">📍 Sede: ${equipo.sede_nombre || "-"}</div>
            </div>
        `;
    }

    // Determinar responsable
    const responsable = equipo.ubicacion === "puesto" 
        ? (equipo.puesto_responsable || "-")
        : (equipo.responsable_nombre ? `${equipo.responsable_nombre} (${equipo.responsable_documento || "-"})` : "-");

    // Determinar estado de mantenimiento REAL (usando la función del código de equipos)
    const estadoReal = determinarEstadoMantenimientoReal(equipo);
    
    // Determinar el badge según el estado
    let estadoHTML = "";
    if (estadoReal === "VENCIDO") {
        estadoHTML = `<span class="badge-mantenimiento badge-vencido">VENCIDO</span>`;
    } else if (estadoReal === "PRÓXIMO") {
        estadoHTML = `<span class="badge-mantenimiento badge-proximo">PRÓXIMO</span>`;
    } else if (estadoReal === "OK") {
        estadoHTML = `<span class="badge-mantenimiento badge-al-dia">AL DÍA</span>`;
    } else {
        estadoHTML = `<span class="badge-mantenimiento badge-sin-datos">SIN DATOS</span>`;
    }

    // ✅ Obtener último mantenimiento con fecha exacta
    const ultimoMantenimiento = obtenerUltimoMantenimiento(equipo.id);
    const ultimaFecha = ultimoMantenimiento ? formatearFechaExacta(ultimoMantenimiento.fecha_realizado) : "Nunca";
    
    // ✅ Obtener tipo del último mantenimiento
    let ultimoTipo = "";
    if (ultimoMantenimiento) {
        const tipoMantenimiento = tiposMantenimiento.find(t => t.id === ultimoMantenimiento.id_tipo);
        ultimoTipo = tipoMantenimiento?.nombre || "Mantenimiento";
    }

    return `
        <td class="px-4 py-2 border border-[#0F172A] font-mono text-sm">${equipo.codigo_interno}</td>
        <td class="px-4 py-2 border border-[#0F172A] font-medium">${equipo.nombre}</td>
        <td class="px-4 py-2 border border-[#0F172A]">${ubicacionCompleta}</td>
        <td class="px-4 py-2 border border-[#0F172A]">
            <div class="text-sm">
                <div class="font-medium">${responsable.split(' (')[0]}</div>
                ${responsable.includes('(') ? `<div class="text-gray-600 text-xs">${responsable.split('(')[1].replace(')', '')}</div>` : ''}
            </div>
        </td>
        <td class="px-4 py-2 border border-[#0F172A] text-center">
            ${estadoHTML}
        </td>
        <td class="px-4 py-2 border border-[#0F172A] text-sm text-center">
            <div class="font-medium">${ultimaFecha}</div>
            ${ultimoTipo ? `<div class="text-xs text-gray-500">${ultimoTipo}</div>` : ''}
        </td>
        <td class="px-4 py-2 border border-[#0F172A] text-center">
            <div class="flex justify-center gap-2">
                <button onclick="mostrarDetalleEquipo(${equipo.id})"
                    class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm flex items-center gap-1">
                    <i class="fas fa-eye"></i> Ver Detalles
                </button>
            </div>
        </td>
    `;
}

function cambiarPagina(nuevaPagina) {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    
    mostrarLoadingMantenimientos(true);
    paginaActual = nuevaPagina;
    renderizarPaginaActual();
    actualizarControlesPaginacion();
    actualizarInfoPaginacion();
    
    // Scroll suave hacia la parte superior de la tabla
    const tablaContainer = document.querySelector('.overflow-x-auto');
    if (tablaContainer) {
        tablaContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    setTimeout(() => {
        mostrarLoadingMantenimientos(false);
    }, 200);
}

function actualizarControlesPaginacion() {
    // Actualizar estado de botones
    if (elementosPaginacion.botonAnterior) {
        elementosPaginacion.botonAnterior.disabled = paginaActual === 1;
        elementosPaginacion.botonAnterior.classList.toggle('opacity-50', paginaActual === 1);
        elementosPaginacion.botonAnterior.classList.toggle('cursor-not-allowed', paginaActual === 1);
    }
    
    if (elementosPaginacion.botonSiguiente) {
        elementosPaginacion.botonSiguiente.disabled = paginaActual === totalPaginas;
        elementosPaginacion.botonSiguiente.classList.toggle('opacity-50', paginaActual === totalPaginas);
        elementosPaginacion.botonSiguiente.classList.toggle('cursor-not-allowed', paginaActual === totalPaginas);
    }
    
    // Actualizar números de página
    if (elementosPaginacion.contenedorNumeros) {
        elementosPaginacion.contenedorNumeros.innerHTML = '';
        
        const maxNumerosVisibles = 5;
        let inicio = Math.max(1, paginaActual - Math.floor(maxNumerosVisibles / 2));
        let fin = Math.min(totalPaginas, inicio + maxNumerosVisibles - 1);
        
        if (fin - inicio + 1 < maxNumerosVisibles) {
            inicio = Math.max(1, fin - maxNumerosVisibles + 1);
        }
        
        // Botón primera página
        if (inicio > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.textContent = '1';
            firstBtn.className = 'px-2 py-1 text-sm hover:bg-gray-200 rounded';
            firstBtn.addEventListener('click', () => cambiarPagina(1));
            elementosPaginacion.contenedorNumeros.appendChild(firstBtn);
            
            if (inicio > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.className = 'px-2 py-1';
                elementosPaginacion.contenedorNumeros.appendChild(dots);
            }
        }
        
        // Números de página
        for (let i = inicio; i <= fin; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = `px-2 py-1 text-sm rounded ${i === paginaActual 
                ? 'bg-[#639A33] text-white font-semibold' 
                : 'hover:bg-gray-200'}`;
            pageBtn.addEventListener('click', () => cambiarPagina(i));
            elementosPaginacion.contenedorNumeros.appendChild(pageBtn);
        }
        
        // Botón última página
        if (fin < totalPaginas) {
            if (fin < totalPaginas - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.className = 'px-2 py-1';
                elementosPaginacion.contenedorNumeros.appendChild(dots);
            }
            
            const lastBtn = document.createElement('button');
            lastBtn.textContent = totalPaginas;
            lastBtn.className = 'px-2 py-1 text-sm hover:bg-gray-200 rounded';
            lastBtn.addEventListener('click', () => cambiarPagina(totalPaginas));
            elementosPaginacion.contenedorNumeros.appendChild(lastBtn);
        }
    }
}

function actualizarInfoPaginacion() {
    if (elementosPaginacion.infoPaginacion) {
        const inicio = (paginaActual - 1) * itemsPorPagina + 1;
        const fin = Math.min(paginaActual * itemsPorPagina, equiposFiltrados.length);
        elementosPaginacion.infoPaginacion.textContent = 
            `Mostrando ${inicio}-${fin} de ${equiposFiltrados.length} equipos`;
    }
}

function actualizarContador() {
    const contador = document.getElementById('contador-resultados');
    if (contador) {
        contador.textContent = equiposFiltrados.length;
    }
}

// ========================= FUNCIONES DE FILTRADO =========================

function cargarTiposEquipoEnFiltro() {
    const filtroTipo = document.getElementById('filtro-tipo');
    if (!filtroTipo) return;

    filtroTipo.innerHTML = '<option value="">Todos los tipos</option>';
    
    // Ordenar alfabéticamente
    const tiposOrdenados = [...tiposEquipoDisponibles].sort((a, b) => {
        return a.nombre.localeCompare(b.nombre);
    });
    
    tiposOrdenados.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo.nombre;
        option.textContent = tipo.nombre;
        filtroTipo.appendChild(option);
    });
}

function configurarEventosFiltros() {
    const filtrosInput = [
        'filtro-codigo', 'filtro-nombre', 'filtro-sede', 
        'filtro-area', 'filtro-responsable'
    ];
    
    filtrosInput.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', debounce(() => {
                mostrarLoadingMantenimientos(true);
                aplicarFiltros();
                setTimeout(() => mostrarLoadingMantenimientos(false), 300);
            }, 300));
        }
    });
    
    const filtrosSelect = ['filtro-ubicacion', 'filtro-estado', 'filtro-tipo'];
    filtrosSelect.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                mostrarLoadingMantenimientos(true);
                aplicarFiltros();
                setTimeout(() => mostrarLoadingMantenimientos(false), 300);
            });
        }
    });
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

function aplicarFiltros() {
    const filtroCodigo = document.getElementById('filtro-codigo').value.toLowerCase().trim();
    const filtroNombre = document.getElementById('filtro-nombre').value.toLowerCase().trim();
    const filtroUbicacion = document.getElementById('filtro-ubicacion').value;
    const filtroEstado = document.getElementById('filtro-estado').value;
    const filtroSede = document.getElementById('filtro-sede').value.toLowerCase().trim();
    const filtroArea = document.getElementById('filtro-area').value.toLowerCase().trim();
    const filtroResponsable = document.getElementById('filtro-responsable').value.toLowerCase().trim();
    const filtroTipo = document.getElementById('filtro-tipo').value;

    equiposFiltrados = todosLosEquipos.filter(equipo => {
        if (filtroCodigo && !equipo.codigo_interno.toLowerCase().includes(filtroCodigo)) {
            return false;
        }

        if (filtroNombre && !equipo.nombre.toLowerCase().includes(filtroNombre)) {
            return false;
        }

        if (filtroUbicacion && equipo.ubicacion !== filtroUbicacion) {
            return false;
        }

        if (filtroEstado) {
            const estadoReal = determinarEstadoMantenimientoReal(equipo);
            if (estadoReal !== filtroEstado) {
                return false;
            }
        }

        if (filtroSede && (!equipo.sede_nombre || !equipo.sede_nombre.toLowerCase().includes(filtroSede))) {
            return false;
        }

        if (filtroArea && (!equipo.area_nombre || !equipo.area_nombre.toLowerCase().includes(filtroArea))) {
            return false;
        }

        if (filtroResponsable) {
            const responsable = equipo.ubicacion === "puesto" 
                ? (equipo.puesto_responsable || "").toLowerCase()
                : (equipo.responsable_nombre || "").toLowerCase();
            
            if (!responsable.includes(filtroResponsable)) {
                return false;
            }
        }

        if (filtroTipo && (!equipo.tipo_equipo_nombre || equipo.tipo_equipo_nombre !== filtroTipo)) {
            return false;
        }

        return true;
    });

    paginaActual = 1;
    calcularPaginacion();
    renderizarPaginaActual();
    actualizarContador();
    actualizarControlesPaginacion();
}

function limpiarFiltros() {
    mostrarLoadingMantenimientos(true);
    
    document.getElementById('filtro-codigo').value = '';
    document.getElementById('filtro-nombre').value = '';
    document.getElementById('filtro-ubicacion').value = '';
    document.getElementById('filtro-estado').value = '';
    document.getElementById('filtro-sede').value = '';
    document.getElementById('filtro-area').value = '';
    document.getElementById('filtro-responsable').value = '';
    document.getElementById('filtro-tipo').value = '';
    
    equiposFiltrados = [...todosLosEquipos];
    
    paginaActual = 1;
    calcularPaginacion();
    renderizarPaginaActual();
    actualizarContador();
    actualizarControlesPaginacion();
    
    setTimeout(() => mostrarLoadingMantenimientos(false), 300);
}

// ========================= FUNCIÓN AUXILIAR: Determinar estado de mantenimiento =========================
function determinarEstadoMantenimientoReal(equipo) {
    if (!equipo.mantenimientos_configurados || equipo.mantenimientos_configurados.length === 0) {
        return "SIN_DATOS";
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    let estado = "OK";
    let diasMasUrgente = Infinity;

    equipo.mantenimientos_configurados.forEach(mant => {
        if (mant.proxima_fecha) {
            const proxima = new Date(mant.proxima_fecha);
            proxima.setHours(0, 0, 0, 0);
            
            const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
            
            if (diffDias < diasMasUrgente) {
                diasMasUrgente = diffDias;
            }
        }
    });

    if (diasMasUrgente < 0) {
        return "VENCIDO";
    } else if (diasMasUrgente <= 30) {
        return "PRÓXIMO";
    } else if (diasMasUrgente === Infinity) {
        return "SIN_DATOS";
    }

    return estado;
}

// ========================= NUEVAS FUNCIONES PARA VER DETALLES DEL EQUIPO =========================

// ✅ FUNCIÓN: Mostrar modal con detalles completos del equipo
async function mostrarDetalleEquipo(equipoId) {
    try {
        mostrarLoadingMantenimientos(true);
        
        // 1. Obtener datos completos del equipo
        const resEquipo = await fetch(`${API_EQUIPOS}/${equipoId}/completo`);
        if (!resEquipo.ok) throw new Error("Error al obtener datos del equipo");
        equipoSeleccionado = await resEquipo.json();
        
        // 2. Obtener mantenimientos realizados del equipo
        const resMantenimientos = await fetch(`${API_MANTENIMIENTOS}/equipo/${equipoId}`);
        if (!resMantenimientos.ok) throw new Error("Error al obtener mantenimientos");
        mantenimientosEquipoSeleccionado = await resMantenimientos.json();
        
        // 3. Obtener mantenimientos programados del equipo
        try {
            const resProgramados = await fetch(`${API_EQUIPOS}/${equipoId}/mantenimientos`);
            if (resProgramados.ok) {
                mantenimientosProgramadosEquipoSeleccionado = await resProgramados.json();
            } else {
                mantenimientosProgramadosEquipoSeleccionado = [];
            }
        } catch (error) {
            console.warn("No se pudieron cargar mantenimientos programados:", error);
            mantenimientosProgramadosEquipoSeleccionado = [];
        }
        
        // 4. Crear y mostrar el modal
        crearModalDetalleEquipo();
        
        mostrarLoadingMantenimientos(false);
        
    } catch (error) {
        console.error("❌ Error cargando detalles del equipo:", error);
        mostrarLoadingMantenimientos(false);
        mostrarMensaje("❌ Error al cargar detalles del equipo", true);
    }
}

// ✅ FUNCIÓN: Crear modal con detalles del equipo (similar al de verEquipo.js)
function crearModalDetalleEquipo() {
    // Verificar si ya existe un modal y eliminarlo
    const modalExistente = document.getElementById('modal-detalle-equipo');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    // ✅ CONTAR MANTENIMIENTOS POR TIPO
    const preventivosCount = mantenimientosEquipoSeleccionado.filter(m => {
        const tipo = tiposMantenimiento.find(t => t.id === m.id_tipo);
        return tipo?.nombre?.toLowerCase().includes('preventivo');
    }).length;

    const calibracionesCount = mantenimientosEquipoSeleccionado.filter(m => {
        const tipo = tiposMantenimiento.find(t => t.id === m.id_tipo);
        const tipoNombre = tipo?.nombre?.toLowerCase();
        return tipoNombre?.includes('calibración') || tipoNombre?.includes('calibracion');
    }).length;

    const correctivosCount = mantenimientosEquipoSeleccionado.filter(m => {
        const tipo = tiposMantenimiento.find(t => t.id === m.id_tipo);
        return tipo?.nombre?.toLowerCase().includes('correctivo');
    }).length;

    const totalMantenimientos = preventivosCount + calibracionesCount + correctivosCount;
    
    // ✅ OBTENER PRÓXIMOS MANTENIMIENTOS PROGRAMADOS
    const preventivosProgramados = mantenimientosProgramadosEquipoSeleccionado.filter(m => {
        const tipoMantenimiento = tiposMantenimiento.find(t => t.id === m.id_tipo_mantenimiento);
        return tipoMantenimiento?.nombre?.toLowerCase().includes('preventivo');
    });

    const calibracionesProgramadas = mantenimientosProgramadosEquipoSeleccionado.filter(m => {
        const tipoMantenimiento = tiposMantenimiento.find(t => t.id === m.id_tipo_mantenimiento);
        const tipoNombre = tipoMantenimiento?.nombre?.toLowerCase();
        return tipoNombre?.includes('calibración') || tipoNombre?.includes('calibracion');
    });
    
    // ✅ FUNCIÓN: Formatear fecha para los mantenimientos programados
    function formatearFechaProgramada(fecha) {
        if (!fecha) return "-";
        return formatearFechaExacta(fecha);
    }
    
    // ✅ FUNCIÓN: Obtener estado de mantenimiento
    function getEstadoMantenimiento(fechaProgramada) {
        if (!fechaProgramada) return { estado: 'sin-fecha', texto: '', clase: '' };

        const hoy = new Date();
        const fechaMantenimiento = new Date(fechaProgramada);
        const diferencia = fechaMantenimiento - hoy;
        const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

        if (dias < 0) {
            return {
                estado: 'vencido',
                texto: '<span class="text-red-600 font-bold">VENCIDO</span>',
                clase: 'bg-red-50 border-red-200'
            };
        } else if (dias <= 30) {
            return {
                estado: 'proximo',
                texto: `<span class="text-yellow-600 font-bold">PRÓXIMO (${dias} días)</span>`,
                clase: 'bg-yellow-50 border-yellow-200'
            };
        } else {
            return {
                estado: 'al-dia',
                texto: '<span class="text-green-600 font-bold">AL DÍA</span>',
                clase: 'bg-green-50 border-green-200'
            };
        }
    }
    
    // ✅ FUNCIÓN: Construir ubicación completa
    function construirUbicacionCompleta(equipo) {
        if (!equipo) return "-";

        if (equipo.ubicacion === "puesto") {
            const partes = [];
            if (equipo.puesto_codigo) partes.push(`Puesto: ${equipo.puesto_codigo}`);
            if (equipo.area_nombre) partes.push(`Área: ${equipo.area_nombre}`);
            if (equipo.sede_nombre) partes.push(`Sede: ${equipo.sede_nombre}`);
            return partes.length > 0 ? partes.join(' - ') : 'Puesto (sin detalles)';
        } else if (equipo.ubicacion === "area") {
            const partes = ['Área'];
            if (equipo.area_nombre) partes.push(equipo.area_nombre);
            if (equipo.sede_nombre) partes.push(`Sede: ${equipo.sede_nombre}`);
            return partes.length > 1 ? partes.join(' - ') : 'Área (sin detalles)';
        } else {
            return equipo.ubicacion || "-";
        }
    }
    
    // ✅ FUNCIÓN: Renderizar mantenimientos por tipo CON BOTONES DE PDF
    function renderMantenimientosPorTipo(tipo, mantenimientos) {
        const mantenimientosFiltrados = mantenimientos.filter(m => {
            const tipoMantenimiento = tiposMantenimiento.find(t => t.id === m.id_tipo);
            if (!tipoMantenimiento) return false;

            const tipoNombre = tipoMantenimiento.nombre.toLowerCase();
            const tipoBuscado = tipo.toLowerCase();

            return (tipoBuscado === 'preventivo' && tipoNombre.includes('preventivo')) ||
                (tipoBuscado === 'calibracion' && (tipoNombre.includes('calibración') || tipoNombre.includes('calibracion'))) ||
                (tipoBuscado === 'correctivo' && tipoNombre.includes('correctivo'));
        }).sort((a, b) => new Date(b.fecha_realizado) - new Date(a.fecha_realizado));

        if (mantenimientosFiltrados.length === 0) {
            return `
                <tr>
                    <td colspan="6" class="text-center py-4 text-gray-500">
                        No hay mantenimientos ${tipo === 'preventivo' ? 'preventivos' : tipo === 'calibracion' ? 'de calibración' : 'correctivos'} registrados
                    </td>
                </tr>
            `;
        }

        return mantenimientosFiltrados.map(mant => {
            const fechaRealizado = mant.fecha_realizado ? formatearFechaExacta(mant.fecha_realizado) : '-';
            const tieneDocumento = !!mant.documento_url;
            
            let nombreMantenimiento = mant.nombre_personalizado;

            if (!nombreMantenimiento) {
                if (mant.id_mantenimiento_programado) {
                    const mantenimientoProgramado = mantenimientosProgramadosEquipoSeleccionado.find(mp => mp.id === mant.id_mantenimiento_programado);
                    if (mantenimientoProgramado && mantenimientoProgramado.nombre_personalizado) {
                        nombreMantenimiento = mantenimientoProgramado.nombre_personalizado;
                    }
                }
            }

            if (!nombreMantenimiento) {
                const tipoMant = tiposMantenimiento.find(t => t.id === mant.id_tipo);
                nombreMantenimiento = tipoMant ? tipoMant.nombre : 'Mantenimiento';
            }

            const urlSegura = mant.documento_url ? mant.documento_url.replace(/'/g, "\\'") : '';
            const nombreArchivo = mant.documento_nombre || `mantenimiento_${equipoSeleccionado.codigo_interno}_${fechaRealizado.replace(/\//g, '-')}.pdf`;

            // ✅ BOTONES PARA VER Y DESCARGAR PDF (COMO EN EL CÓDIGO DE GUÍA)
            const botonesDocumento = tieneDocumento ? `
                <div class="flex gap-2 justify-center">
                    <button onclick="previsualizarPDF('${urlSegura}', '${nombreArchivo}')" 
                            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-all duration-200"
                            title="Abrir PDF en nueva pestaña">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button onclick="descargarDocumento('${urlSegura}', '${nombreArchivo}')" 
                            class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-all duration-200"
                            title="Descargar PDF">
                        <i class="fas fa-download"></i> PDF
                    </button>
                </div>
            ` : '<span class="text-gray-400 text-sm">Sin documento</span>';

            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-2 border text-center font-medium">${nombreMantenimiento}</td>
                    <td class="px-4 py-2 border text-center">${fechaRealizado}</td>
                    <td class="px-4 py-2 border text-sm">${mant.descripcion || '-'}</td>
                    <td class="px-4 py-2 border text-center">${mant.realizado_por || '-'}</td>
                    <td class="px-4 py-2 border text-sm">${mant.observaciones || '-'}</td>
                    <td class="px-4 py-2 border text-center">${botonesDocumento}</td>
                </tr>
            `;
        }).join('');
    }

    // Crear contenido del modal
    const contenidoHTML = `
        <div id="modal-detalle-equipo" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style="z-index: 1000;">
            <div class="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                <!-- Header -->
                <div class="border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-[#0F172A] text-white">
                    <div>
                        <h3 class="text-xl font-semibold">Detalles del Equipo</h3>
                        <p class="text-sm text-gray-300">${equipoSeleccionado.codigo_interno} - ${equipoSeleccionado.nombre}</p>
                    </div>
                    <button onclick="cerrarModalDetalleEquipo()" class="text-gray-300 hover:text-white text-2xl">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- Contenido CON SCROLL -->
                <div class="overflow-y-auto max-h-[80vh] p-6" style="max-height: calc(90vh - 180px);">
                    <!-- Información del equipo -->
                    <div class="mb-8">
                        <h4 class="text-lg font-semibold mb-4 text-[#0F172A]">
                            <i class="fas fa-info-circle text-blue-500 mr-2"></i>Información del Equipo
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div class="space-y-2">
                                <p><strong>Código:</strong> ${equipoSeleccionado.codigo_interno || "-"}</p>
                                <p><strong>Nombre:</strong> ${equipoSeleccionado.nombre || "-"}</p>
                                <p><strong>Descripción:</strong> ${equipoSeleccionado.descripcion || "-"}</p>
                                <p><strong>Responsable:</strong> ${equipoSeleccionado.responsable_nombre || "-"} ${equipoSeleccionado.responsable_documento ? `(${equipoSeleccionado.responsable_documento})` : ""}</p>
                                <p><strong>Ubicación:</strong> ${construirUbicacionCompleta(equipoSeleccionado)}</p>
                            </div>
                            <div class="space-y-2">
                                <p><strong>Tipo de equipo:</strong> ${equipoSeleccionado.tipo_nombre || equipoSeleccionado.tipo_equipo_nombre || "-"}</p>
                                <p><strong>Estado:</strong> <span class="${equipoSeleccionado.estado === 'activo' ? 'text-green-600' : 'text-red-600'} font-semibold">${equipoSeleccionado.estado?.toUpperCase() || "-"}</span></p>
                                ${equipoSeleccionado.imagen_url ? `
                                    <div class="mt-2">
                                        <strong>Imagen:</strong><br>
                                        <img src="${equipoSeleccionado.imagen_url}" alt="Imagen del equipo" class="w-32 h-32 object-cover rounded mt-1">
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Resumen de Mantenimientos -->
                    <div class="mb-8">
                        <h4 class="text-lg font-semibold mb-4 text-[#0F172A]">
                            <i class="fas fa-chart-bar text-green-500 mr-2"></i>Resumen de Mantenimientos
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h3 class="font-semibold text-blue-800">Preventivos Realizados</h3>
                                <p class="text-2xl font-bold text-blue-600">${preventivosCount}</p>
                            </div>
                            <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <h3 class="font-semibold text-yellow-800">Calibraciones Realizadas</h3>
                                <p class="text-2xl font-bold text-yellow-600">${calibracionesCount}</p>
                            </div>
                            <div class="bg-red-50 p-4 rounded-lg border border-red-200">
                                <h3 class="font-semibold text-red-800">Correctivos Realizados</h3>
                                <p class="text-2xl font-bold text-red-600">${correctivosCount}</p>
                            </div>
                            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h3 class="font-semibold text-green-800">Total Mantenimientos</h3>
                                <p class="text-2xl font-bold text-green-600">${totalMantenimientos}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Próximos Mantenimientos Programados -->
                    <div class="mb-8">
                        <h4 class="text-lg font-semibold mb-4 text-[#0F172A]">
                            <i class="fas fa-calendar-alt text-purple-500 mr-2"></i>Próximos Mantenimientos Programados
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="border border-blue-200 rounded p-4 bg-blue-50">
                                <h5 class="font-semibold text-blue-800 mb-3"><i class="fas fa-shield-alt mr-2"></i>Preventivos Programados</h5>
                                ${preventivosProgramados.length === 0 ? `
                                    <p class="text-gray-500">No hay preventivos programados</p>
                                ` : preventivosProgramados.map(preventivo => {
                                    const estadoInfo = getEstadoMantenimiento(preventivo.proxima_fecha);
                                    return `
                                        <div class="mb-3 p-3 rounded ${estadoInfo.clase}">
                                            <div class="flex justify-between items-start">
                                                <div>
                                                    <strong>${preventivo.nombre_personalizado || 'Preventivo'}</strong>
                                                    <div class="text-sm text-gray-600">
                                                        Próximo: ${formatearFechaProgramada(preventivo.proxima_fecha)} ${estadoInfo.texto}
                                                    </div>
                                                    ${preventivo.intervalo_dias ? `<div class="text-xs text-gray-500">Cada ${preventivo.intervalo_dias} días</div>` : ''}
                                                </div>
                                                <button 
                                                    onclick="validarMantenimientoEspecifico(${preventivo.id}, 'preventivo')"
                                                    class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">
                                                    Validar
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            <div class="border border-yellow-200 rounded p-4 bg-yellow-50">
                                <h5 class="font-semibold text-yellow-800 mb-3"><i class="fas fa-ruler-combined mr-2"></i>Calibraciones Programadas</h5>
                                ${calibracionesProgramadas.length === 0 ? `
                                    <p class="text-gray-500">No hay calibraciones programadas</p>
                                ` : calibracionesProgramadas.map(calibracion => {
                                    const estadoInfo = getEstadoMantenimiento(calibracion.proxima_fecha);
                                    return `
                                        <div class="mb-3 p-3 rounded ${estadoInfo.clase}">
                                            <div class="flex justify-between items-start">
                                                <div>
                                                    <strong>${calibracion.nombre_personalizado || 'Calibración'}</strong>
                                                    <div class="text-sm text-gray-600">
                                                        Próxima: ${formatearFechaProgramada(calibracion.proxima_fecha)} ${estadoInfo.texto}
                                                    </div>
                                                    ${calibracion.intervalo_dias ? `<div class="text-xs text-gray-500">Cada ${calibracion.intervalo_dias} días</div>` : ''}
                                                </div>
                                                <button 
                                                    onclick="validarMantenimientoEspecifico(${calibracion.id}, 'calibracion')"
                                                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                                                    Validar
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Historial de Mantenimientos -->
                    <div class="mb-8">
                        <h4 class="text-lg font-semibold mb-4 text-[#0F172A]">
                            <i class="fas fa-history text-orange-500 mr-2"></i>Historial de Mantenimientos
                        </h4>
                        
                        <!-- Tabs -->
                        <div class="mb-4">
                            <div class="flex border-b border-gray-200">
                                <button class="tab-button-detalle px-4 py-2 border-none bg-blue-50 text-blue-700 cursor-pointer rounded-t-lg mr-1 tab-active-detalle" data-tab="preventivo">
                                    <i class="fas fa-shield-alt mr-2"></i>Preventivos (${preventivosCount})
                                </button>
                                <button class="tab-button-detalle px-4 py-2 border-none bg-yellow-50 text-yellow-700 cursor-pointer rounded-t-lg mr-1" data-tab="calibracion">
                                    <i class="fas fa-ruler-combined mr-2"></i>Calibraciones (${calibracionesCount})
                                </button>
                                <button class="tab-button-detalle px-4 py-2 border-none bg-red-50 text-red-700 cursor-pointer rounded-t-lg mr-1" data-tab="correctivo">
                                    <i class="fas fa-wrench mr-2"></i>Correctivos (${correctivosCount})
                                </button>
                            </div>
                            
                            <!-- Tab de Preventivos -->
                            <div id="tab-detalle-preventivo" class="tab-content-detalle p-4 border border-gray-200 border-t-0 rounded-b-lg">
                                <div class="overflow-x-auto">
                                    <table class="min-w-full text-left border">
                                        <thead class="bg-blue-600 text-white">
                                            <tr>
                                                <th class="px-4 py-2 border text-center">Nombre</th>
                                                <th class="px-4 py-2 border text-center">Fecha Realizado</th>
                                                <th class="px-4 py-2 border text-center">Descripción</th>
                                                <th class="px-4 py-2 border text-center">Realizado por</th>
                                                <th class="px-4 py-2 border text-center">Observaciones</th>
                                                <th class="px-4 py-2 border text-center">Documento</th>
                                            </tr>
                                        </thead>
                                        <tbody id="tabla-detalle-preventivos">
                                            ${renderMantenimientosPorTipo('preventivo', mantenimientosEquipoSeleccionado)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <!-- Tab de Calibraciones -->
                            <div id="tab-detalle-calibracion" class="tab-content-detalle p-4 border border-gray-200 border-t-0 rounded-b-lg hidden">
                                <div class="overflow-x-auto">
                                    <table class="min-w-full text-left border">
                                        <thead class="bg-yellow-600 text-white">
                                            <tr>
                                                <th class="px-4 py-2 border text-center">Nombre</th>
                                                <th class="px-4 py-2 border text-center">Fecha Realizado</th>
                                                <th class="px-4 py-2 border text-center">Descripción</th>
                                                <th class="px-4 py-2 border text-center">Realizado por</th>
                                                <th class="px-4 py-2 border text-center">Observaciones</th>
                                                <th class="px-4 py-2 border text-center">Documento</th>
                                            </tr>
                                        </thead>
                                        <tbody id="tabla-detalle-calibraciones">
                                            ${renderMantenimientosPorTipo('calibracion', mantenimientosEquipoSeleccionado)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <!-- Tab de Correctivos -->
                            <div id="tab-detalle-correctivo" class="tab-content-detalle p-4 border border-gray-200 border-t-0 rounded-b-lg hidden">
                                <div class="overflow-x-auto">
                                    <table class="min-w-full text-left border">
                                        <thead class="bg-red-600 text-white">
                                            <tr>
                                                <th class="px-4 py-2 border text-center">Nombre</th>
                                                <th class="px-4 py-2 border text-center">Fecha Realizado</th>
                                                <th class="px-4 py-2 border text-center">Descripción</th>
                                                <th class="px-4 py-2 border text-center">Realizado por</th>
                                                <th class="px-4 py-2 border text-center">Observaciones</th>
                                                <th class="px-4 py-2 border text-center">Documento</th>
                                            </tr>
                                        </thead>
                                        <tbody id="tabla-detalle-correctivos">
                                            ${renderMantenimientosPorTipo('correctivo', mantenimientosEquipoSeleccionado)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Footer del modal -->
                <div class="border-t border-gray-200 px-6 py-4 flex justify-between items-center">
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-info-circle mr-2"></i>Total mantenimientos: ${totalMantenimientos}
                    </div>
                    <div class="flex gap-2">
                        <!-- BOTÓN REMOVIDO: Solo se usarán los botones "Validar" de cada mantenimiento programado -->
                        <button onclick="cerrarModalDetalleEquipo()"
                            class="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Insertar el modal en el DOM
    document.body.insertAdjacentHTML('beforeend', contenidoHTML);
    
    // Configurar eventos de los tabs
    configurarTabsDetalle();
}

// ✅ FUNCIÓN: Cerrar modal de detalle
function cerrarModalDetalleEquipo() {
    const modal = document.getElementById('modal-detalle-equipo');
    if (modal) {
        modal.remove();
    }
}

// ✅ FUNCIÓN: Configurar tabs del modal de detalle
function configurarTabsDetalle() {
    const tabs = document.querySelectorAll('.tab-button-detalle');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('tab-active-detalle'));
            tab.classList.add('tab-active-detalle');

            document.querySelectorAll('.tab-content-detalle').forEach(content => {
                content.classList.add('hidden');
            });

            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`tab-detalle-${tabId}`).classList.remove('hidden');
        });
    });
}

// ✅ FUNCIÓN: Validar mantenimiento específico
async function validarMantenimientoEspecifico(idMantenimientoProgramado, tipo) {
    try {
        const mantenimientoProgramado = mantenimientosProgramadosEquipoSeleccionado.find(m => m.id === idMantenimientoProgramado);
        if (!mantenimientoProgramado) {
            mostrarMensaje('❌ No se encontró el mantenimiento programado', true);
            return;
        }

        // Mostrar el modal para agregar mantenimiento (con z-index mayor)
        await mostrarModalMantenimientoEspecifico(tipo, mantenimientoProgramado);
        
    } catch (error) {
        console.error("Error validando mantenimiento:", error);
        mostrarMensaje("❌ Error al validar mantenimiento", true);
    }
}

// ========================= FUNCIONES DE CLOUDINARY (DEL CÓDIGO DE GUÍA) =========================

// ✅ FUNCIÓN MEJORADA: Subir PDF a Cloudinary
async function subirPDFCloudinary(archivo) {
    try {
        console.log(`📤 Subiendo: ${archivo.name} (${(archivo.size / 1024).toFixed(2)}KB)`);

        // Validaciones básicas
        if (archivo.type !== 'application/pdf') {
            throw new Error('Solo se permiten archivos PDF');
        }

        if (archivo.size > 10 * 1024 * 1024) {
            throw new Error('El PDF es demasiado grande. Máximo: 10MB');
        }

        // ✅ FORM DATA SIMPLIFICADO
        const formData = new FormData();
        formData.append('file', archivo);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('resource_type', 'raw');

        // ✅ SUBIR
        const response = await fetch(CLOUDINARY_RAW_UPLOAD, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Error ${response.status}`);
        }

        const data = await response.json();

        console.log('✅ Upload exitoso:', {
            url: data.secure_url,
            public_id: data.public_id,
            nombre: data.original_filename
        });

        return {
            url: data.secure_url,
            public_id: data.public_id,
            nombre_original: data.original_filename,
            tamaño: data.bytes
        };

    } catch (error) {
        console.error('❌ Error subiendo PDF:', error);
        throw error;
    }
}

// ✅ FUNCIÓN CORREGIDA: Descargar documento (VERSIÓN DEFINITIVA)
async function descargarDocumento(url, nombreArchivo) {
    if (!url) {
        mostrarMensaje('❌ No hay documento disponible', true);
        return false;
    }

    try {
        console.log('📥 Iniciando descarga...', { url, nombreArchivo });

        // ✅ ESTRATEGIA 1: Descarga directa usando fetch + blob
        try {
            console.log('🔄 Intentando descarga con fetch...');

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();

            if (blob.size === 0) {
                throw new Error('El archivo está vacío');
            }

            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = nombreArchivo || 'documento.pdf';
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Limpiar después de descargar
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

            mostrarMensaje('✅ Descarga completada');
            return true;

        } catch (fetchError) {
            console.log('❌ Fetch falló:', fetchError.message);

            // ✅ ESTRATEGIA 2: Forzar descarga con atributo download
            console.log('🔄 Forzando descarga con atributo download...');
            const link = document.createElement('a');
            link.href = url;
            link.download = nombreArchivo || 'documento.pdf';
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            mostrarMensaje('✅ Descarga iniciada');
            return true;
        }

    } catch (error) {
        console.error('❌ Error en descarga:', error);

        // ✅ ESTRATEGIA 3: Último recurso - abrir en nueva pestaña
        console.log('🔄 Abriendo en nueva pestaña como fallback...');
        window.open(url, '_blank', 'noopener,noreferrer');
        mostrarMensaje('📄 Documento abierto en nueva pestaña');
        return true;
    }
}

// ✅ FUNCIÓN SIMPLIFICADA: Previsualizar PDF en nueva pestaña
async function previsualizarPDF(url, nombreArchivo = 'documento.pdf') {
    if (!url) {
        mostrarMensaje('❌ No hay documento disponible para previsualizar', true);
        return false;
    }

    try {
        console.log('👀 Abriendo PDF en nueva pestaña...', { url, nombreArchivo });

        // ✅ ESTRATEGIA SIMPLE: Abrir en nueva pestaña (EVITA ERRORES DE PERMISOS)
        window.open(url, '_blank', 'noopener,noreferrer');

        mostrarMensaje('📄 Documento abierto en nueva pestaña');
        return true;

    } catch (error) {
        console.error('❌ Error abriendo PDF:', error);

        // ✅ FALLBACK: Descarga directa
        mostrarMensaje('⚠️ Abriendo documento...');
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return true;
    }
}

// ========================= FUNCIONES PARA AGREGAR MANTENIMIENTOS =========================

// ✅ FUNCIÓN MEJORADA: Mostrar modal para validar mantenimiento específico
async function mostrarModalMantenimientoEspecifico(tipo, mantenimientoProgramado) {
    const modal = document.getElementById('modal-mantenimiento');
    const form = document.getElementById('form-mantenimiento');

    if (!modal || !form) {
        console.error('❌ No se encontró el modal o el formulario');
        return;
    }

    form.reset();

    const tipoNombre = tipo === 'preventivo' ? 'Preventivo' : 'Calibración';
    const nombreMantenimiento = mantenimientoProgramado.nombre_personalizado || tipoNombre;

    const modalTitulo = document.getElementById('modal-titulo');
    const tipoMantenimientoInput = document.getElementById('tipo-mantenimiento');
    const mantenimientoTipoInput = document.getElementById('mantenimiento-tipo');
    const idMantenimientoProgramadoInput = document.getElementById('id-mantenimiento-programado');
    const textoBotonGuardar = document.getElementById('texto-boton-guardar');
    const fechaRealizadoInput = document.getElementById('fecha-realizado');
    const realizadoPorInput = document.getElementById('realizado-por');
    const descripcionTextarea = document.getElementById('descripcion-mantenimiento');

    if (modalTitulo) modalTitulo.textContent = `Validar ${nombreMantenimiento}`;
    
    // ✅ EL TIPO DE MANTENIMIENTO DEBE ESTAR PRECARGADO SEGÚN EL TIPO
    if (tipoMantenimientoInput) {
        tipoMantenimientoInput.value = tipo === 'preventivo' ? 'preventivo' : 'calibracion';
        tipoMantenimientoInput.disabled = true; // Hacerlo de solo lectura
    }
    
    if (mantenimientoTipoInput) mantenimientoTipoInput.value = tipo;
    if (idMantenimientoProgramadoInput) idMantenimientoProgramadoInput.value = mantenimientoProgramado.id;
    if (textoBotonGuardar) textoBotonGuardar.textContent = 'Validar';

    if (fechaRealizadoInput) {
        fechaRealizadoInput.value = mantenimientoProgramado.proxima_fecha ? mantenimientoProgramado.proxima_fecha.split('T')[0] : new Date().toISOString().split('T')[0];
        fechaRealizadoInput.readOnly = false;
    }

    // Obtener usuario actual para "Realizado por"
    const usuario = obtenerUsuarioActual();
    if (realizadoPorInput && usuario) {
        realizadoPorInput.value = usuario.nombre || 'Técnico';
    }

    if (descripcionTextarea) {
        if (tipo === 'preventivo') {
            descripcionTextarea.value = `Mantenimiento preventivo "${nombreMantenimiento}" realizado según programa establecido. Verificación de funcionamiento, limpieza y ajustes necesarios.`;
        } else {
            descripcionTextarea.value = `Calibración "${nombreMantenimiento}" realizada según especificaciones del fabricante. Verificación de parámetros y ajustes de precisión.`;
        }
    }

    // ✅ CONFIGURAR Z-INDEX MÁS ALTO PARA QUE APAREZCA POR ENCIMA
    modal.style.zIndex = '2000';
    modal.classList.remove('hidden');
}

// ✅ FUNCIÓN MEJORADA: Mostrar modal para agregar mantenimiento GENÉRICO (para correctivos)
async function mostrarModalAgregarMantenimiento(equipoId, tipo = 'correctivo') {
    try {
        // ✅ MOSTRAR LOADING
        mostrarLoadingMantenimientos(true);
        
        const res = await fetch(`${API_EQUIPOS}/${equipoId}/completo`);
        if (!res.ok) throw new Error("Error al obtener datos del equipo");
        
        const equipo = await res.json();
        
        // Configurar información en el modal
        document.getElementById('equipo-id-mantenimiento').value = equipoId;
        document.getElementById('mantenimiento-tipo').value = tipo;
        
        const infoEquipo = document.getElementById('info-equipo-mantenimiento');
        if (infoEquipo) {
            infoEquipo.innerHTML = `
                <p><strong>Nombre:</strong> ${equipo.nombre}</p>
                <p><strong>Código:</strong> ${equipo.codigo_interno}</p>
                <p><strong>Tipo:</strong> ${equipo.tipo_nombre || equipo.tipo_equipo_nombre || '-'}</p>
                <p><strong>Ubicación:</strong> ${equipo.ubicacion === 'puesto' ? 
                    `Puesto: ${equipo.puesto_codigo || '-'}` : 
                    `Área: ${equipo.area_nombre || '-'}`}</p>
                <p><strong>Responsable:</strong> ${equipo.responsable_nombre || '-'}</p>
            `;
        }
        
        // Establecer fecha actual por defecto
        const fechaRealizado = document.getElementById('fecha-realizado');
        if (fechaRealizado) {
            const hoy = new Date().toISOString().split('T')[0];
            fechaRealizado.value = hoy;
            fechaRealizado.readOnly = false;
        }
        
        // Establecer tipo de mantenimiento
        const tipoMantenimientoInput = document.getElementById('tipo-mantenimiento');
        const textoBotonGuardar = document.getElementById('texto-boton-guardar');
        
        if (tipoMantenimientoInput) {
            tipoMantenimientoInput.value = tipo;
            tipoMantenimientoInput.disabled = false; // Permitir cambio solo para correctivos
        }
        
        if (textoBotonGuardar) {
            textoBotonGuardar.textContent = tipo === 'correctivo' ? 'Agregar Correctivo' : 'Validar';
        }
        
        // Obtener usuario actual para "Realizado por"
        const usuario = obtenerUsuarioActual();
        const realizadoPorInput = document.getElementById('realizado-por');
        if (realizadoPorInput && usuario) {
            realizadoPorInput.value = usuario.nombre || 'Técnico';
        }
        
        // Limpiar descripción para que el usuario la escriba
        const descripcionTextarea = document.getElementById('descripcion-mantenimiento');
        if (descripcionTextarea) {
            descripcionTextarea.value = '';
            descripcionTextarea.placeholder = tipo === 'correctivo' 
                ? 'Describa la reparación correctiva realizada...' 
                : 'Describa el mantenimiento realizado...';
        }
        
        // Mostrar modal
        const modal = document.getElementById('modal-mantenimiento');
        modal.style.zIndex = '2000'; // Asegurar que esté por encima
        modal.classList.remove('hidden');
        
        console.log('✅ Modal mostrado para equipo:', equipo.nombre);
        
        // ✅ OCULTAR LOADING
        mostrarLoadingMantenimientos(false);
        
    } catch (err) {
        console.error("❌ Error al cargar datos para mantenimiento:", err);
        mostrarLoadingMantenimientos(false);
        mostrarMensaje("❌ Error: " + err.message, true);
    }
}

// ✅ FUNCIÓN MEJORADA: Guardar mantenimiento (USANDO CLOUDINARY)
async function guardarMantenimiento() {
    // ✅ BLOQUEAR DOBLE EJECUCIÓN
    if (window.guardandoMantenimiento) {
        console.log('⚠️ Guardado en proceso, esperando...');
        return;
    }

    try {
        window.guardandoMantenimiento = true;

        // Obtener datos del formulario
        const equipoId = document.getElementById('equipo-id-mantenimiento').value;
        const tipoSeleccionado = document.getElementById('tipo-mantenimiento').value;
        const idMantenimientoProgramado = document.getElementById('id-mantenimiento-programado')?.value;
        const fechaRealizado = document.getElementById('fecha-realizado').value;
        const descripcion = document.getElementById('descripcion-mantenimiento').value;
        const realizadoPor = document.getElementById('realizado-por').value;
        const observaciones = document.getElementById('observaciones-mantenimiento').value;
        const archivoDocumento = document.getElementById('documento-mantenimiento').files[0];

        // Validaciones
        if (!fechaRealizado || !descripcion || !realizadoPor) {
            mostrarMensaje('❌ Complete todos los campos requeridos', true);
            return;
        }

        // Buscar tipo de mantenimiento en base de datos
        let tipoMantenimiento = null;
        
        if (tipoSeleccionado === 'preventivo' || tipoSeleccionado === 'calibracion' || tipoSeleccionado === 'correctivo') {
            tipoMantenimiento = tiposMantenimiento.find(t => {
                const nombreTipo = t.nombre.toLowerCase();
                
                if (tipoSeleccionado === 'preventivo') return nombreTipo.includes('preventivo');
                if (tipoSeleccionado === 'calibracion') return nombreTipo.includes('calibración') || nombreTipo.includes('calibracion');
                if (tipoSeleccionado === 'correctivo') return nombreTipo.includes('correctivo');
                return false;
            });
        }

        if (!tipoMantenimiento) {
            // Si no se encuentra, crear uno básico
            tipoMantenimiento = {
                id: tipoSeleccionado === 'preventivo' ? 1 : 
                    tipoSeleccionado === 'calibracion' ? 3 : 2,
                nombre: tipoSeleccionado === 'preventivo' ? 'Preventivo' : 
                       tipoSeleccionado === 'calibracion' ? 'Calibración' : 'Correctivo'
            };
        }

        // ✅ PREPARAR DATOS CON NOMBRE PERSONALIZADO CORRECTO
        let nombrePersonalizado = tipoMantenimiento.nombre;

        if (tipoSeleccionado !== 'correctivo' && idMantenimientoProgramado) {
            const mantenimientoProgramado = mantenimientosProgramadosEquipoSeleccionado.find(mp => mp.id == idMantenimientoProgramado);
            if (mantenimientoProgramado?.nombre_personalizado) {
                nombrePersonalizado = mantenimientoProgramado.nombre_personalizado;
            }
        }

        const mantenimientoData = {
            id_equipo: equipoId,
            id_tipo: tipoMantenimiento.id,
            fecha_realizado: fechaRealizado,
            descripcion: descripcion,
            realizado_por: realizadoPor,
            observaciones: observaciones,
            estado: 'realizado',
            nombre_personalizado: nombrePersonalizado
        };

        // Agregar datos de mantenimiento programado si aplica
        if (tipoSeleccionado !== 'correctivo' && idMantenimientoProgramado) {
            mantenimientoData.fecha_programada = fechaRealizado;
            mantenimientoData.id_mantenimiento_programado = parseInt(idMantenimientoProgramado);
        }

        // ✅ SUBIR DOCUMENTO PDF SI EXISTE (CLOUDINARY)
        if (archivoDocumento) {
            mostrarMensaje('📤 Subiendo PDF...');

            try {
                const documentoSubido = await subirPDFCloudinary(archivoDocumento);

                mantenimientoData.documento_url = documentoSubido.url;
                mantenimientoData.documento_public_id = documentoSubido.public_id;
                mantenimientoData.documento_nombre = documentoSubido.nombre_original;
                mantenimientoData.documento_tamaño = documentoSubido.tamaño;
                mantenimientoData.documento_tipo = 'cloudinary_raw';

                mostrarMensaje('✅ PDF subido correctamente');
            } catch (error) {
                mostrarMensaje(`❌ Error al subir PDF: ${error.message}`, true);
                return;
            }
        }

        console.log('📤 Enviando datos al servidor:', mantenimientoData);

        // ✅ GUARDAR EN LA BASE DE DATOS
        const response = await fetch(API_MANTENIMIENTOS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mantenimientoData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Error al guardar mantenimiento');
        }

        const result = await response.json();
        console.log('✅ Mantenimiento guardado:', result);

        // Mensaje de éxito
        const esValidacion = tipoSeleccionado !== 'correctivo';
        mostrarMensaje(esValidacion ? '✅ Mantenimiento validado correctamente' : '✅ Correctivo agregado correctamente');

        // ✅ LIMPIAR FORMULARIO Y RECARGAR
        cerrarModalMantenimiento();

        // Recargar datos
        if (equipoSeleccionado && equipoSeleccionado.id == equipoId) {
            await cargarMantenimientosParaEquipoSeleccionado(equipoId);
        }
        
        // Actualizar la tabla principal
        await cargarMantenimientosParaEquipos();
        renderizarPaginaActual();

    } catch (error) {
        console.error('❌ Error guardando mantenimiento:', error);
        mostrarMensaje('❌ Error: ' + error.message, true);
    } finally {
        // ✅ LIBERAR BLOQUEO
        window.guardandoMantenimiento = false;
    }
}

// ✅ FUNCIÓN AUXILIAR: Cargar mantenimientos para equipo seleccionado
async function cargarMantenimientosParaEquipoSeleccionado(equipoId) {
    try {
        const resMantenimientos = await fetch(`${API_MANTENIMIENTOS}/equipo/${equipoId}`);
        if (resMantenimientos.ok) {
            mantenimientosEquipoSeleccionado = await resMantenimientos.json();
        }
    } catch (error) {
        console.warn("Error recargando mantenimientos:", error);
    }
}

// ✅ FUNCIÓN MEJORADA: Cerrar modal (LIMPIAR FORMULARIO)
function cerrarModalMantenimiento() {
    const modal = document.getElementById('modal-mantenimiento');
    const form = document.getElementById('form-mantenimiento');

    if (form) {
        form.reset();
        
        // Restaurar el campo de tipo a editable
        const tipoMantenimientoInput = document.getElementById('tipo-mantenimiento');
        if (tipoMantenimientoInput) {
            tipoMantenimientoInput.disabled = false;
        }
    }

    // Limpiar campos específicos
    const mantenimientoIdInput = document.getElementById('mantenimiento-id');
    const mantenimientoTipoInput = document.getElementById('mantenimiento-tipo');
    const idMantenimientoProgramadoInput = document.getElementById('id-mantenimiento-programado');

    if (mantenimientoIdInput) mantenimientoIdInput.value = '';
    if (mantenimientoTipoInput) mantenimientoTipoInput.value = '';
    if (idMantenimientoProgramadoInput) idMantenimientoProgramadoInput.value = '';

    if (modal) {
        modal.style.zIndex = ''; // Restaurar z-index
        modal.classList.add('hidden');
    }
}

// ========================= FUNCIÓN PARA OBTENER USUARIO ACTUAL =========================

function obtenerUsuarioActual() {
    try {
        const usuarioData = localStorage.getItem('currentUser');
        return usuarioData ? JSON.parse(usuarioData) : null;
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        return null;
    }
}

// ========================= CONFIGURAR EVENTO DEL FORMULARIO =========================

// Configurar evento del formulario
document.addEventListener('DOMContentLoaded', function() {
    const formMantenimiento = document.getElementById('form-mantenimiento');
    if (formMantenimiento) {
        formMantenimiento.addEventListener('submit', function(e) {
            e.preventDefault();
            guardarMantenimiento();
        });
    }
});

// ========================= Hacer funciones disponibles globalmente =========================

window.mostrarModalAgregarMantenimiento = mostrarModalAgregarMantenimiento;
window.cerrarModalMantenimiento = cerrarModalMantenimiento;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.mostrarDetalleEquipo = mostrarDetalleEquipo;
window.cerrarModalDetalleEquipo = cerrarModalDetalleEquipo;
window.validarMantenimientoEspecifico = validarMantenimientoEspecifico;
window.previsualizarPDF = previsualizarPDF;
window.descargarDocumento = descargarDocumento;