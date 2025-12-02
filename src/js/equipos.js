// src/js/equipos.js - VERSIÓN CON LOADING DISCRETO EN ESQUINA

const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";
const API_TIPOS_EQUIPO = "https://inventario-api-gw73.onrender.com/tipos-equipo";

// Variables globales ORIGINALES
let todosLosEquipos = [];
let equiposFiltrados = [];
let tiposEquipoDisponibles = [];
let notificacionInterval = null;
let ultimaNotificacion = null;

// ✅ CARGAR ESTADO DESDE localStorage
let notificacionesActivas = localStorage.getItem('notificacionesActivas') !== 'false';

// ✅ VARIABLES PARA PAGINACIÓN
const ITEMS_POR_PAGINA = 20;
let paginaActual = 1;
let totalPaginas = 1;
let itemsPorPagina = ITEMS_POR_PAGINA;

// ✅ VARIABLE PARA CONTROLAR LOADING
let loadingTimeout = null;

// ✅ ELEMENTOS DOM PARA PAGINACIÓN
let elementosPaginacion = {
    contadorResultados: null,
    infoPaginacion: null,
    botonAnterior: null,
    botonSiguiente: null,
    contenedorNumeros: null,
    selectItemsPorPagina: null
};

// ========================= INICIALIZACIÓN OPTIMIZADA =========================

