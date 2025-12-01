// src/js/equipos.js - VERSIÓN COMPLETA CON PAGINACIÓN Y TODAS LAS FUNCIONES ORIGINALES

const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";
const API_TIPOS_EQUIPO = "https://inventario-api-gw73.onrender.com/tipos-equipo";

// Variables globales ORIGINALES
let todosLosEquipos = [];
let equiposFiltrados = [];
let tiposEquipoDisponibles = [];
let notificacionInterval = null;
let ultimaNotificacion = null;

// ✅ CARGAR ESTADO DESDE localStorage - SI NO EXISTE, POR DEFECTO ES true (activadas)
let notificacionesActivas = localStorage.getItem('notificacionesActivas') !== 'false';

// ✅ AGREGADO: Variables para paginación
const ITEMS_POR_PAGINA = 20; // 20 equipos por página por defecto
let paginaActual = 1;
let totalPaginas = 1;
let itemsPorPagina = ITEMS_POR_PAGINA;

// ✅ AGREGADO: Elementos DOM para paginación
let elementosPaginacion = {
    contadorResultados: null,
    infoPaginacion: null,
    botonAnterior: null,
    botonSiguiente: null,
    contenedorNumeros: null,
    selectItemsPorPagina: null
};

// ========================= INICIALIZACIÓN CON PAGINACIÓN =========================

