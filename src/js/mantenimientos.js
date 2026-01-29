// src/js/mantenimientos.js - MÓDULO ESPECIAL PARA TÉCNICOS CON FIRMA DIGITAL

// ✅ CONFIGURACIÓN CLOUDINARY CORREGIDA - DEFINICIÓN GLOBAL
window.CLOUDINARY_CONFIG = {
    cloudName: 'dzkccjhn9',
    uploadPreset: 'inventario'
};

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CONFIG.cloudName}`;
const CLOUDINARY_RAW_UPLOAD = `${CLOUDINARY_UPLOAD_URL}/raw/upload`;

// ✅ CONFIGURACIÓN API
const API_URL = "https://inventario-api-gw73.onrender.com";
const API_EQUIPOS = `${API_URL}/equipos`;
const API_MANTENIMIENTOS = `${API_URL}/mantenimientos`;
const API_TIPOS_EQUIPO = `${API_URL}/tipos-equipo`;
const API_TIPOS_MANTENIMIENTO = `${API_URL}/tipos-mantenimiento/todos`;

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

// Variable para controlar si se está guardando
window.guardandoMantenimiento = false;

// ========================= FUNCIONES AUXILIARES =========================

// ✅ FUNCIÓN AUXILIAR: Construir ubicación completa
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

// ✅ FUNCIÓN: Obtener fecha actual en formato YYYY-MM-DD
function getCurrentDate() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = now.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ✅ FUNCIÓN: Formatear fecha DD/MM/YYYY
function formatDateToDDMMYYYY(dateStr) {
    if (!dateStr) return "-";
    try {
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateStr.split('-');
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "-";

        const day = date.getUTCDate().toString().padStart(2, '0');
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error('Error formateando fecha:', e);
        return "-";
    }
}

// ✅ FUNCIÓN: Mostrar mensajes tipo toast
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
                <div class="h-1 w-full mt-2 ${esError ? 'bg-red-500' : 'bg-green-500'} rounded-full"></div>
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

// ✅ FUNCIÓN: Mostrar/ocultar loading
function mostrarLoadingMantenimientos(mostrar) {
    if (mostrar) {
        if (loadingTimeout) clearTimeout(loadingTimeout);
        
        loadingTimeout = setTimeout(() => {
            if (!document.getElementById('mantenimientos-loading')) {
                const loadingElement = document.createElement('div');
                loadingElement.id = 'mantenimientos-loading';
                loadingElement.className = 'fixed top-4 right-4 z-50 animate-slide-in loading-mantenimientos';
                loadingElement.innerHTML = `
                    <div class="bg-white rounded-lg p-4 shadow-xl border border-gray-200">
                        <div class="flex items-center space-x-3">
                            <div class="animate-spin rounded-full h-5 w-5 border-2 border-[#639A33] border-t-transparent"></div>
                            <div>
                                <p class="text-sm font-medium text-gray-800">Procesando...</p>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(loadingElement);
            }
        }, 300);
    } else {
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
        }
        
        const loadingElement = document.getElementById('mantenimientos-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
    }
}

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
        
        // 8. Configurar el formulario de mantenimiento
        configurarFormularioMantenimiento();
        
    } catch (err) {
        console.error("❌ Error cargando datos:", err);
        mostrarSkeletonTabla(false);
        mostrarMensaje("❌ Error al cargar los datos", true);
        mostrarLoadingMantenimientos(false);
    }
});

// ========================= FUNCIONES PARA CARGAR DATOS =========================

async function cargarMantenimientosParaEquipos() {
    console.log("🔄 Cargando mantenimientos realizados...");
    
    mantenimientosRealizados = [];
    
    try {
        const response = await fetch(API_MANTENIMIENTOS);
        if (!response.ok) throw new Error("Error al obtener mantenimientos");
        
        const todosLosMantenimientos = await response.json();
        
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
        mantenimientosRealizados = todosLosEquipos.map(equipo => ({
            equipoId: equipo.id,
            mantenimientos: []
        }));
    }
}

function obtenerMantenimientosEquipo(equipoId) {
    const encontrado = mantenimientosRealizados.find(m => m.equipoId === equipoId);
    return encontrado ? encontrado.mantenimientos : [];
}

function obtenerUltimoMantenimiento(equipoId) {
    const mantenimientos = obtenerMantenimientosEquipo(equipoId);
    if (mantenimientos.length === 0) return null;
    
    return mantenimientos.sort((a, b) => 
        new Date(b.fecha_realizado) - new Date(a.fecha_realizado)
    )[0];
}

// ========================= FUNCIONES DE INTERFAZ =========================

function mostrarSkeletonTabla(mostrar) {
    const tbody = document.getElementById("tablaEquipos");
    
    if (!tbody) return;
    
    if (mostrar) {
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
    }
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
    
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const equiposPagina = equiposFiltrados.slice(inicio, fin);
    
    const fragment = document.createDocumentFragment();
    
    equiposPagina.forEach(eq => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-100 transition";
        tr.innerHTML = crearFilaEquipo(eq);
        fragment.appendChild(tr);
    });
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