document.addEventListener("DOMContentLoaded", async () => {
    try {
        console.log("🚀 Inicializando módulo de equipos...");
        
        // ✅ 1. ACTUALIZAR BOTÓN INMEDIATAMENTE CON EL ESTADO GUARDADO
        actualizarEstadoBotonNotificaciones();
        
        // ✅ 2. INICIALIZAR ELEMENTOS DE PAGINACIÓN
        inicializarElementosPaginacion();
        
        // ✅ 3. MOSTRAR SKELETON INMEDIATAMENTE (sin overlay negro)
        mostrarSkeletonTabla(true);
        
        // ✅ 4. Solicitar permisos de notificación
        await inicializarNotificaciones();
        
        // ✅ 5. Cargar equipos y tipos de equipo en paralelo
        const [equiposRes, tiposRes] = await Promise.all([
            fetch(API_EQUIPOS),
            fetch(API_TIPOS_EQUIPO)
        ]);

        if (!equiposRes.ok) throw new Error("Error al obtener equipos");
        if (!tiposRes.ok) throw new Error("Error al obtener tipos de equipo");

        todosLosEquipos = await equiposRes.json();
        tiposEquipoDisponibles = await tiposRes.json();
        equiposFiltrados = [...todosLosEquipos];

        // ✅ 6. OCULTAR SKELETON Y MOSTRAR DATOS
        mostrarSkeletonTabla(false);
        
        if (todosLosEquipos.length === 0) {
            document.getElementById("tablaEquipos").innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-gray-500">
                        No hay equipos registrados
                    </td>
                </tr>
            `;
        } else {
            // ✅ 7. MOSTRAR ALERTAS DE MANTENIMIENTO
            mostrarAlertasMantenimiento(todosLosEquipos);
            
            // ✅ 8. CONFIGURAR PAGINACIÓN CON LOS DATOS
            calcularPaginacion();
            renderizarPaginaActual();
            actualizarContador();
            actualizarControlesPaginacion();
            
            // ✅ 9. CONFIGURAR EVENTOS Y CARGAR TIPOS
            configurarEventosFiltros();
            cargarTiposEquipoEnFiltro();
            
            // ✅ 10. INICIAR O NO MONITOREO SEGÚN ESTADO GUARDADO
            if (notificacionesActivas) {
                iniciarMonitoreoNotificaciones();
            } else {
                document.title = "Inventario IPS - Equipos";
            }
            
            console.log(`✅ Carga completada: ${todosLosEquipos.length} equipos cargados`);
        }
    } catch (err) {
        console.error("❌ Error cargando datos:", err);
        mostrarSkeletonTabla(false);
        mostrarMensaje("❌ Error al cargar los datos", true);
        mostrarLoadingEquipos(false);
    }
});

// ========================= LOADING DISCRETO EN ESQUINA =========================

// ✅ FUNCIÓN MEJORADA: Mostrar loading discreto en esquina
function mostrarLoadingEquipos(mostrar) {
    let loadingElement = document.getElementById('equipos-loading');
    
    if (mostrar) {
        // Limpiar timeout anterior si existe
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
        }
        
        // Solo mostrar después de 500ms (si la carga es rápida, no se muestra)
        loadingTimeout = setTimeout(() => {
            if (!document.getElementById('equipos-loading')) {
                loadingElement = document.createElement('div');
                loadingElement.id = 'equipos-loading';
                loadingElement.className = 'fixed top-4 right-4 z-50 animate-slide-in';
                loadingElement.innerHTML = `
                    <div class="bg-white rounded-lg p-4 shadow-xl border border-gray-200">
                        <div class="flex items-center space-x-3">
                            <div class="animate-spin rounded-full h-5 w-5 border-2 border-[#639A33] border-t-transparent"></div>
                            <div>
                                <p class="text-sm font-medium text-gray-800">Actualizando equipos</p>
                                <p class="text-xs text-gray-600">Obteniendo datos...</p>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(loadingElement);
            }
        }, 500); // Solo aparece si tarda más de 500ms
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

// ✅ FUNCIÓN MEJORADA: Mostrar toast de carga rápida
function mostrarToastCargaRapidaEquipos() {
    const toastId = 'toast-carga-rapida-equipos';
    let toast = document.getElementById(toastId);
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg z-50 animate-slide-in';
        toast.innerHTML = `
            <div class="flex items-center">
                <div class="bg-green-100 p-2 rounded-md mr-3">
                    <i class="fas fa-bolt text-green-600"></i>
                </div>
                <div>
                    <p class="font-medium text-green-800">Datos cargados</p>
                    <p class="text-sm text-green-600">Equipos actualizados</p>
                </div>
                <button onclick="document.getElementById('${toastId}').remove()" class="ml-4 text-green-400 hover:text-green-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(toast);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    if (toast && toast.parentNode) toast.remove();
                }, 300);
            }
        }, 3000);
    }
}

// ========================= SISTEMA DE PAGINACIÓN OPTIMIZADO =========================

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
            // ✅ MOSTRAR LOADING AL CAMBIAR ITEMS POR PÁGINA
            mostrarLoadingEquipos(true);
            
            itemsPorPagina = parseInt(this.value);
            paginaActual = 1;
            calcularPaginacion();
            renderizarPaginaActual();
            actualizarControlesPaginacion();
            
            // ✅ OCULTAR LOADING DESPUÉS DE RENDERIZAR
            setTimeout(() => {
                mostrarLoadingEquipos(false);
            }, 300);
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
                <td colspan="6" class="text-center py-4 text-gray-500">
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
    
    // ✅ OPTIMIZACIÓN: Usar DocumentFragment para renderizado más rápido
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

    // Determinar estado de mantenimiento REAL
    const estadoReal = determinarEstadoMantenimientoReal(equipo);
    let estadoMantenimientoHTML = "";
    
    if (estadoReal === "VENCIDO") {
        estadoMantenimientoHTML = `
            <div class="flex items-center justify-center text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                <span class="font-semibold">Mantenimiento Vencido</span>
            </div>
        `;
    } else if (estadoReal === "PRÓXIMO") {
        estadoMantenimientoHTML = `
            <div class="flex items-center justify-center text-yellow-600 bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
                <i class="fas fa-clock mr-2"></i>
                <span class="font-semibold">Mantenimiento Próximo</span>
            </div>
        `;
    } else if (estadoReal === "OK") {
        estadoMantenimientoHTML = `
            <div class="flex items-center justify-center text-green-600 bg-green-50 px-3 py-2 rounded border border-green-200">
                <i class="fas fa-check-circle mr-2"></i>
                <span class="font-semibold">Al Día</span>
            </div>
        `;
    } else {
        estadoMantenimientoHTML = `
            <div class="flex items-center justify-center text-gray-500 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                <i class="fas fa-info-circle mr-2"></i>
                <span>Sin Configuración</span>
            </div>
        `;
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
        <td class="px-4 py-2 border border-[#0F172A]">
            ${estadoMantenimientoHTML}
        </td>
        <td class="px-4 py-2 border border-[#0F172A] text-center">
            <div class="flex justify-center gap-2">
                <button onclick="window.location.href='verEquipo.html?id=${equipo.id}'"
                    class="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm flex items-center gap-1">
                    <i class="fas fa-eye"></i> Ver
                </button>
                <button onclick="window.location.href='editarEquipo.html?id=${equipo.id}'"
                    class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm flex items-center gap-1">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <div id="delete-controls-${equipo.id}">
                    <button onclick="mostrarConfirmacion(${equipo.id})"
                        class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm flex items-center gap-1">
                        <i class="fas fa-ban"></i> Inactivar
                    </button>
                </div>
            </div>
        </td>
    `;
}

function cambiarPagina(nuevaPagina) {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    
    // ✅ MOSTRAR LOADING RÁPIDO AL CAMBIAR PÁGINA
    mostrarLoadingEquipos(true);
    
    paginaActual = nuevaPagina;
    renderizarPaginaActual();
    actualizarControlesPaginacion();
    actualizarInfoPaginacion();
    
    // Scroll suave hacia la parte superior de la tabla
    const tablaContainer = document.querySelector('.table-container');
    if (tablaContainer) {
        tablaContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // ✅ OCULTAR LOADING RÁPIDO DESPUÉS DE RENDERIZAR
    setTimeout(() => {
        mostrarLoadingEquipos(false);
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

// ========================= SISTEMA DE NOTIFICACIONES PERSISTENTE =========================

async function inicializarNotificaciones() {
    if (!("Notification" in window)) {
        console.log("Este navegador no soporta notificaciones del sistema");
        return false;
    }

    if (Notification.permission === "granted") {
        console.log("✅ Notificaciones ya están activadas");
        return true;
    }
    
    if (Notification.permission === "denied") {
        console.log("❌ Notificaciones bloqueadas por el usuario");
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            console.log("✅ Permisos de notificación concedidos");
            mostrarMensaje("🔔 Notificaciones activadas - Serás alertado sobre mantenimientos pendientes");
            return true;
        } else {
            console.log("❌ Permisos de notificación denegados");
            return false;
        }
    } catch (error) {
        console.error("Error solicitando permisos de notificación:", error);
        return false;
    }
}

function iniciarMonitoreoNotificaciones() {
    if (notificacionInterval) {
        clearInterval(notificacionInterval);
    }

    notificacionInterval = setInterval(() => {
        verificarYMostrarNotificaciones();
    }, 300000);

    setTimeout(verificarYMostrarNotificaciones, 2000);
}

function detenerMonitoreoNotificaciones() {
    if (notificacionInterval) {
        clearInterval(notificacionInterval);
        notificacionInterval = null;
    }
    
    document.title = "Inventario IPS - Equipos";
    console.log("🔕 Notificaciones desactivadas - Título limpiado");
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
        estado = "VENCIDO";
    } else if (diasMasUrgente <= 30) {
        estado = "PRÓXIMO";
    } else if (diasMasUrgente === Infinity) {
        estado = "SIN_DATOS";
    }

    return estado;
}

function obtenerEquiposConProblemas(equipos) {
    const equiposConProblemas = [];

    equipos.forEach(equipo => {
        const estado = determinarEstadoMantenimientoReal(equipo);
        if (estado === "VENCIDO" || estado === "PRÓXIMO") {
            equiposConProblemas.push(equipo);
        }
    });

    return equiposConProblemas;
}

function generarKeyNotificacion(equiposConProblemas) {
    return equiposConProblemas
        .map(eq => `${eq.id}-${determinarEstadoMantenimientoReal(eq)}`)
        .sort()
        .join('|');
}

function verificarYMostrarNotificaciones() {
    if (!notificacionesActivas || !notificacionInterval) {
        document.title = "Inventario IPS - Equipos";
        return;
    }

    if (Notification.permission !== "granted") {
        document.title = "Inventario IPS - Equipos";
        return;
    }

    const equiposConProblemas = obtenerEquiposConProblemas(todosLosEquipos);
    
    if (equiposConProblemas.length === 0) {
        document.title = "Inventario IPS - Equipos";
        return;
    }

    document.title = `⚠️ (${equiposConProblemas.length}) - Inventario IPS`;

    const ahora = new Date().getTime();
    const notificacionKey = generarKeyNotificacion(equiposConProblemas);
    
    if (ultimaNotificacion && 
        ultimaNotificacion.key === notificacionKey && 
        (ahora - ultimaNotificacion.timestamp) < 1800000) {
        console.log("Notificación similar ya mostrada recientemente, omitiendo...");
        return;
    }

    mostrarNotificacionSistema(equiposConProblemas);
    
    ultimaNotificacion = {
        key: notificacionKey,
        timestamp: ahora
    };
}

function mostrarNotificacionSistema(equiposConProblemas) {
    if (!notificacionesActivas || Notification.permission !== "granted") {
        return;
    }

    const equiposVencidos = equiposConProblemas.filter(eq => 
        determinarEstadoMantenimientoReal(eq) === "VENCIDO"
    );
    const equiposProximos = equiposConProblemas.filter(eq => 
        determinarEstadoMantenimientoReal(eq) === "PRÓXIMO"
    );

    let titulo = "";
    let cuerpo = "";

    if (equiposVencidos.length > 0 && equiposProximos.length > 0) {
        titulo = `⚠️ ${equiposVencidos.length} Vencidos, ${equiposProximos.length} Próximos`;
        cuerpo = `${equiposConProblemas.length} equipo(s) necesitan atención`;
    } else if (equiposVencidos.length > 0) {
        titulo = `🚨 ${equiposVencidos.length} Mantenimiento(s) Vencido(s)`;
        cuerpo = `${equiposVencidos.length} equipo(s) tienen mantenimiento VENCIDO`;
    } else {
        titulo = `⏰ ${equiposProximos.length} Mantenimiento(s) Próximo(s)`;
        cuerpo = `${equiposProximos.length} equipo(s) necesitan mantenimiento pronto`;
    }

    const notificacion = new Notification(titulo, {
        body: cuerpo,
        icon: "../assets/Logo_ips.png",
        tag: "mantenimiento-alert",
        requireInteraction: true,
        silent: false
    });

    notificacion.onclick = function() {
        window.focus();
        notificacion.close();
    };

    setTimeout(() => {
        notificacion.close();
    }, 10000);
}

function toggleNotificaciones() {
    if (Notification.permission === "granted") {
        if (notificacionesActivas) {
            notificacionesActivas = false;
            localStorage.setItem('notificacionesActivas', 'false');
            detenerMonitoreoNotificaciones();
            mostrarMensaje("🔕 Notificaciones desactivadas - El estado se guardará");
            actualizarEstadoBotonNotificaciones();
        } else {
            notificacionesActivas = true;
            localStorage.setItem('notificacionesActivas', 'true');
            iniciarMonitoreoNotificaciones();
            mostrarMensaje("🔔 Notificaciones reactivadas - El estado se guardará");
            actualizarEstadoBotonNotificaciones();
        }
    } else if (Notification.permission === "denied") {
        mostrarMensaje("❌ Notificaciones bloqueadas. Actívalas en la configuración de tu navegador.", true);
    } else {
        inicializarNotificaciones().then(activado => {
            if (activado) {
                notificacionesActivas = true;
                localStorage.setItem('notificacionesActivas', 'true');
                iniciarMonitoreoNotificaciones();
                actualizarEstadoBotonNotificaciones();
            }
        });
    }
}

function actualizarEstadoBotonNotificaciones() {
    const boton = document.querySelector('[onclick="toggleNotificaciones()"]');
    const texto = document.getElementById('estado-notificaciones');
    
    if (!boton || !texto) return;
    
    if (notificacionesActivas && Notification.permission === "granted") {
        texto.textContent = 'Notificaciones ✅';
        boton.className = boton.className.replace(/bg-(red|gray|green)-600/g, '') + ' bg-green-600';
        boton.className = boton.className.replace(/hover:bg-(red|gray|green)-700/g, '') + ' hover:bg-green-700';
    } else {
        texto.textContent = 'Notificaciones ❌';
        boton.className = boton.className.replace(/bg-(red|gray|green)-600/g, '') + ' bg-gray-600';
        boton.className = boton.className.replace(/hover:bg-(red|gray|green)-700/g, '') + ' hover:bg-gray-700';
    }
}

// ========================= FUNCIONES DE FILTRADO CON PAGINACIÓN =========================

function cargarTiposEquipoEnFiltro() {
    const filtroTipo = document.getElementById('filtro-tipo');
    if (!filtroTipo) return;

    filtroTipo.innerHTML = '<option value="">Todos los tipos</option>';
    
    tiposEquipoDisponibles.forEach(tipo => {
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
                // ✅ MOSTRAR LOADING AL FILTRAR
                mostrarLoadingEquipos(true);
                aplicarFiltros();
                // ✅ OCULTAR LOADING DESPUÉS DE FILTRAR
                setTimeout(() => mostrarLoadingEquipos(false), 300);
            }, 300));
        }
    });
    
    const filtrosSelect = ['filtro-ubicacion', 'filtro-estado', 'filtro-tipo'];
    filtrosSelect.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                // ✅ MOSTRAR LOADING AL FILTRAR
                mostrarLoadingEquipos(true);
                aplicarFiltros();
                // ✅ OCULTAR LOADING DESPUÉS DE FILTRAR
                setTimeout(() => mostrarLoadingEquipos(false), 300);
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
    // ✅ MOSTRAR LOADING AL LIMPIAR FILTROS
    mostrarLoadingEquipos(true);
    
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
    
    // ✅ OCULTAR LOADING DESPUÉS DE LIMPIAR
    setTimeout(() => mostrarLoadingEquipos(false), 300);
}