// Al cargar la página - VERSIÓN OPTIMIZADA
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // ✅ ACTUALIZAR BOTÓN INMEDIATAMENTE CON EL ESTADO GUARDADO
        actualizarEstadoBotonNotificaciones();
        
        // Solicitar permisos de notificación al cargar la página
        await inicializarNotificaciones();
        
        // ✅ INICIALIZAR PAGINACIÓN
        inicializarElementosPaginacion();
        
        // ✅ MOSTRAR ESPINNER DE CARGA
        mostrarCargando();
        
        // Cargar equipos y tipos de equipo en paralelo (COMO ORIGINAL)
        const [equiposRes, tiposRes] = await Promise.all([
            fetch(API_EQUIPOS),
            fetch(API_TIPOS_EQUIPO)
        ]);

        if (!equiposRes.ok) throw new Error("Error al obtener equipos");
        if (!tiposRes.ok) throw new Error("Error al obtener tipos de equipo");

        todosLosEquipos = await equiposRes.json();
        tiposEquipoDisponibles = await tiposRes.json();
        equiposFiltrados = [...todosLosEquipos];

        // ✅ OCULTAR ESPINNER
        ocultarCargando();

        if (todosLosEquipos.length === 0) {
            document.getElementById("tablaEquipos").innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-gray-500">
                        No hay equipos registrados
                    </td>
                </tr>
            `;
        } else {
            // Mostrar alertas de mantenimiento primero (COMO ORIGINAL)
            mostrarAlertasMantenimiento(todosLosEquipos);
            
            // ✅ CALCULAR PAGINACIÓN
            calcularPaginacion();
            
            // ✅ RENDERIZAR SOLO LA PÁGINA ACTUAL (más rápido)
            renderizarPaginaActual();
            
            // ✅ ACTUALIZAR CONTADOR Y PAGINACIÓN
            actualizarContador();
            actualizarControlesPaginacion();
            
            // Configurar eventos de filtros y cargar tipos (COMO ORIGINAL)
            configurarEventosFiltros();
            cargarTiposEquipoEnFiltro();
            
            // ✅ INICIAR O NO MONITOREO SEGÚN ESTADO GUARDADO (COMO ORIGINAL)
            if (notificacionesActivas) {
                iniciarMonitoreoNotificaciones();
            } else {
                // Asegurarse de que el título esté limpio si están desactivadas
                document.title = "Inventario IPS - Equipos";
            }
        }
    } catch (err) {
        console.error("Error cargando datos:", err);
        mostrarMensaje("❌ Error al cargar los datos", true);
        ocultarCargando();
    }
});

// ========================= SISTEMA DE PAGINACIÓN (NUEVO) =========================

function inicializarElementosPaginacion() {
    elementosPaginacion = {
        contadorResultados: document.getElementById('contador-resultados'),
        infoPaginacion: document.getElementById('info-paginacion'),
        botonAnterior: document.getElementById('btn-paginacion-anterior'),
        botonSiguiente: document.getElementById('btn-paginacion-siguiente'),
        contenedorNumeros: document.getElementById('numeros-paginacion'),
        selectItemsPorPagina: document.getElementById('items-por-pagina')
    };
    
    // Configurar eventos de paginación si los elementos existen
    if (elementosPaginacion.botonAnterior) {
        elementosPaginacion.botonAnterior.addEventListener('click', () => cambiarPagina(paginaActual - 1));
    }
    
    if (elementosPaginacion.botonSiguiente) {
        elementosPaginacion.botonSiguiente.addEventListener('click', () => cambiarPagina(paginaActual + 1));
    }
    
    if (elementosPaginacion.selectItemsPorPagina) {
        elementosPaginacion.selectItemsPorPagina.addEventListener('change', function() {
            itemsPorPagina = parseInt(this.value);
            paginaActual = 1;
            calcularPaginacion();
            renderizarPaginaActual();
            actualizarControlesPaginacion();
        });
    }
}

function calcularPaginacion() {
    totalPaginas = Math.ceil(equiposFiltrados.length / itemsPorPagina);
    if (totalPaginas === 0) totalPaginas = 1;
    
    // Asegurar que página actual sea válida
    if (paginaActual > totalPaginas) {
        paginaActual = totalPaginas;
    }
    
    // Actualizar información de paginación
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
    
    // Limpiar tabla
    tbody.innerHTML = '';
    
    // ✅ USAR DocumentFragment PARA RENDERIZADO MÁS RÁPIDO
    const fragment = document.createDocumentFragment();
    
    equiposPagina.forEach(eq => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-100 transition";
        tr.innerHTML = crearFilaEquipo(eq);
        fragment.appendChild(tr);
    });
    
    tbody.appendChild(fragment);
}

function crearFilaEquipo(equipo) {
    // MANTENGO EXACTAMENTE EL MISMO CÓDIGO ORIGINAL
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

    // Determinar estado de mantenimiento REAL (CORREGIDO)
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
    
    paginaActual = nuevaPagina;
    renderizarPaginaActual();
    actualizarControlesPaginacion();
    actualizarInfoPaginacion();
    
    // Scroll suave hacia la parte superior de la tabla
    const tablaContainer = document.querySelector('.table-container');
    if (tablaContainer) {
        tablaContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

// ========================= SISTEMA DE NOTIFICACIONES PERSISTENTE (ORIGINAL) =========================

// Inicializar sistema de notificaciones
async function inicializarNotificaciones() {
    // Verificar si el navegador soporta notificaciones
    if (!("Notification" in window)) {
        console.log("Este navegador no soporta notificaciones del sistema");
        return false;
    }

    // Si ya tenemos permisos, configurar el monitoreo
    if (Notification.permission === "granted") {
        console.log("✅ Notificaciones ya están activadas");
        return true;
    }
    
    // Si los permisos fueron denegados, no hacer nada
    if (Notification.permission === "denied") {
        console.log("❌ Notificaciones bloqueadas por el usuario");
        return false;
    }

    // Solicitar permisos automáticamente (sin esperar interacción del usuario)
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

// Iniciar monitoreo periódico de notificaciones
function iniciarMonitoreoNotificaciones() {
    // Limpiar intervalo anterior si existe
    if (notificacionInterval) {
        clearInterval(notificacionInterval);
    }

    // Verificar cada 5 minutos (300000 ms)
    notificacionInterval = setInterval(() => {
        verificarYMostrarNotificaciones();
    }, 300000);

    // También verificar inmediatamente al cargar
    setTimeout(verificarYMostrarNotificaciones, 2000);
}

// DETENER monitoreo de notificaciones
function detenerMonitoreoNotificaciones() {
    if (notificacionInterval) {
        clearInterval(notificacionInterval);
        notificacionInterval = null;
    }
    
    // ✅ LIMPIAR EL TÍTULO CUANDO SE DESACTIVAN
    document.title = "Inventario IPS - Equipos";
    console.log("🔕 Notificaciones desactivadas - Título limpiado");
}

// ✅ FUNCIÓN CORREGIDA: Determinar estado real del mantenimiento
function determinarEstadoMantenimientoReal(equipo) {
    // Si no tiene mantenimientos configurados, es "SIN_DATOS"
    if (!equipo.mantenimientos_configurados || equipo.mantenimientos_configurados.length === 0) {
        return "SIN_DATOS";
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizar a inicio del día
    
    let estado = "OK"; // Por defecto asumimos que está al día
    let mantenimientoMasUrgente = null;
    let diasMasUrgente = Infinity;

    // Revisar todos los mantenimientos del equipo
    equipo.mantenimientos_configurados.forEach(mant => {
        if (mant.proxima_fecha) {
            const proxima = new Date(mant.proxima_fecha);
            proxima.setHours(0, 0, 0, 0); // Normalizar a inicio del día
            
            const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
            
            // Si encontramos un mantenimiento más urgente, actualizamos
            if (diffDias < diasMasUrgente) {
                diasMasUrgente = diffDias;
                mantenimientoMasUrgente = mant;
            }
        }
    });

    // Determinar el estado basado en el mantenimiento más urgente
    if (diasMasUrgente < 0) {
        // Si hay días negativos, está VENCIDO
        estado = "VENCIDO";
    } else if (diasMasUrgente <= 30) {
        // ✅ MODIFICADO: Si está entre 0 y 30 días, está PRÓXIMO (1 mes)
        estado = "PRÓXIMO";
    } else if (diasMasUrgente === Infinity) {
        // Si no se encontraron mantenimientos con fechas
        estado = "SIN_DATOS";
    }
    // Si está más de 30 días en el futuro, se mantiene como "OK"

    return estado;
}

// ✅ FUNCIÓN CORREGIDA: Obtener equipos con problemas
function obtenerEquiposConProblemas(equipos) {
    const equiposConProblemas = [];

    equipos.forEach(equipo => {
        const estado = determinarEstadoMantenimientoReal(equipo);
        // Solo considerar equipos con mantenimientos configurados que estén vencidos o próximos
        if (estado === "VENCIDO" || estado === "PRÓXIMO") {
            equiposConProblemas.push(equipo);
        }
    });

    return equiposConProblemas;
}

// ✅ FUNCIÓN QUE FALTABA: Generar clave única para notificación
function generarKeyNotificacion(equiposConProblemas) {
    return equiposConProblemas
        .map(eq => `${eq.id}-${determinarEstadoMantenimientoReal(eq)}`)
        .sort()
        .join('|');
}

// Verificar y mostrar notificaciones si es necesario - CORREGIDO
function verificarYMostrarNotificaciones() {
    // ✅ VERIFICAR PRIMERO SI LAS NOTIFICACIONES ESTÁN DESACTIVADAS (CON PERSISTENCIA)
    if (!notificacionesActivas || !notificacionInterval) {
        document.title = "Inventario IPS - Equipos"; // ← LIMPIAR TÍTULO
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

    // ✅ SOLO ACTUALIZAR TÍTULO SI LAS NOTIFICACIONES ESTÁN ACTIVAS
    document.title = `⚠️ (${equiposConProblemas.length}) - Inventario IPS`;

    // Verificar si ya mostramos una notificación similar recientemente
    const ahora = new Date().getTime();
    const notificacionKey = generarKeyNotificacion(equiposConProblemas);
    
    if (ultimaNotificacion && 
        ultimaNotificacion.key === notificacionKey && 
        (ahora - ultimaNotificacion.timestamp) < 1800000) {
        console.log("Notificación similar ya mostrada recientemente, omitiendo...");
        return;
    }

    // Mostrar notificación del sistema
    mostrarNotificacionSistema(equiposConProblemas);
    
    // Guardar registro de la última notificación
    ultimaNotificacion = {
        key: notificacionKey,
        timestamp: ahora
    };
}

// Función para mostrar notificaciones del sistema
function mostrarNotificacionSistema(equiposConProblemas) {
    // ✅ VERIFICAR SI LAS NOTIFICACIONES ESTÁN ACTIVAS
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

    // Crear la notificación
    const notificacion = new Notification(titulo, {
        body: cuerpo,
        icon: "../assets/Logo_ips.png",
        tag: "mantenimiento-alert",
        requireInteraction: true,
        silent: false
    });

    // Al hacer clic en la notificación, enfocar la ventana
    notificacion.onclick = function() {
        window.focus();
        notificacion.close();
    };

    setTimeout(() => {
        notificacion.close();
    }, 10000);
}

// Función para que el usuario active/desactive notificaciones manualmente - CON PERSISTENCIA
function toggleNotificaciones() {
    if (Notification.permission === "granted") {
        if (notificacionesActivas) {
            // ✅ DESACTIVAR COMPLETAMENTE Y GUARDAR ESTADO
            notificacionesActivas = false;
            localStorage.setItem('notificacionesActivas', 'false'); // ← GUARDAR EN localStorage
            detenerMonitoreoNotificaciones();
            mostrarMensaje("🔕 Notificaciones desactivadas - El estado se guardará");
            actualizarEstadoBotonNotificaciones();
        } else {
            // ✅ ACTIVAR COMPLETAMENTE Y GUARDAR ESTADO
            notificacionesActivas = true;
            localStorage.setItem('notificacionesActivas', 'true'); // ← GUARDAR EN localStorage
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

// Función para actualizar el estado visual del botón
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

// También actualizar el botón cuando cambia la visibilidad de la página
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        actualizarEstadoBotonNotificaciones();
    }
});

// ========================= FUNCIONES EXISTENTES (MANTENIDAS - CON PAGINACIÓN) =========================

// Cargar tipos de equipo en el filtro
function cargarTiposEquipoEnFiltro() {
    const filtroTipo = document.getElementById('filtro-tipo');
    if (!filtroTipo) return;

    // Limpiar opciones existentes (excepto la primera)
    filtroTipo.innerHTML = '<option value="">Todos los tipos</option>';
    
    // Agregar tipos de equipo
    tiposEquipoDisponibles.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo.nombre;
        option.textContent = tipo.nombre;
        filtroTipo.appendChild(option);
    });
}

// Configurar eventos para los filtros
function configurarEventosFiltros() {
    // ✅ AGREGADO: Usar debounce para mejor rendimiento en tiempo real
    // Eventos para búsqueda en tiempo real
    const filtrosInput = [
        'filtro-codigo', 'filtro-nombre', 'filtro-sede', 
        'filtro-area', 'filtro-responsable'
    ];
    
    filtrosInput.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // Usar debounce para evitar múltiples renderizados rápidos
            element.addEventListener('input', debounce(aplicarFiltros, 300));
        }
    });
    
    // Eventos para selects
    const filtrosSelect = ['filtro-ubicacion', 'filtro-estado', 'filtro-tipo'];
    filtrosSelect.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', aplicarFiltros);
        }
    });
}

// ✅ FUNCIÓN DEBOUNCE PARA MEJOR RENDIMIENTO
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

// Función para aplicar todos los filtros - MODIFICADA PARA PAGINACIÓN
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
        // Filtro por código
        if (filtroCodigo && !equipo.codigo_interno.toLowerCase().includes(filtroCodigo)) {
            return false;
        }

        // Filtro por nombre
        if (filtroNombre && !equipo.nombre.toLowerCase().includes(filtroNombre)) {
            return false;
        }

        // Filtro por ubicación
        if (filtroUbicacion && equipo.ubicacion !== filtroUbicacion) {
            return false;
        }

        // Filtro por estado de mantenimiento (CORREGIDO)
        if (filtroEstado) {
            const estadoReal = determinarEstadoMantenimientoReal(equipo);
            if (estadoReal !== filtroEstado) {
                return false;
            }
        }

        // Filtro por sede
        if (filtroSede && (!equipo.sede_nombre || !equipo.sede_nombre.toLowerCase().includes(filtroSede))) {
            return false;
        }

        // Filtro por área
        if (filtroArea && (!equipo.area_nombre || !equipo.area_nombre.toLowerCase().includes(filtroArea))) {
            return false;
        }

        // Filtro por responsable
        if (filtroResponsable) {
            const responsable = equipo.ubicacion === "puesto" 
                ? (equipo.puesto_responsable || "").toLowerCase()
                : (equipo.responsable_nombre || "").toLowerCase();
            
            if (!responsable.includes(filtroResponsable)) {
                return false;
            }
        }

        // Filtro por tipo de equipo (CORREGIDO - ahora es select)
        if (filtroTipo && (!equipo.tipo_equipo_nombre || equipo.tipo_equipo_nombre !== filtroTipo)) {
            return false;
        }

        return true;
    });

    // ✅ REINICIAR A PÁGINA 1 AL APLICAR FILTROS
    paginaActual = 1;
    calcularPaginacion();
    renderizarPaginaActual();
    actualizarContador();
    actualizarControlesPaginacion();
}

// Función para limpiar todos los filtros - MODIFICADA PARA PAGINACIÓN
function limpiarFiltros() {
    document.getElementById('filtro-codigo').value = '';
    document.getElementById('filtro-nombre').value = '';
    document.getElementById('filtro-ubicacion').value = '';
    document.getElementById('filtro-estado').value = '';
    document.getElementById('filtro-sede').value = '';
    document.getElementById('filtro-area').value = '';
    document.getElementById('filtro-responsable').value = '';
    document.getElementById('filtro-tipo').value = '';
    
    equiposFiltrados = [...todosLosEquipos];
    
    // ✅ REINICIAR A PÁGINA 1 AL LIMPIAR FILTROS
    paginaActual = 1;
    calcularPaginacion();
    renderizarPaginaActual();
    actualizarContador();
    actualizarControlesPaginacion();
}

// Función para actualizar el contador de resultados
function actualizarContador() {
    const contador = document.getElementById('contador-resultados');
    if (contador) {
        contador.textContent = equiposFiltrados.length;
    }
}

// ✅ FUNCIÓN CORREGIDA: Mostrar alertas de mantenimiento en la página
function mostrarAlertasMantenimiento(equipos) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const equiposConMantenimientoProximo = [];
    const equiposConMantenimientoVencido = [];
    const equiposSinConfiguracion = [];

    equipos.forEach(equipo => {
        const estado = determinarEstadoMantenimientoReal(equipo);
        
        if (estado === "VENCIDO") {
            // Para equipos vencidos, encontrar el mantenimiento más urgente
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
            // Para equipos próximos, encontrar el mantenimiento más cercano
            let mantenimientoMasCercano = null;
            let diasMasCercano = Infinity;
            
            equipo.mantenimientos_configurados?.forEach(mant => {
                if (mant.proxima_fecha) {
                    const proxima = new Date(mant.proxima_fecha);
                    proxima.setHours(0, 0, 0, 0);
                    const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
                    
                    // ✅ MODIFICADO: Cambiado de 10 a 30 días
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

    // Alertas para mantenimientos vencidos
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

    // Alertas para mantenimientos próximos
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

    // Información sobre equipos sin configuración (solo informativo, no alerta)
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

// ========================= FUNCIONES DE INACTIVACIÓN (ORIGINALES) =========================

// Función para mostrar confirmación de eliminación
function mostrarConfirmacion(id) {
    const container = document.getElementById(`delete-controls-${id}`);
    container.innerHTML = `
        <div class="flex gap-1">
            <button onclick="eliminarEquipo(${id})" class="bg-red-700 text-white px-2 py-1 rounded text-sm">Sí</button>
            <button onclick="cancelarEliminacion(${id})" class="bg-gray-400 text-white px-2 py-1 rounded text-sm">No</button>
        </div>
    `;
}

// Función para cancelar eliminación
function cancelarEliminacion(id) {
    const container = document.getElementById(`delete-controls-${id}`);
    container.innerHTML = `
        <button onclick="mostrarConfirmacion(${id})"
            class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm flex items-center gap-1">
            <i class="fas fa-ban"></i> Inactivar
        </button>
    `;
}

// Función para mostrar modal de inactivación
async function mostrarModalInactivar(id) {
    try {
        // Obtener datos del equipo
        const res = await fetch(`${API_EQUIPOS}/${id}/completo`);
        if (!res.ok) throw new Error("Error al obtener datos del equipo");
        
        const equipo = await res.json();
        
        // Llenar información del equipo
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
        
        // Establecer fecha actual por defecto
        document.getElementById('fecha-baja').valueAsDate = new Date();
        
        // Mostrar modal
        document.getElementById('modal-inactivar').classList.remove('hidden');
        
    } catch (err) {
        console.error("Error al cargar datos para inactivar:", err);
        mostrarMensaje("❌ Error al cargar datos del equipo", true);
    }
}

// Función para cerrar modal
function cerrarModalInactivar() {
    document.getElementById('modal-inactivar').classList.add('hidden');
    document.getElementById('form-inactivar').reset();
}

// Función para inactivar equipo y generar PDF
document.getElementById('form-inactivar').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('equipo-id-inactivar').value;
    const formData = {
        motivo: document.getElementById('motivo-baja').value,
        observaciones: document.getElementById('observaciones-baja').value,
        fecha_baja: document.getElementById('fecha-baja').value,
        realizado_por: document.getElementById('realizado-por').value.trim()
    };

    // Validaciones
    if (!formData.motivo || !formData.fecha_baja || !formData.realizado_por) {
        mostrarMensaje("❌ Complete todos los campos requeridos", true);
        return;
    }

    try {
        // Inactivar equipo
        const res = await fetch(`${API_EQUIPOS}/${id}/inactivar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Error al inactivar equipo");
        }

        // Generar PDF
        await generarPDFBaja(id, formData);

        mostrarMensaje("✅ Equipo inactivado correctamente y PDF generado");
        cerrarModalInactivar();
        
        // Recargar la lista después de un momento
        setTimeout(() => location.reload(), 2000);

    } catch (err) {
        console.error("Error al inactivar equipo:", err);
        mostrarMensaje("❌ Error al inactivar equipo: " + err.message, true);
    }
});