function crearFilaEquipo(equipo) {
    const ubicacionCompleta = construirUbicacionCompleta(equipo);
    
    const responsable = equipo.ubicacion === "puesto" 
        ? (equipo.puesto_responsable || "-")
        : (equipo.responsable_nombre ? `${equipo.responsable_nombre} (${equipo.responsable_documento || "-"})` : "-");

    const estadoReal = determinarEstadoMantenimientoReal(equipo);
    
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

    const ultimoMantenimiento = obtenerUltimoMantenimiento(equipo.id);
    const ultimaFecha = ultimoMantenimiento ? formatDateToDDMMYYYY(ultimoMantenimiento.fecha_realizado) : "Nunca";
    
    let ultimoTipo = "";
    if (ultimoMantenimiento) {
        const tipoMantenimiento = tiposMantenimiento.find(t => t.id === ultimoMantenimiento.id_tipo);
        ultimoTipo = tipoMantenimiento?.nombre || "Mantenimiento";
    }

    return `
        <td class="px-4 py-2 border border-[#0F172A] font-mono text-sm">${equipo.codigo_interno}</td>
        <td class="px-4 py-2 border border-[#0F172A] font-medium">${equipo.nombre}</td>
        <td class="px-4 py-2 border border-[#0F172A]">
            <div class="text-sm">${ubicacionCompleta}</div>
        </td>
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
    
    setTimeout(() => {
        mostrarLoadingMantenimientos(false);
    }, 200);
}

function actualizarControlesPaginacion() {
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
    
    if (elementosPaginacion.contenedorNumeros) {
        elementosPaginacion.contenedorNumeros.innerHTML = '';
        
        const maxNumerosVisibles = 5;
        let inicio = Math.max(1, paginaActual - Math.floor(maxNumerosVisibles / 2));
        let fin = Math.min(totalPaginas, inicio + maxNumerosVisibles - 1);
        
        if (fin - inicio + 1 < maxNumerosVisibles) {
            inicio = Math.max(1, fin - maxNumerosVisibles + 1);
        }
        
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
        
        for (let i = inicio; i <= fin; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = `px-2 py-1 text-sm rounded ${i === paginaActual 
                ? 'bg-[#639A33] text-white font-semibold' 
                : 'hover:bg-gray-200'}`;
            pageBtn.addEventListener('click', () => cambiarPagina(i));
            elementosPaginacion.contenedorNumeros.appendChild(pageBtn);
        }
        
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

// ========================= FUNCIONES PARA EL FORMULARIO DE MANTENIMIENTO =========================

function configurarFormularioMantenimiento() {
    const form = document.getElementById('form-mantenimiento');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        guardarMantenimiento();
    });
}

// ✅ FUNCIÓN MEJORADA: Cerrar modal mantenimiento (SIMPLEMENTE CIERRA)
function cerrarModalMantenimiento() {
    const modal = document.getElementById('modal-mantenimiento');
    
    if (modal) {
        // Solo ocultar, no resetear
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    
    // Liberar bloqueo
    window.guardandoMantenimiento = false;
}

// ✅ FUNCIÓN: Mostrar modal de mantenimiento (ACTUALIZADA PARA VENTANA FLOTANTE)
function mostrarModalMantenimiento(tipo, equipo = null, mantenimientoProgramado = null) {
    const modal = document.getElementById('modal-mantenimiento');
    const form = document.getElementById('form-mantenimiento');

    if (!modal || !form) {
        console.error('❌ No se encontró el modal o el formulario');
        return;
    }

    form.reset();

    const tipoNombre = tipo === 'preventivo' ? 'Preventivo' :
        tipo === 'calibracion' ? 'Calibración' : 'Correctivo';

    const esValidacion = tipo !== 'correctivo';

    const modalTitulo = document.getElementById('modal-titulo');
    const tipoMantenimientoInput = document.getElementById('tipo-mantenimiento');
    const mantenimientoTipoInput = document.getElementById('mantenimiento-tipo');
    const textoBotonGuardar = document.getElementById('texto-boton-guardar');
    const fechaRealizadoInput = document.getElementById('fecha-realizado');
    const realizadoPorInput = document.getElementById('realizado-por');
    const descripcionTextarea = document.getElementById('descripcion-mantenimiento');
    const infoEquipoContainer = document.getElementById('info-equipo-mantenimiento');

    if (modalTitulo) modalTitulo.textContent = esValidacion ? `Validar ${tipoNombre}` : `Agregar ${tipoNombre}`;
    if (tipoMantenimientoInput) tipoMantenimientoInput.value = tipoNombre;
    if (mantenimientoTipoInput) mantenimientoTipoInput.value = tipo;
    if (textoBotonGuardar) textoBotonGuardar.textContent = esValidacion ? 'Validar' : 'Agregar';

    // ❌ ELIMINADA LA PARTE DE FECHA PROGRAMADA

    if (fechaRealizadoInput) fechaRealizadoInput.value = getCurrentDate();
    if (realizadoPorInput) realizadoPorInput.value = localStorage.getItem('usuario') || 'Técnico';

    // Mostrar información del equipo
    if (infoEquipoContainer && equipo) {
        infoEquipoContainer.innerHTML = `
            <div class="grid grid-cols-1 gap-2">
                <div class="flex items-start">
                    <i class="fas fa-barcode text-blue-600 mt-1 mr-2"></i>
                    <div>
                        <p class="text-xs text-blue-800 font-semibold">Código</p>
                        <p class="text-sm">${equipo.codigo_interno || '-'}</p>
                    </div>
                </div>
                <div class="flex items-start">
                    <i class="fas fa-tag text-blue-600 mt-1 mr-2"></i>
                    <div>
                        <p class="text-xs text-blue-800 font-semibold">Nombre</p>
                        <p class="text-sm">${equipo.nombre || '-'}</p>
                    </div>
                </div>
                <div class="flex items-center">
                    <i class="fas fa-map-marker-alt text-blue-600 mr-2"></i>
                    <div>
                        <p class="text-xs text-blue-800 font-semibold">Ubicación</p>
                        <p class="text-sm truncate">${construirUbicacionCompleta(equipo)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    if (descripcionTextarea) {
        switch (tipo) {
            case 'preventivo':
                descripcionTextarea.value = mantenimientoProgramado 
                    ? `Mantenimiento preventivo "${mantenimientoProgramado.nombre_personalizado || tipoNombre}" realizado según programa establecido. Verificación de funcionamiento, limpieza y ajustes necesarios.`
                    : 'Mantenimiento preventivo realizado según programa establecido. Verificación de funcionamiento, limpieza y ajustes necesarios.';
                break;
            case 'calibracion':
                descripcionTextarea.value = mantenimientoProgramado
                    ? `Calibración "${mantenimientoProgramado.nombre_personalizado || tipoNombre}" realizada según especificaciones del fabricante. Verificación de parámetros y ajustes de precisión.`
                    : 'Calibración realizada según especificaciones del fabricante. Verificación de parámetros y ajustes de precisión.';
                break;
            case 'correctivo':
                descripcionTextarea.value = 'Reparación correctiva realizada. Identificación y solución de falla reportada.';
                break;
        }
    }

    // Si hay mantenimiento programado, guardar su ID
    if (mantenimientoProgramado) {
        const idMantenimientoProgramadoInput = document.getElementById('id-mantenimiento-programado');
        if (idMantenimientoProgramadoInput) {
            idMantenimientoProgramadoInput.value = mantenimientoProgramado.id;
        }
    }

    // Mostrar como ventana flotante
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

// ✅ FUNCIÓN MODIFICADA: `guardarMantenimiento` - Eliminar referencia a fecha programada
async function guardarMantenimiento() {
    console.log('🔄 Iniciando guardado de mantenimiento...');
    
    // ✅ BLOQUEAR DOBLE EJECUCIÓN
    if (window.guardandoMantenimiento) {
        console.log('⚠️ Guardado en proceso, esperando...');
        return;
    }
    
    try {
        window.guardandoMantenimiento = true;
        
        const tipo = document.getElementById('mantenimiento-tipo')?.value;
        const id = document.getElementById('mantenimiento-id')?.value;
        
        // Si es edición, usar función de actualización
        if (tipo === 'edicion' && id) {
            await actualizarMantenimiento();
            window.guardandoMantenimiento = false;
            return;
        }
        
        // Obtener datos del formulario
        const idMantenimientoProgramado = document.getElementById('id-mantenimiento-programado')?.value;
        const fechaRealizado = document.getElementById('fecha-realizado')?.value;
        const descripcion = document.getElementById('descripcion-mantenimiento')?.value;
        const realizadoPor = document.getElementById('realizado-por')?.value;
        const observaciones = document.getElementById('observaciones-mantenimiento')?.value;
        
        console.log('📋 Datos del formulario:', {
            tipo, idMantenimientoProgramado, fechaRealizado, descripcion, realizadoPor, observaciones
        });
        
        // Validaciones
        if (!fechaRealizado || !descripcion || !realizadoPor) {
            mostrarMensaje('❌ Complete todos los campos requeridos', true);
            window.guardandoMantenimiento = false;
            return;
        }
        
        if (!equipoSeleccionado) {
            mostrarMensaje('❌ No hay equipo seleccionado', true);
            window.guardandoMantenimiento = false;
            return;
        }
        
        // Buscar tipo de mantenimiento
        const tipoMantenimiento = tiposMantenimiento.find(t => {
            const nombreTipo = t.nombre.toLowerCase();
            const tipoBuscado = tipo.toLowerCase();
            
            if (tipoBuscado === 'preventivo') return nombreTipo.includes('preventivo');
            if (tipoBuscado === 'calibracion') return nombreTipo.includes('calibración') || nombreTipo.includes('calibracion');
            if (tipoBuscado === 'correctivo') return nombreTipo.includes('correctivo');
            return false;
        });
        
        if (!tipoMantenimiento) {
            mostrarMensaje(`❌ Tipo de mantenimiento no válido: "${tipo}"`, true);
            window.guardandoMantenimiento = false;
            return;
        }
        
        console.log('✅ Tipo de mantenimiento encontrado:', tipoMantenimiento);
        
        // ✅ PREPARAR DATOS (SIN FECHA PROGRAMADA)
        let nombrePersonalizado = tipoMantenimiento.nombre;
        
        if (tipo !== 'correctivo' && idMantenimientoProgramado) {
            const mantenimientoProgramado = mantenimientosProgramadosEquipoSeleccionado.find(mp => mp.id == idMantenimientoProgramado);
            if (mantenimientoProgramado?.nombre_personalizado) {
                nombrePersonalizado = mantenimientoProgramado.nombre_personalizado;
            }
        }
        
        const mantenimientoData = {
            id_equipo: equipoSeleccionado.id,
            id_tipo: tipoMantenimiento.id,
            fecha_realizado: fechaRealizado,
            descripcion: descripcion,
            realizado_por: realizadoPor,
            observaciones: observaciones,
            estado: 'realizado',
            nombre_personalizado: nombrePersonalizado,
            tipo: tipo // Agregar tipo para saber si es validación
        };
        
        // Agregar datos de mantenimiento programado si aplica (SIN FECHA PROGRAMADA)
        if (tipo !== 'correctivo' && idMantenimientoProgramado) {
            mantenimientoData.id_mantenimiento_programado = parseInt(idMantenimientoProgramado);
        }
        
        console.log('📝 Datos preparados para guardar:', mantenimientoData);
        
        // ✅ MOSTRAR MODAL DE FIRMA DIGITAL CON LOS DATOS
        mostrarModalFirmaDigital(mantenimientoData);
        
    } catch (error) {
        console.error('❌ Error preparando mantenimiento:', error);
        mostrarMensaje('❌ Error: ' + error.message, true);
        window.guardandoMantenimiento = false;
    }
}

// ✅ FUNCIÓN ACTUALIZADA: Actualizar mantenimiento
async function actualizarMantenimiento() {
    const id = document.getElementById('mantenimiento-id')?.value;
    const fechaRealizado = document.getElementById('fecha-realizado')?.value;
    const descripcion = document.getElementById('descripcion-mantenimiento')?.value;
    const realizadoPor = document.getElementById('realizado-por')?.value;
    const observaciones = document.getElementById('observaciones-mantenimiento')?.value;
    
    if (!fechaRealizado || !descripcion || !realizadoPor) {
        mostrarMensaje('❌ Complete todos los campos requeridos', true);
        return;
    }
    
    try {
        const mantenimientoData = {
            fecha_realizado: fechaRealizado,
            descripcion: descripcion,
            realizado_por: realizadoPor,
            observaciones: observaciones
        };
        
        const response = await fetch(`${API_MANTENIMIENTOS}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mantenimientoData)
        });
        
        if (!response.ok) throw new Error('Error al actualizar mantenimiento');
        
        mostrarMensaje('✅ Mantenimiento actualizado correctamente');
        cerrarModalMantenimiento();
        
        // Recargar datos
        if (equipoSeleccionado) {
            await cargarMantenimientosParaEquipoSeleccionado(equipoSeleccionado.id);
        }
        
    } catch (error) {
        console.error('Error actualizando mantenimiento:', error);
        mostrarMensaje('❌ Error al actualizar mantenimiento', true);
    }
}

// ========================= FIRMA DIGITAL =========================

// ✅ FUNCIÓN NUEVA: Crear y configurar modal de firma digital
function mostrarModalFirmaDigital(mantenimientoData) {
    // Guardar datos del mantenimiento para usar después
    window.datosMantenimientoParaGuardar = mantenimientoData;
    
    // ✅ LIMPIAR MODAL EXISTENTE
    const modalExistente = document.getElementById('modal-firma');
    if (modalExistente) modalExistente.remove();
    
    // ✅ MODIFICAR SOLO ESTA LÍNEA EN EL HTML DEL MODAL:
    // Cambia: class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-60"
    // Por: style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;"
    
    const modalHTML = `
        <div id="modal-firma" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <!-- El resto del código IGUAL -->
            <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div class="p-4 border-b">
                    <h3 class="text-lg font-semibold text-gray-900">Firma Digital del Técnico</h3>
                    <p class="text-sm text-gray-600">Dibuje su firma en el área inferior</p>
                </div>
                
                <div class="p-4">
                    <div class="border-2 border-gray-300 rounded-lg bg-white mb-4">
                        <canvas id="signature-pad" width="450" height="200" 
                                class="w-full h-48 touch-none"></canvas>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <button onclick="limpiarFirma()" 
                                class="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">
                            <i class="fas fa-eraser mr-1"></i> Limpiar
                        </button>
                        
                        <div class="flex gap-2">
                            <button onclick="cerrarModalFirma()" 
                                    class="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded">
                                Cancelar
                            </button>
                            <button onclick="procesarFirmaYGuardar()" 
                                    id="btn-confirmar-firma"
                                    class="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                                    disabled>
                                <i class="fas fa-check mr-1"></i> Confirmar y Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // ✅ AGREGAR AL DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // ✅ INICIALIZAR FIRMA (mantén tu código actual)
    setTimeout(() => {
        const canvas = document.getElementById('signature-pad');
        if (canvas) {
            const signaturePad = new SignaturePad(canvas, {
                backgroundColor: 'rgb(255, 255, 255)',
                penColor: 'rgb(0, 0, 0)',
                minWidth: 1,
                maxWidth: 3
            });
            
            signaturePad.addEventListener('endStroke', () => {
                const btn = document.getElementById('btn-confirmar-firma');
                if (btn) btn.disabled = signaturePad.isEmpty();
            });
            
            window.signaturePad = signaturePad;
        }
    }, 100);
}

// ✅ FUNCIÓN NUEVA: Limpiar firma
function limpiarFirma() {
    if (window.signaturePad) {
        window.signaturePad.clear();
        const btn = document.getElementById('btn-confirmar-firma');
        if (btn) btn.disabled = true;
    }
}

// ✅ FUNCIÓN NUEVA: Cerrar modal de firma
function cerrarModalFirma() {
    const modal = document.getElementById('modal-firma');
    if (modal) {
        modal.remove();
    }
    if (window.signaturePad) {
        delete window.signaturePad;
    }
    delete window.datosMantenimientoParaGuardar;
}

// ✅ FUNCIÓN NUEVA: Procesar firma y guardar mantenimiento (SIMPLIFICADO)
async function procesarFirmaYGuardar() {
    console.log('🔄 Iniciando proceso de guardado con firma...');
    
    if (!window.signaturePad || window.signaturePad.isEmpty()) {
        mostrarMensaje('❌ Por favor, dibuje su firma primero', true);
        return;
    }
    
    try {
        mostrarLoadingMantenimientos(true);
        mostrarMensaje('🔄 Procesando firma y generando documento...');
        
        // Obtener firma como imagen base64
        const firmaDataURL = window.signaturePad.toDataURL('image/png');
        console.log('✅ Firma obtenida:', firmaDataURL.substring(0, 50) + '...');
        
        // Obtener datos del mantenimiento
        const mantenimientoData = window.datosMantenimientoParaGuardar;
        
        if (!mantenimientoData) {
            mostrarMensaje('❌ Error: No hay datos del mantenimiento', true);
            cerrarModalFirma();
            mostrarLoadingMantenimientos(false);
            return;
        }
        
        console.log('📝 Datos del mantenimiento:', mantenimientoData);
        
        // ✅ PASO 1: Generar PDF automáticamente
        mostrarMensaje('📄 Generando documento PDF...');
        
        let pdfFile;
        try {
            pdfFile = await generarPDFMantenimiento(mantenimientoData, firmaDataURL);
            console.log('✅ PDF generado:', pdfFile.name, 'tamaño:', pdfFile.size);
        } catch (pdfError) {
            console.error('Error generando PDF:', pdfError);
            mostrarMensaje('⚠️ Error generando PDF. Guardando sin documento...', true);
            // Continuar sin PDF
        }
        
        // ✅ PASO 2: Subir PDF a Cloudinary si se generó
        if (pdfFile) {
            try {
                mostrarMensaje('📤 Subiendo PDF a Cloudinary...');
                const documentoSubido = await subirPDFCloudinary(pdfFile);
                
                // Agregar datos del documento al mantenimiento
                mantenimientoData.documento_url = documentoSubido.url;
                mantenimientoData.documento_public_id = documentoSubido.public_id;
                mantenimientoData.documento_nombre = pdfFile.name;
                mantenimientoData.documento_tamaño = documentoSubido.tamaño;
                mantenimientoData.documento_tipo = 'cloudinary_raw';
                mantenimientoData.firma_digital = firmaDataURL; // Guardar firma como referencia
                
                console.log('✅ PDF subido a Cloudinary:', documentoSubido.url);
            } catch (uploadError) {
                console.error('Error subiendo PDF:', uploadError);
                mostrarMensaje('⚠️ Error subiendo PDF. Guardando sin documento...', true);
                // Continuar sin documento subido
            }
        }
        
        // ✅ PASO 3: Guardar en la base de datos
        mostrarMensaje('💾 Guardando mantenimiento en la base de datos...');
        
        // Preparar datos para enviar (sin propiedades innecesarias)
        const datosParaEnviar = {
            id_equipo: mantenimientoData.id_equipo,
            id_tipo: mantenimientoData.id_tipo,
            fecha_realizado: mantenimientoData.fecha_realizado,
            descripcion: mantenimientoData.descripcion,
            realizado_por: mantenimientoData.realizado_por,
            observaciones: mantenimientoData.observaciones || '',
            estado: 'realizado',
            nombre_personalizado: mantenimientoData.nombre_personalizado || '',
            documento_url: mantenimientoData.documento_url || null,
            documento_public_id: mantenimientoData.documento_public_id || null,
            documento_nombre: mantenimientoData.documento_nombre || null,
            documento_tamaño: mantenimientoData.documento_tamaño || null,
            documento_tipo: mantenimientoData.documento_tipo || null,
            firma_digital: mantenimientoData.firma_digital || null
        };
        
        // Agregar datos de mantenimiento programado si aplica
        if (mantenimientoData.id_mantenimiento_programado) {
            datosParaEnviar.id_mantenimiento_programado = mantenimientoData.id_mantenimiento_programado;
        }
        
        console.log('📤 Enviando datos al servidor:', datosParaEnviar);
        
        const response = await fetch(API_MANTENIMIENTOS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosParaEnviar)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del servidor:', errorText);
            throw new Error(errorText || 'Error al guardar mantenimiento');
        }
        
        const result = await response.json();
        console.log('✅ Mantenimiento guardado:', result);
        
        // ✅ PASO 4: Mensaje de éxito y limpieza
        const esValidacion = mantenimientoData.tipo !== 'correctivo';
        mostrarMensaje(esValidacion ? '✅ Mantenimiento validado correctamente' : '✅ Correctivo agregado correctamente');
        
        // ✅ PASO 5: Limpiar formulario y recargar datos
        cerrarModalMantenimiento();
        cerrarModalFirma();
        
        // Recargar datos del equipo seleccionado
        if (equipoSeleccionado) {
            await cargarMantenimientosParaEquipoSeleccionado(equipoSeleccionado.id);
        }
        
        // Recargar datos generales
        await cargarMantenimientosParaEquipos();
        renderizarPaginaActual();
        actualizarControlesPaginacion();
        
        // Limpiar variable temporal
        delete window.datosMantenimientoParaGuardar;
        mostrarLoadingMantenimientos(false);
        window.guardandoMantenimiento = false;
        
    } catch (error) {
        console.error('❌ Error procesando firma y guardando:', error);
        mostrarMensaje('❌ Error: ' + error.message, true);
        cerrarModalFirma();
        mostrarLoadingMantenimientos(false);
        window.guardandoMantenimiento = false;
    }
}

// ✅ FUNCIÓN: Generar PDF con firma automáticamente
async function generarPDFMantenimiento(mantenimientoData, firmaDataURL) {
    return new Promise((resolve, reject) => {
        try {
            console.log('🎨 Generando PDF...');
            
            // Verificar si jsPDF está disponible
            if (typeof jspdf === 'undefined') {
                console.warn('jsPDF no está disponible, usando método alternativo');
                // Crear un PDF simple como fallback
                const contenido = `
                    ACTA DE MANTENIMIENTO
                    =====================
                    
                    INFORMACIÓN DEL EQUIPO:
                    -----------------------
                    Código: ${equipoSeleccionado.codigo_interno || 'N/A'}
                    Nombre: ${equipoSeleccionado.nombre || 'N/A'}
                    Ubicación: ${construirUbicacionCompleta(equipoSeleccionado)}
                    
                    DETALLES DEL MANTENIMIENTO:
                    ---------------------------
                    Tipo: ${mantenimientoData.nombre_personalizado || 'Mantenimiento'}
                    Fecha: ${mantenimientoData.fecha_realizado || 'N/A'}
                    Realizado por: ${mantenimientoData.realizado_por || 'N/A'}
                    
                    Descripción:
                    ${mantenimientoData.descripcion || 'Sin descripción'}
                    
                    ${mantenimientoData.observaciones ? 'Observaciones:\n' + mantenimientoData.observaciones : ''}
                    
                    FIRMA DEL TÉCNICO:
                    ------------------
                    [Documento firmado digitalmente]
                    
                    Generado el: ${new Date().toLocaleDateString('es-ES')}
                    Sistema de Gestión de Inventarios - IPS Progresando
                `;
                
                const blob = new Blob([contenido], { type: 'application/pdf' });
                const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
                const codigo = equipoSeleccionado.codigo_interno || 'equipo';
                const nombreArchivo = `mantenimiento_${codigo}_${fecha}.pdf`;
                
                const pdfFile = new File([blob], nombreArchivo, {
                    type: 'application/pdf',
                    lastModified: Date.now()
                });
                
                resolve(pdfFile);
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Configuración
            const margin = 20;
            let y = margin;
            
            // Título
            doc.setFontSize(16);
            doc.text('ACTA DE MANTENIMIENTO', 105, y, { align: 'center' });
            y += 10;
            
            doc.setFontSize(10);
            doc.text('Sistema de Gestión de Inventarios - IPS Progresando', 105, y, { align: 'center' });
            y += 15;
            
            // Línea separadora
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y, 190, y);
            y += 10;
            
            // Información del equipo
            doc.setFontSize(12);
            doc.text('INFORMACIÓN DEL EQUIPO', margin, y);
            y += 8;
            
            doc.setFontSize(10);
            doc.text(`Código: ${equipoSeleccionado.codigo_interno || '-'}`, margin, y);
            doc.text(`Nombre: ${equipoSeleccionado.nombre || '-'}`, 105, y);
            y += 6;
            
            doc.text(`Ubicación: ${construirUbicacionCompleta(equipoSeleccionado)}`, margin, y);
            y += 10;
            
            // Detalles del mantenimiento
            doc.setFontSize(12);
            doc.text('DETALLES DEL MANTENIMIENTO', margin, y);
            y += 8;
            
            doc.setFontSize(10);
            doc.text(`Fecha: ${mantenimientoData.fecha_realizado || '-'}`, margin, y);
            doc.text(`Tipo: ${mantenimientoData.nombre_personalizado || 'Mantenimiento'}`, 105, y);
            y += 6;
            
            doc.text(`Realizado por: ${mantenimientoData.realizado_por || '-'}`, margin, y);
            y += 10;
            
            // Descripción
            doc.text('Descripción:', margin, y);
            y += 6;
            
            const descripcion = mantenimientoData.descripcion || 'Sin descripción';
            const splitDesc = doc.splitTextToSize(descripcion, 170);
            splitDesc.forEach(line => {
                if (y > 250) {
                    doc.addPage();
                    y = margin;
                }
                doc.text(line, margin, y);
                y += 6;
            });
            
            y += 6;
            
            // Observaciones
            if (mantenimientoData.observaciones) {
                doc.text('Observaciones:', margin, y);
                y += 6;
                
                const observaciones = mantenimientoData.observaciones;
                const splitObs = doc.splitTextToSize(observaciones, 170);
                splitObs.forEach(line => {
                    if (y > 250) {
                        doc.addPage();
                        y = margin;
                    }
                    doc.text(line, margin, y);
                    y += 6;
                });
                
                y += 6;
            }
            
            // Firma
            if (firmaDataURL && y < 200) {
                doc.text('Firma del técnico responsable:', margin, y);
                y += 10;
                
                try {
                    // Agregar firma como imagen
                    doc.addImage(firmaDataURL, 'PNG', margin, y, 60, 30);
                    y += 35;
                    
                    // Línea para firma
                    doc.setDrawColor(0, 0, 0);
                    doc.line(margin, y, margin + 100, y);
                    y += 8;
                    
                    // Nombre del técnico
                    doc.setFontSize(9);
                    doc.text(`Nombre: ${mantenimientoData.realizado_por || 'Técnico'}`, margin, y);
                } catch (error) {
                    console.warn('Error agregando firma al PDF:', error);
                    doc.text('[Firma digital]', margin, y);
                    y += 6;
                }
            }
            
            // Pie de página
            const fechaGen = new Date().toLocaleDateString('es-ES');
            const horaGen = new Date().toLocaleTimeString('es-ES');
            
            doc.setFontSize(8);
            doc.text(`Generado el: ${fechaGen} ${horaGen}`, margin, 280);
            doc.text('Sistema de Gestión de Inventarios - IPS Progresando', 105, 280, { align: 'center' });
            
            // Guardar PDF
            const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const codigo = equipoSeleccionado.codigo_interno || 'equipo';
            const tipo = mantenimientoData.nombre_personalizado ? 
                mantenimientoData.nombre_personalizado.toLowerCase().replace(/\s+/g, '_') : 
                'mantenimiento';
            const nombreArchivo = `mantenimiento_${codigo}_${tipo}_${fecha}.pdf`;
            
            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], nombreArchivo, {
                type: 'application/pdf',
                lastModified: Date.now()
            });
            
            console.log('✅ PDF creado exitosamente:', nombreArchivo);
            resolve(pdfFile);
            
        } catch (error) {
            console.error('Error generando PDF:', error);
            reject(error);
        }
    });
}

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
        formData.append('upload_preset', window.CLOUDINARY_CONFIG.uploadPreset);
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

// ========================= FUNCIONES PARA MOSTRAR DETALLE DEL EQUIPO =========================

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

// ✅ FUNCIÓN: Crear modal con detalles del equipo
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
            const fechaRealizado = mant.fecha_realizado ? formatDateToDDMMYYYY(mant.fecha_realizado) : '-';
            const tieneDocumento = !!mant.documento_url;
            const tieneFirma = !!mant.firma_digital;
            
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

            // ✅ BOTONES PARA VER Y DESCARGAR PDF CON INDICADOR DE FIRMA
            const indicadorFirma = tieneFirma ? `
                <span class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2" title="Documento firmado digitalmente">
                    <i class="fas fa-signature mr-1"></i>Firmado
                </span>
            ` : '';
            
            const botonesDocumento = tieneDocumento ? `
                <div class="flex gap-2 justify-center items-center">
                    <div class="flex flex-col items-center">
                        <div class="flex gap-2">
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
                        ${indicadorFirma}
                    </div>
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
                                                        Próximo: ${formatDateToDDMMYYYY(preventivo.proxima_fecha)} ${estadoInfo.texto}
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
                                                        Próxima: ${formatDateToDDMMYYYY(calibracion.proxima_fecha)} ${estadoInfo.texto}
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
                        <!-- Botón para agregar correctivo manual -->
                        <button onclick="mostrarModalAgregarCorrectivo(${equipoSeleccionado.id})"
                            class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
                            <i class="fas fa-wrench mr-2"></i>Agregar Correctivo
                        </button>
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

// ✅ FUNCIÓN: Cerrar modal de detalle
function cerrarModalDetalleEquipo() {
    const modal = document.getElementById('modal-detalle-equipo');
    if (modal) {
        modal.remove();
    }
}

// ✅ FUNCIÓN: Validar mantenimiento específico
async function validarMantenimientoEspecifico(idMantenimientoProgramado, tipo) {
    const mantenimientoProgramado = mantenimientosProgramadosEquipoSeleccionado.find(m => m.id === idMantenimientoProgramado);
    if (!mantenimientoProgramado) {
        mostrarMensaje('❌ No se encontró el mantenimiento programado', true);
        return;
    }

    await mostrarModalMantenimientoEspecifico(tipo, mantenimientoProgramado);
}

// ✅ FUNCIÓN: Mostrar modal para mantenimiento específico
async function mostrarModalMantenimientoEspecifico(tipo, mantenimientoProgramado) {
    // Cerrar primero el modal de detalle
    cerrarModalDetalleEquipo();
    
    // Mostrar modal de mantenimiento con los datos
    mostrarModalMantenimiento(tipo, equipoSeleccionado, mantenimientoProgramado);
}

// ✅ FUNCIÓN NUEVA: Mostrar modal para agregar correctivo
function mostrarModalAgregarCorrectivo(equipoId) {
    // Cerrar primero el modal de detalle
    cerrarModalDetalleEquipo();
    
    // Obtener usuario actual
    const usuario = obtenerUsuarioActual();
    
    // Buscar el equipo en la lista
    const equipo = todosLosEquipos.find(e => e.id === equipoId);
    if (!equipo) {
        mostrarMensaje('❌ No se encontró el equipo', true);
        return;
    }
    
    // Mostrar modal de mantenimiento para correctivo
    mostrarModalMantenimiento('correctivo', equipo, null);
    
    // Establecer el técnico actual
    const realizadoPorInput = document.getElementById('realizado-por');
    if (realizadoPorInput && usuario?.nombre) {
        realizadoPorInput.value = usuario.nombre;
    }
}

// ✅ FUNCIÓN: Cargar mantenimientos para equipo seleccionado
async function cargarMantenimientosParaEquipoSeleccionado(equipoId) {
    try {
        const response = await fetch(`${API_MANTENIMIENTOS}/equipo/${equipoId}`);
        if (response.ok) {
            mantenimientosEquipoSeleccionado = await response.json();
        }
    } catch (error) {
        console.error("Error cargando mantenimientos del equipo:", error);
    }
}

// ========================= FUNCIONES DE CLOUDINARY =========================

// ✅ FUNCIÓN CORREGIDA: Descargar documento
async function descargarDocumento(url, nombreArchivo) {
    if (!url) {
        mostrarMensaje('❌ No hay documento disponible', true);
        return false;
    }

    try {
        console.log('📥 Iniciando descarga...', { url, nombreArchivo });

        try {
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

            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

            mostrarMensaje('✅ Descarga completada');
            return true;

        } catch (fetchError) {
            console.log('❌ Fetch falló:', fetchError.message);

            window.open(url, '_blank', 'noopener,noreferrer');
            mostrarMensaje('📄 Documento abierto en nueva pestaña');
            return true;
        }

    } catch (error) {
        console.error('❌ Error en descarga:', error);

        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo || 'documento.pdf';
        link.target = '_blank';
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        mostrarMensaje('⚠️ Intentando descarga...');
        return true;
    }
}

// ✅ FUNCIÓN SIMPLIFICADA: Previsualizar PDF
async function previsualizarPDF(url, nombreArchivo = 'documento.pdf') {
    if (!url) {
        mostrarMensaje('❌ No hay documento disponible para previsualizar', true);
        return false;
    }

    try {
        console.log('👀 Abriendo PDF en nueva pestaña...', { url, nombreArchivo });

        window.open(url, '_blank', 'noopener,noreferrer');

        mostrarMensaje('📄 Documento abierto en nueva pestaña');
        return true;

    } catch (error) {
        console.error('❌ Error abriendo PDF:', error);

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

// ========================= Hacer funciones disponibles globalmente =========================

window.mostrarModalFirmaDigital = mostrarModalFirmaDigital;
window.limpiarFirma = limpiarFirma;
window.cerrarModalFirma = cerrarModalFirma;
window.procesarFirmaYGuardar = procesarFirmaYGuardar;
window.validarMantenimientoEspecifico = validarMantenimientoEspecifico;
window.mostrarModalAgregarCorrectivo = mostrarModalAgregarCorrectivo;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
window.mostrarDetalleEquipo = mostrarDetalleEquipo;
window.cerrarModalDetalleEquipo = cerrarModalDetalleEquipo;
window.previsualizarPDF = previsualizarPDF;
window.descargarDocumento = descargarDocumento;
window.cerrarModalMantenimiento = cerrarModalMantenimiento;
window.guardarMantenimiento = guardarMantenimiento;