function actualizarContador() {
    const contador = document.getElementById('contador-resultados');
    if (contador) {
        contador.textContent = equiposFiltrados.length;
    }
}

// ========================= FUNCIÓN DE ALERTAS DE MANTENIMIENTO =========================

function mostrarAlertasMantenimiento(equipos) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const equiposConMantenimientoProximo = [];
    const equiposConMantenimientoVencido = [];
    const equiposSinConfiguracion = [];

    equipos.forEach(equipo => {
        const estado = determinarEstadoMantenimientoReal(equipo);
        
        if (estado === "VENCIDO") {
            let mantenimientoMasVencido = null;
            let diasMasVencido = 0;
            
            equipo.mantenimientos_configurados?.forEach(mant => {
                if (mant.proxima_fecha) {
                    const proxima = new Date(mant.proxima_fecha);
                    proxima.setHours(0, 0, 0, 0);
                    const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
                    
                    if (diffDias < 0 && (!mantenimientoMasVencido || diffDias < diasMasVencido)) {
                        mantenimientoMasVencido = mant;
                        diasMasVencido = diffDias;
                    }
                }
            });
            
            if (mantenimientoMasVencido) {
                equiposConMantenimientoVencido.push({
                    equipo: equipo,
                    mantenimiento: mantenimientoMasVencido,
                    dias: diasMasVencido
                });
            }
        } else if (estado === "PRÓXIMO") {
            let mantenimientoMasCercano = null;
            let diasMasCercano = Infinity;
            
            equipo.mantenimientos_configurados?.forEach(mant => {
                if (mant.proxima_fecha) {
                    const proxima = new Date(mant.proxima_fecha);
                    proxima.setHours(0, 0, 0, 0);
                    const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
                    
                    if (diffDias >= 0 && diffDias <= 30 && diffDias < diasMasCercano) {
                        mantenimientoMasCercano = mant;
                        diasMasCercano = diffDias;
                    }
                }
            });
            
            if (mantenimientoMasCercano) {
                equiposConMantenimientoProximo.push({
                    equipo: equipo,
                    mantenimiento: mantenimientoMasCercano,
                    dias: diasMasCercano
                });
            }
        } else if (estado === "SIN_DATOS") {
            equiposSinConfiguracion.push(equipo);
        }
    });

    const alertasContainer = document.getElementById('alertas-mantenimiento');
    let alertasHTML = '';

    if (equiposConMantenimientoVencido.length > 0) {
        alertasHTML += `
            <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <i class="fas fa-exclamation-triangle text-red-500 text-xl mr-3"></i>
                        <div>
                            <strong class="text-lg">¡Atención!</strong>
                            <p class="text-sm">${equiposConMantenimientoVencido.length} equipo(s) tienen mantenimiento VENCIDO</p>
                        </div>
                    </div>
                    <span class="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        ${equiposConMantenimientoVencido.length}
                    </span>
                </div>
                <div class="mt-2 text-sm">
                    <ul class="list-disc list-inside ml-4">
                        ${equiposConMantenimientoVencido.slice(0, 3).map(item => `
                            <li>
                                <strong>${item.equipo.codigo_interno}</strong> - ${item.equipo.nombre}
                                (${item.mantenimiento.tipo_mantenimiento_nombre} - Vencido hace ${Math.abs(item.dias)} día(s))
                            </li>
                        `).join('')}
                        ${equiposConMantenimientoVencido.length > 3 ? 
                            `<li>... y ${equiposConMantenimientoVencido.length - 3} más</li>` : ''}
                    </ul>
                </div>
            </div>
        `;
    }

    if (equiposConMantenimientoProximo.length > 0) {
        alertasHTML += `
            <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <i class="fas fa-clock text-yellow-500 text-xl mr-3"></i>
                        <div>
                            <strong class="text-lg">Mantenimientos Próximos</strong>
                            <p class="text-sm">${equiposConMantenimientoProximo.length} equipo(s) necesitan mantenimiento pronto</p>
                        </div>
                    </div>
                    <span class="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        ${equiposConMantenimientoProximo.length}
                    </span>
                </div>
                <div class="mt-2 text-sm">
                    <ul class="list-disc list-inside ml-4">
                        ${equiposConMantenimientoProximo.slice(0, 3).map(item => `
                            <li>
                                <strong>${item.equipo.codigo_interno}</strong> - ${item.equipo.nombre}
                                (${item.mantenimiento.tipo_mantenimiento_nombre} - En ${item.dias} día(s))
                            </li>
                        `).join('')}
                        ${equiposConMantenimientoProximo.length > 3 ? 
                            `<li>... y ${equiposConMantenimientoProximo.length - 3} más</li>` : ''}
                    </ul>
                </div>
            </div>
        `;
    }

    if (equiposSinConfiguracion.length > 0) {
        alertasHTML += `
            <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4 rounded">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <i class="fas fa-info-circle text-blue-500 text-xl mr-3"></i>
                        <div>
                            <strong class="text-lg">Información</strong>
                            <p class="text-sm">${equiposSinConfiguracion.length} equipo(s) no tienen mantenimientos configurados</p>
                        </div>
                    </div>
                    <span class="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        ${equiposSinConfiguracion.length}
                    </span>
                </div>
                <div class="mt-2 text-sm">
                    <p>Estos equipos no tienen programación de mantenimientos. Considera agregar mantenimientos para un mejor control.</p>
                </div>
            </div>
        `;
    }

    alertasContainer.innerHTML = alertasHTML;
}

