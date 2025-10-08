const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";
const API_TIPOS_EQUIPO = "https://inventario-api-gw73.onrender.com/tipos-equipo";

// Variables globales
let todosLosEquipos = [];
let equiposFiltrados = [];
let tiposEquipoDisponibles = [];
let notificacionInterval = null;
let ultimaNotificacion = null;

// ✅ CARGAR ESTADO DESDE localStorage - SI NO EXISTE, POR DEFECTO ES true (activadas)
let notificacionesActivas = localStorage.getItem('notificacionesActivas') !== 'false';

// Al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // ✅ ACTUALIZAR BOTÓN INMEDIATAMENTE CON EL ESTADO GUARDADO
    actualizarEstadoBotonNotificaciones();
    
    // Solicitar permisos de notificación al cargar la página
    await inicializarNotificaciones();
    
    // Cargar equipos y tipos de equipo en paralelo
    const [equiposRes, tiposRes] = await Promise.all([
      fetch(API_EQUIPOS),
      fetch(API_TIPOS_EQUIPO)
    ]);

    if (!equiposRes.ok) throw new Error("Error al obtener equipos");
    if (!tiposRes.ok) throw new Error("Error al obtener tipos de equipo");

    todosLosEquipos = await equiposRes.json();
    tiposEquipoDisponibles = await tiposRes.json();
    equiposFiltrados = [...todosLosEquipos];

    if (todosLosEquipos.length === 0) {
      document.getElementById("tablaEquipos").innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-gray-500">
            No hay equipos registrados
          </td>
        </tr>
      `;
    } else {
      // Mostrar alertas de mantenimiento primero
      mostrarAlertasMantenimiento(todosLosEquipos);
      
      // Configurar eventos de filtros y cargar tipos
      configurarEventosFiltros();
      cargarTiposEquipoEnFiltro();
      
      // Renderizar tabla inicial
      renderizarTablaEquipos();
      actualizarContador();
      
      // ✅ INICIAR O NO MONITOREO SEGÚN ESTADO GUARDADO
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
  }
});

// ========================= SISTEMA DE NOTIFICACIONES PERSISTENTE =========================

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

// ✅ FUNCIÓN QUE FALTABA: Obtener equipos con problemas
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

// ✅ FUNCIÓN QUE FALTABA: Determinar estado real del mantenimiento
function determinarEstadoMantenimientoReal(equipo) {
  // Si no tiene mantenimientos configurados, es "SIN_DATOS"
  if (!equipo.mantenimientos_configurados || equipo.mantenimientos_configurados.length === 0) {
    return "SIN_DATOS";
  }

  const hoy = new Date();
  let estado = "OK"; // Por defecto asumimos que está al día

  // Revisar todos los mantenimientos del equipo
  equipo.mantenimientos_configurados.forEach(mant => {
    if (mant.proxima_fecha) {
      const proxima = new Date(mant.proxima_fecha);
      const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
      
      // Si hay al menos UN mantenimiento vencido, el estado general es VENCIDO
      if (diffDias <= 0) {
        estado = "VENCIDO";
        return; // Salir del forEach temprano
      }
      // Si hay al menos UN mantenimiento próximo (y no hay vencidos), el estado es PRÓXIMO
      else if (diffDias <= 10 && estado !== "VENCIDO") {
        estado = "PRÓXIMO";
      }
    }
  });

  return estado;
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

// ✅ FUNCIÓN QUE FALTABA: Generar clave única para notificación
function generarKeyNotificacion(equiposConProblemas) {
  return equiposConProblemas
    .map(eq => `${eq.id}-${determinarEstadoMantenimientoReal(eq)}`)
    .sort()
    .join('|');
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

// ... (EL RESTO DEL CÓDIGO SE MANTIENE IGUAL, SIN CAMBIOS)
// [Las funciones de filtros, tabla, inactivación, etc. permanecen igual]
// ========================= FUNCIONES EXISTENTES (MANTENIDAS) =========================

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
  // Eventos para búsqueda en tiempo real
  const filtrosInput = [
    'filtro-codigo', 'filtro-nombre', 'filtro-sede', 
    'filtro-area', 'filtro-responsable'
  ];
  
  filtrosInput.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', aplicarFiltros);
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

// Función para aplicar todos los filtros
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

  renderizarTablaEquipos();
  actualizarContador();
}

// FUNCIÓN NUEVA: Determinar estado real del mantenimiento
function determinarEstadoMantenimientoReal(equipo) {
  // Si no tiene mantenimientos configurados, es "SIN_DATOS"
  if (!equipo.mantenimientos_configurados || equipo.mantenimientos_configurados.length === 0) {
    return "SIN_DATOS";
  }

  const hoy = new Date();
  let estado = "OK"; // Por defecto asumimos que está al día

  // Revisar todos los mantenimientos del equipo
  equipo.mantenimientos_configurados.forEach(mant => {
    if (mant.proxima_fecha) {
      const proxima = new Date(mant.proxima_fecha);
      const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
      
      // Si hay al menos UN mantenimiento vencido, el estado general es VENCIDO
      if (diffDias <= 0) {
        estado = "VENCIDO";
        return; // Salir del forEach temprano
      }
      // Si hay al menos UN mantenimiento próximo (y no hay vencidos), el estado es PRÓXIMO
      else if (diffDias <= 10 && estado !== "VENCIDO") {
        estado = "PRÓXIMO";
      }
    }
  });

  return estado;
}

// Función para limpiar todos los filtros
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
  renderizarTablaEquipos();
  actualizarContador();
}

// Función para actualizar el contador de resultados
function actualizarContador() {
  const contador = document.getElementById('contador-resultados');
  if (contador) {
    contador.textContent = equiposFiltrados.length;
  }
}

// Función para mostrar alertas de mantenimiento en la página
function mostrarAlertasMantenimiento(equipos) {
  const hoy = new Date();
  const equiposConMantenimientoProximo = [];
  const equiposConMantenimientoVencido = [];
  const equiposSinConfiguracion = [];

  equipos.forEach(equipo => {
    const estado = determinarEstadoMantenimientoReal(equipo);
    
    if (estado === "VENCIDO") {
      // Para equipos vencidos, encontrar el mantenimiento más urgente
      const mantenimientoVencido = equipo.mantenimientos_configurados?.find(mant => {
        if (mant.proxima_fecha) {
          const proxima = new Date(mant.proxima_fecha);
          const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
          return diffDias <= 0;
        }
        return false;
      });
      
      if (mantenimientoVencido) {
        const diffDias = Math.ceil((new Date(mantenimientoVencido.proxima_fecha) - hoy) / (1000 * 60 * 60 * 24));
        equiposConMantenimientoVencido.push({
          equipo: equipo,
          mantenimiento: mantenimientoVencido,
          dias: diffDias
        });
      }
    } else if (estado === "PRÓXIMO") {
      // Para equipos próximos, encontrar el mantenimiento más cercano
      const mantenimientoProximo = equipo.mantenimientos_configurados?.find(mant => {
        if (mant.proxima_fecha) {
          const proxima = new Date(mant.proxima_fecha);
          const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
          return diffDias > 0 && diffDias <= 10;
        }
        return false;
      });
      
      if (mantenimientoProximo) {
        const diffDias = Math.ceil((new Date(mantenimientoProximo.proxima_fecha) - hoy) / (1000 * 60 * 60 * 24));
        equiposConMantenimientoProximo.push({
          equipo: equipo,
          mantenimiento: mantenimientoProximo,
          dias: diffDias
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

// Función para renderizar la tabla de equipos (ACTUALIZADA)
function renderizarTablaEquipos() {
  const tbody = document.getElementById("tablaEquipos");
  tbody.innerHTML = "";

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

  equiposFiltrados.forEach(eq => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-100 transition";
    
    // Determinar información de ubicación completa
    let ubicacionCompleta = "";
    if (eq.ubicacion === "puesto") {
      ubicacionCompleta = `
        <div class="text-sm">
          <div class="font-medium">💼 Puesto: ${eq.puesto_codigo || "-"}</div>
          <div class="text-gray-600">🏢 Área: ${eq.area_nombre || "-"}</div>
          <div class="text-gray-500">📍 Sede: ${eq.sede_nombre || "-"}</div>
        </div>
      `;
    } else {
      ubicacionCompleta = `
        <div class="text-sm">
          <div class="font-medium">🏢 Área: ${eq.area_nombre || "-"}</div>
          <div class="text-gray-500">📍 Sede: ${eq.sede_nombre || "-"}</div>
        </div>
      `;
    }

    // Determinar responsable
    const responsable = eq.ubicacion === "puesto" 
      ? (eq.puesto_responsable || "-")
      : (eq.responsable_nombre ? `${eq.responsable_nombre} (${eq.responsable_documento || "-"})` : "-");

    // Determinar estado de mantenimiento REAL (CORREGIDO)
    const estadoReal = determinarEstadoMantenimientoReal(eq);
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

    tr.innerHTML = `
      <td class="px-4 py-2 border border-[#0F172A] font-mono text-sm">${eq.codigo_interno}</td>
      <td class="px-4 py-2 border border-[#0F172A] font-medium">${eq.nombre}</td>
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
          <button onclick="window.location.href='verEquipo.html?id=${eq.id}'"
            class="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm flex items-center gap-1">
            <i class="fas fa-eye"></i> Ver
          </button>
          <button onclick="window.location.href='editarEquipo.html?id=${eq.id}'"
            class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm flex items-center gap-1">
            <i class="fas fa-edit"></i> Editar
          </button>
          <div id="delete-controls-${eq.id}">
            <button onclick="mostrarConfirmacion(${eq.id})"
              class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm flex items-center gap-1">
              <i class="fas fa-ban"></i> Inactivar
            </button>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ========================= FUNCIONES DE INACTIVACIÓN =========================

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

// Función para generar PDF de baja - MEJORADA PARA MÚLTIPLES PÁGINAS
async function generarPDFBaja(equipoId, datosBaja) {
  try {
    // Obtener datos completos del equipo inactivo
    const res = await fetch(`${API_EQUIPOS}/${equipoId}/inactivo-completo`);
    if (!res.ok) throw new Error("Error al obtener datos para PDF");
    
    const equipo = await res.json();
    
    // Calcular contenido dinámicamente para evitar desbordamiento
    const tieneEspecificaciones = Object.keys(equipo.campos_personalizados || {}).length > 0;
    const tieneHistorial = equipo.historial_mantenimientos && equipo.historial_mantenimientos.length > 0;
    const tieneObservaciones = datosBaja.observaciones && datosBaja.observaciones.length > 0;
    
    // Crear contenido del PDF optimizado
    const contenidoPDF = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Baja de Equipo - ${equipo.codigo_interno}</title>
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
            font-size: 12px;
            line-height: 1.4;
          }
          
          .page-break {
            page-break-after: always;
            break-after: page;
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
            background: linear-gradient(135deg, #639A33 0%, #4a7a27 100%);
            color: white;
            padding: 15px 25px;
            position: relative;
            overflow: hidden;
            border-bottom: 3px solid #4a7a27;
          }
          
          .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            z-index: 2;
          }
          
          .logo-container {
            display: flex;
            align-items: center;
            flex-shrink: 0;
          }
          
          .logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
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
          }
          
          .title-container h1 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 5px;
            color: white;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          }
          
          .title-container .subtitle {
            font-size: 13px;
            font-weight: 400;
            opacity: 0.95;
            color: #f0f9ff;
          }
          
          .document-info {
            text-align: right;
            background: rgba(255, 255, 255, 0.15);
            padding: 12px 15px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            flex-shrink: 0;
          }
          
          .document-info .document-number {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 4px;
            color: white;
          }
          
          .document-info .document-date {
            font-size: 11px;
            opacity: 0.9;
            color: #f0f9ff;
          }
          
          /* Contenido principal - MEJOR DISTRIBUCIÓN */
          .content {
            padding: 20px 25px;
            min-height: 200mm;
          }
          
          .section {
            margin-bottom: 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            page-break-inside: avoid;
            border: 1px solid #e2e8f0;
          }
          
          .section-title {
            background: linear-gradient(135deg, #639A33 0%, #4a7a27 100%);
            padding: 12px 15px;
            font-weight: 600;
            color: white;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
            border-left: 4px solid #4a7a27;
          }
          
          .section-content {
            padding: 15px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
            font-size: 10px;
            margin-bottom: 2px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          
          .value {
            font-weight: 500;
            color: #1e293b;
            font-size: 11px;
            line-height: 1.3;
          }
          
          /* Tablas compactas */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 9px;
            border: 1px solid #e2e8f0;
          }
          
          th {
            background: #639A33;
            color: white;
            padding: 6px 5px;
            text-align: left;
            font-weight: 600;
            font-size: 8px;
            text-transform: uppercase;
            border-right: 1px solid #4a7a27;
          }
          
          th:last-child {
            border-right: none;
          }
          
          td {
            padding: 5px;
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
            color: #475569;
          }
          
          td:last-child {
            border-right: none;
          }
          
          tr:nth-child(even) {
            background: #f8fafc;
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
          
          /* Footer compacto */
          .footer {
            margin-top: 20px;
            padding: 15px 25px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-top: 2px solid #639A33;
            text-align: center;
          }
          
          .footer-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
            margin-bottom: 12px;
          }
          
          .footer-item {
            text-align: center;
          }
          
          .footer-item .label {
            font-size: 9px;
            color: #64748b;
            margin-bottom: 2px;
          }
          
          .footer-item .value {
            font-size: 10px;
            color: #1e293b;
            font-weight: 600;
          }
          
          .copyright {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
          }
          
          /* Utilidades para control de páginas */
          .avoid-break {
            page-break-inside: avoid;
          }
          
          .force-break {
            page-break-before: always;
          }
          
          .compact-section {
            margin-bottom: 12px;
          }
          
          .two-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          
          @media print {
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
              
              <div class="document-info">
                <div class="document-number">BAJA-${equipo.codigo_interno}</div>
                <div class="document-date">${new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
          
          <!-- Contenido principal MEJOR DISTRIBUIDO -->
          <div class="content">
            <div class="two-columns">
              <!-- Información de la baja -->
              <div class="section avoid-break compact-section">
                <div class="section-title">
                  <i class="fas fa-file-contract"></i>
                  INFORMACIÓN DE LA BAJA
                </div>
                <div class="section-content">
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="label">Fecha de baja</span>
                      <span class="value">${new Date(datosBaja.fecha_baja).toLocaleDateString()}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Motivo de baja</span>
                      <span class="value">${datosBaja.motivo}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Realizado por</span>
                      <span class="value">${datosBaja.realizado_por}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Código del equipo</span>
                      <span class="value">${equipo.codigo_interno}</span>
                    </div>
                  </div>
                  ${datosBaja.observaciones ? `
                  <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e2e8f0;">
                    <div class="label">Observaciones</div>
                    <div class="value" style="font-size: 10px; font-style: italic;">${datosBaja.observaciones}</div>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              <!-- Información del equipo -->
              <div class="section avoid-break compact-section">
                <div class="section-title">
                  <i class="fas fa-laptop-medical"></i>
                  INFORMACIÓN DEL EQUIPO
                </div>
                <div class="section-content">
                  <div class="info-grid">
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
            </div>
            
            <!-- Especificaciones técnicas (ocupa ancho completo) -->
            ${tieneEspecificaciones ? `
            <div class="section avoid-break" style="margin-top: 15px;">
              <div class="section-title">
                <i class="fas fa-cogs"></i>
                ESPECIFICACIONES TÉCNICAS
              </div>
              <div class="section-content">
                <div class="info-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                  ${Object.entries(equipo.campos_personalizados).slice(0, 8).map(([key, value]) => `
                    <div class="info-item">
                      <span class="label">${key}</span>
                      <span class="value">${value || 'No especificado'}</span>
                    </div>
                  `).join('')}
                </div>
                ${Object.keys(equipo.campos_personalizados).length > 8 ? `
                  <div style="margin-top: 8px; padding: 6px; background: #f8fafc; border-radius: 4px; text-align: center;">
                    <span style="font-size: 9px; color: #64748b;">
                      + ${Object.keys(equipo.campos_personalizados).length - 8} especificaciones adicionales
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
              © ${new Date().getFullYear()} IPS Progresando - Sistema de Gestión de Inventarios | Documento generado automáticamente
            </div>
          </div>
        </div>
        
        <!-- SEGUNDA PÁGINA SOLO SI HAY HISTORIAL -->
        ${tieneHistorial ? `
        <div class="page-container force-break">
          <div class="header">
            <div class="header-content">
              <div class="logo-container">
                <div class="logo">
                  <img src="../assets/LOGO-IPS-INCONTEC.png" alt="Logo IPS Progresando" />
                </div>
              </div>
              
              <div class="title-container">
                <h1>HISTORIAL DE MANTENIMIENTOS</h1>
                <div class="subtitle">Continuación - Equipo: ${equipo.codigo_interno}</div>
              </div>
              
              <div class="document-info">
                <div class="document-number">Página 2/2</div>
                <div class="document-date">${new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
          
          <div class="content">
            <div class="section">
              <div class="section-title">
                <i class="fas fa-history"></i>
                HISTORIAL DE MANTENIMIENTOS (${equipo.historial_mantenimientos.length})
              </div>
              <div class="section-content">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 15%">Fecha</th>
                      <th style="width: 20%">Tipo</th>
                      <th style="width: 45%">Descripción</th>
                      <th style="width: 20%">Realizado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${equipo.historial_mantenimientos.map(mant => `
                      <tr>
                        <td>${new Date(mant.fecha_realizado).toLocaleDateString()}</td>
                        <td>${mant.tipo_mantenimiento}</td>
                        <td>${mant.descripcion || 'Sin descripción'}</td>
                        <td>${mant.realizado_por || 'No especificado'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="copyright">
              © ${new Date().getFullYear()} IPS Progresando - Continuación del documento de baja | Página 2 de 2
            </div>
          </div>
        </div>
        ` : ''}
      </body>
      </html>
    `;

    // Crear ventana para imprimir
    const ventanaPDF = window.open('', '_blank');
    ventanaPDF.document.write(contenidoPDF);
    ventanaPDF.document.close();
    
    // Esperar a que cargue el contenido
    setTimeout(() => {
      ventanaPDF.print();
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

// Hacer funciones disponibles globalmente
window.mostrarConfirmacion = mostrarConfirmacion;
window.cancelarEliminacion = cancelarEliminacion;
window.eliminarEquipo = eliminarEquipo;
window.mostrarModalInactivar = mostrarModalInactivar;
window.cerrarModalInactivar = cerrarModalInactivar;
window.toggleNotificaciones = toggleNotificaciones;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;