// Función para generar PDF de baja
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

        // (Mantener el mismo contenido HTML del PDF original)
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

// Actualizar la función eliminarEquipo para usar el modal
function eliminarEquipo(id) {
    mostrarModalInactivar(id);
}

// ========================= FUNCIONES AUXILIARES (NUEVAS) =========================

function mostrarCargando() {
    // Crear o mostrar overlay de carga
    let overlay = document.getElementById('cargando-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'cargando-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        overlay.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-xl">
                <div class="flex items-center space-x-3">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#639A33]"></div>
                    <span class="text-lg font-medium">Cargando equipos...</span>
                </div>
                <p class="text-sm text-gray-600 mt-2">Por favor espera un momento</p>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        overlay.classList.remove('hidden');
    }
}

function ocultarCargando() {
    const overlay = document.getElementById('cargando-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// Función para mostrar mensajes
function mostrarMensaje(texto, esError = false) {
    let mensaje = document.getElementById("mensaje-equipos");
    if (!mensaje) {
        mensaje = document.createElement("div");
        mensaje.id = "mensaje-equipos";
        mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50";
        document.body.appendChild(mensaje);
    }

    mensaje.textContent = texto;
    mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${esError ? 'bg-red-100 text-red-800 border-l-4 border-red-500' : 'bg-green-100 text-green-800 border-l-4 border-green-500'}`;

    setTimeout(() => {
        mensaje.textContent = "";
        mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
    }, 4000);
}



// ========================= Hacer funciones disponibles globalmente =========================

window.mostrarConfirmacion = mostrarConfirmacion;
window.cancelarEliminacion = cancelarEliminacion;
window.eliminarEquipo = eliminarEquipo;
window.mostrarModalInactivar = mostrarModalInactivar;
window.cerrarModalInactivar = cerrarModalInactivar;
window.toggleNotificaciones = toggleNotificaciones;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;