// ========================= FUNCIONES DE INACTIVACIÓN =========================

function mostrarConfirmacion(id) {
    const container = document.getElementById(`delete-controls-${id}`);
    container.innerHTML = `
        <div class="flex gap-1">
            <button onclick="eliminarEquipo(${id})" class="bg-red-700 text-white px-2 py-1 rounded text-sm">Sí</button>
            <button onclick="cancelarEliminacion(${id})" class="bg-gray-400 text-white px-2 py-1 rounded text-sm">No</button>
        </div>
    `;
}

function cancelarEliminacion(id) {
    const container = document.getElementById(`delete-controls-${id}`);
    container.innerHTML = `
        <button onclick="mostrarConfirmacion(${id})"
            class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm flex items-center gap-1">
            <i class="fas fa-ban"></i> Inactivar
        </button>
    `;
}

async function mostrarModalInactivar(id) {
    try {
        // ✅ MOSTRAR LOADING AL CARGAR DATOS DEL EQUIPO
        mostrarLoadingEquipos(true);
        
        const res = await fetch(`${API_EQUIPOS}/${id}/completo`);
        if (!res.ok) throw new Error("Error al obtener datos del equipo");
        
        const equipo = await res.json();
        
        document.getElementById('equipo-id-inactivar').value = id;
        document.getElementById('info-equipo-inactivar').innerHTML = `
            <p><strong>Nombre:</strong> ${equipo.nombre}</p>
            <p><strong>Código:</strong> ${equipo.codigo_interno}</p>
            <p><strong>Ubicación:</strong> ${equipo.ubicacion === 'puesto' ? 
                `Puesto: ${equipo.puesto_codigo || '-'}` : 
                `Área: ${equipo.area_nombre || '-'}`}</p>
            <p><strong>Responsable:</strong> ${equipo.responsable_nombre || '-'}</p>
            <p><strong>Tipo:</strong> ${equipo.tipo_equipo_nombre || '-'}</p>
        `;
        
        document.getElementById('fecha-baja').valueAsDate = new Date();
        
        document.getElementById('modal-inactivar').classList.remove('hidden');
        
        // ✅ OCULTAR LOADING
        mostrarLoadingEquipos(false);
        
    } catch (err) {
        console.error("Error al cargar datos para inactivar:", err);
        mostrarLoadingEquipos(false);
        mostrarMensaje("❌ Error al cargar datos del equipo", true);
    }
}

function cerrarModalInactivar() {
    document.getElementById('modal-inactivar').classList.add('hidden');
    document.getElementById('form-inactivar').reset();
}

document.getElementById('form-inactivar').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('equipo-id-inactivar').value;
    const formData = {
        motivo: document.getElementById('motivo-baja').value,
        observaciones: document.getElementById('observaciones-baja').value,
        fecha_baja: document.getElementById('fecha-baja').value,
        realizado_por: document.getElementById('realizado-por').value.trim()
    };

    if (!formData.motivo || !formData.fecha_baja || !formData.realizado_por) {
        mostrarMensaje("❌ Complete todos los campos requeridos", true);
        return;
    }

    try {
        // ✅ MOSTRAR LOADING AL INACTIVAR
        mostrarLoadingEquipos(true);
        
        const res = await fetch(`${API_EQUIPOS}/${id}/inactivar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Error al inactivar equipo");
        }

        await generarPDFBaja(id, formData);

        mostrarMensaje("✅ Equipo inactivado correctamente y PDF generado");
        cerrarModalInactivar();
        
        // ✅ OCULTAR LOADING
        mostrarLoadingEquipos(false);
        
        // Recargar la lista después de un momento
        setTimeout(() => location.reload(), 2000);

    } catch (err) {
        console.error("Error al inactivar equipo:", err);
        mostrarLoadingEquipos(false);
        mostrarMensaje("❌ Error al inactivar equipo: " + err.message, true);
    }
});

async function generarPDFBaja(equipoId, datosBaja) {
    try {
        const res = await fetch(`${API_EQUIPOS}/${equipoId}/inactivo-completo`);
        if (!res.ok) throw new Error("Error al obtener datos para PDF");
        
        const equipo = await res.json();
        
        const tieneEspecificaciones = Object.keys(equipo.campos_personalizados || {}).length > 0;
        const tieneHistorial = equipo.historial_mantenimientos && equipo.historial_mantenimientos.length > 0;
        const imagenEquipo = equipo.imagen_url || equipo.imagen || equipo.url_imagen;

        const ventanaPDF = window.open('', '_blank');
        
        if (!ventanaPDF) {
            mostrarMensaje("⚠️ El navegador bloqueó la ventana emergente. Por favor, permite ventanas emergentes para este sitio.", true);
            return;
        }

        const contenidoPDF = `...`; // Tu HTML del PDF completo aquí

        ventanaPDF.document.write(contenidoPDF);
        ventanaPDF.document.close();
        
        setTimeout(() => {
            if (ventanaPDF && !ventanaPDF.closed) {
                ventanaPDF.focus();
                ventanaPDF.print();
            }
        }, 1000);

    } catch (err) {
        console.error("Error al generar PDF:", err);
        mostrarMensaje("⚠️ Equipo inactivado, pero hubo un error al generar el PDF", true);
    }
}

function eliminarEquipo(id) {
    mostrarModalInactivar(id);
}

// ========================= FUNCIONES AUXILIARES MEJORADAS =========================

// ✅ FUNCIÓN MEJORADA: Mostrar skeleton en lugar de overlay negro
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
                        <div class="flex justify-center gap-2">
                            <div class="h-8 bg-gray-200 rounded w-12"></div>
                            <div class="h-8 bg-gray-200 rounded w-12"></div>
                            <div class="h-8 bg-gray-200 rounded w-16"></div>
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

// ✅ FUNCIÓN MEJORADA: Mostrar mensajes más bonitos
function mostrarMensaje(texto, esError = false) {
    let mensaje = document.getElementById("mensaje-equipos");
    if (!mensaje) {
        mensaje = document.createElement("div");
        mensaje.id = "mensaje-equipos";
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

// ✅ FUNCIÓN: Actualizar título cuando la pestaña pierde foco
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        actualizarEstadoBotonNotificaciones();
        
        // Si hay notificaciones activas, verificar inmediatamente
        if (notificacionesActivas) {
            setTimeout(verificarYMostrarNotificaciones, 1000);
        }
    } else {
        // Limpiar título cuando la pestaña no está visible
        if (document.title.includes('⚠️')) {
            document.title = "Inventario IPS - Equipos";
        }
    }
});

// ========================= Hacer funciones disponibles globalmente =========================

window.mostrarConfirmacion = mostrarConfirmacion;
window.cancelarEliminacion = cancelarEliminacion;
window.eliminarEquipo = eliminarEquipo;
window.mostrarModalInactivar = mostrarModalInactivar;
window.cerrarModalInactivar = cerrarModalInactivar;
window.toggleNotificaciones = toggleNotificaciones;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;