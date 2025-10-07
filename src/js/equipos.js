const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";

// Variables globales
let todosLosEquipos = [];
let equiposFiltrados = [];

// Al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(API_EQUIPOS);
    if (!res.ok) throw new Error("Error al obtener equipos");

    todosLosEquipos = await res.json();
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
      
      // Intentar mostrar notificación del sistema
      mostrarNotificacionSistema(todosLosEquipos);
      
      // Configurar eventos de filtros
      configurarEventosFiltros();
      
      // Renderizar tabla inicial
      renderizarTablaEquipos();
      actualizarContador();
    }
  } catch (err) {
    console.error("Error cargando equipos:", err);
    mostrarMensaje("❌ Error al cargar los equipos", true);
  }
});

// Configurar eventos para los filtros
function configurarEventosFiltros() {
  // Eventos para búsqueda en tiempo real en algunos campos
  document.getElementById('filtro-codigo').addEventListener('input', aplicarFiltros);
  document.getElementById('filtro-nombre').addEventListener('input', aplicarFiltros);
  document.getElementById('filtro-sede').addEventListener('input', aplicarFiltros);
  document.getElementById('filtro-area').addEventListener('input', aplicarFiltros);
  document.getElementById('filtro-responsable').addEventListener('input', aplicarFiltros);
  document.getElementById('filtro-tipo').addEventListener('input', aplicarFiltros);
  
  // Eventos para selects
  document.getElementById('filtro-ubicacion').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-estado').addEventListener('change', aplicarFiltros);
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
  const filtroTipo = document.getElementById('filtro-tipo').value.toLowerCase().trim();

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

    // Filtro por estado de mantenimiento
    if (filtroEstado && equipo.estado_mantenimiento !== filtroEstado) {
      return false;
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

    // Filtro por tipo de equipo
    if (filtroTipo && (!equipo.tipo_equipo_nombre || !equipo.tipo_equipo_nombre.toLowerCase().includes(filtroTipo))) {
      return false;
    }

    return true;
  });

  renderizarTablaEquipos();
  actualizarContador();
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

// Función para mostrar notificaciones del sistema
function mostrarNotificacionSistema(equipos) {
  const equiposConProblemas = obtenerEquiposConProblemas(equipos);
  
  if (equiposConProblemas.length === 0) {
    document.title = "Inventario IPS - Equipos";
    return;
  }

  // Cambiar título de la pestaña para mostrar alerta
  document.title = `⚠️ (${equiposConProblemas.length}) - Inventario IPS`;

  // Notificaciones del navegador (si están permitidas)
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("⚠️ Mantenimientos Pendientes", {
      body: `${equiposConProblemas.length} equipo(s) necesitan atención inmediata`,
      icon: "../assets/Logo_ips.png",
      tag: "mantenimiento-alert"
    });
  }
}

// Función auxiliar para obtener equipos con problemas
function obtenerEquiposConProblemas(equipos) {
  const hoy = new Date();
  const equiposConProblemas = [];

  equipos.forEach(equipo => {
    if (equipo.mantenimientos_configurados && equipo.mantenimientos_configurados.length > 0) {
      const tieneProblemas = equipo.mantenimientos_configurados.some(mant => {
        if (mant.proxima_fecha) {
          const proxima = new Date(mant.proxima_fecha);
          const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
          return diffDias <= 10; // Próximos o vencidos
        }
        return false;
      });
      
      if (tieneProblemas) {
        equiposConProblemas.push(equipo);
      }
    }
  });

  return equiposConProblemas;
}

// Función para mostrar alertas de mantenimiento en la página
function mostrarAlertasMantenimiento(equipos) {
  const hoy = new Date();
  const equiposConMantenimientoProximo = [];
  const equiposConMantenimientoVencido = [];

  equipos.forEach(equipo => {
    if (equipo.mantenimientos_configurados && equipo.mantenimientos_configurados.length > 0) {
      equipo.mantenimientos_configurados.forEach(mant => {
        if (mant.proxima_fecha) {
          const proxima = new Date(mant.proxima_fecha);
          const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
          
          if (diffDias <= 0) {
            equiposConMantenimientoVencido.push({
              equipo: equipo,
              mantenimiento: mant,
              dias: diffDias
            });
          } else if (diffDias <= 10) {
            equiposConMantenimientoProximo.push({
              equipo: equipo,
              mantenimiento: mant,
              dias: diffDias
            });
          }
        }
      });
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

  alertasContainer.innerHTML = alertasHTML;
}

// Función para renderizar la tabla de equipos
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

    // Determinar estado de mantenimiento con ícono
    let estadoMantenimientoHTML = "";
    if (eq.estado_mantenimiento === "VENCIDO") {
      estadoMantenimientoHTML = `
        <div class="flex items-center justify-center text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          <span class="font-semibold">Mantenimiento Vencido</span>
        </div>
      `;
    } else if (eq.estado_mantenimiento === "PRÓXIMO") {
      estadoMantenimientoHTML = `
        <div class="flex items-center justify-center text-yellow-600 bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
          <i class="fas fa-clock mr-2"></i>
          <span class="font-semibold">Mantenimiento Próximo</span>
        </div>
      `;
    } else if (eq.estado_mantenimiento === "OK") {
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

// Función para solicitar permisos de notificación
function solicitarPermisosNotificacion() {
  if ("Notification" in window) {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        mostrarMensaje("✅ Notificaciones activadas - Serás alertado sobre mantenimientos pendientes");
        // Probar la notificación
        mostrarNotificacionSistema(todosLosEquipos);
      } else if (permission === "denied") {
        mostrarMensaje("❌ Notificaciones bloqueadas. Puedes activarlas en la configuración de tu navegador.", true);
      } else {
        mostrarMensaje("ℹ️ Las notificaciones no fueron activadas", true);
      }
    });
  } else {
    mostrarMensaje("❌ Tu navegador no soporta notificaciones del sistema", true);
  }
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

// Función para generar PDF de baja
async function generarPDFBaja(equipoId, datosBaja) {
  try {
    // Obtener datos completos del equipo inactivo
    const res = await fetch(`${API_EQUIPOS}/${equipoId}/inactivo-completo`);
    if (!res.ok) throw new Error("Error al obtener datos para PDF");
    
    const equipo = await res.json();
    
    // Crear contenido del PDF
    const contenidoPDF = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Baja de Equipo - ${equipo.codigo_interno}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section-title { background: #f0f0f0; padding: 8px; font-weight: bold; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
          .info-item { margin-bottom: 5px; }
          .label { font-weight: bold; color: #555; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ACTA DE BAJA DE EQUIPO</h1>
          <p>Inventario IPS - Sistema de Gestión</p>
        </div>

        <div class="section">
          <div class="section-title">INFORMACIÓN DE LA BAJA</div>
          <div class="info-grid">
            <div class="info-item"><span class="label">Fecha de baja:</span> ${new Date(datosBaja.fecha_baja).toLocaleDateString()}</div>
            <div class="info-item"><span class="label">Motivo:</span> ${datosBaja.motivo}</div>
            <div class="info-item"><span class="label">Realizado por:</span> ${datosBaja.realizado_por}</div>
            <div class="info-item"><span class="label">Código de equipo:</span> ${equipo.codigo_interno}</div>
          </div>
          ${datosBaja.observaciones ? `<div class="info-item"><span class="label">Observaciones:</span> ${datosBaja.observaciones}</div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">INFORMACIÓN DEL EQUIPO</div>
          <div class="info-grid">
            <div class="info-item"><span class="label">Nombre:</span> ${equipo.nombre}</div>
            <div class="info-item"><span class="label">Tipo:</span> ${equipo.tipo_equipo_nombre || '-'}</div>
            <div class="info-item"><span class="label">Ubicación:</span> ${equipo.ubicacion === 'puesto' ? `Puesto: ${equipo.puesto_codigo || '-'}` : `Área: ${equipo.area_nombre || '-'}`}</div>
            <div class="info-item"><span class="label">Responsable:</span> ${equipo.responsable_nombre || '-'}</div>
            <div class="info-item"><span class="label">Sede:</span> ${equipo.sede_nombre || '-'}</div>
            <div class="info-item"><span class="label">Descripción:</span> ${equipo.descripcion || '-'}</div>
          </div>
        </div>

        ${Object.keys(equipo.campos_personalizados || {}).length > 0 ? `
        <div class="section">
          <div class="section-title">ESPECIFICACIONES TÉCNICAS</div>
          <div class="info-grid">
            ${Object.entries(equipo.campos_personalizados).map(([key, value]) => `
              <div class="info-item"><span class="label">${key}:</span> ${value || '-'}</div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${equipo.historial_mantenimientos && equipo.historial_mantenimientos.length > 0 ? `
        <div class="section">
          <div class="section-title">HISTORIAL DE MANTENIMIENTOS</div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Realizado por</th>
              </tr>
            </thead>
            <tbody>
              ${equipo.historial_mantenimientos.map(mant => `
                <tr>
                  <td>${new Date(mant.fecha_realizado).toLocaleDateString()}</td>
                  <td>${mant.tipo_mantenimiento}</td>
                  <td>${mant.descripcion || '-'}</td>
                  <td>${mant.realizado_por || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>Documento generado automáticamente el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</p>
          <p>Inventario IPS - Todos los derechos reservados</p>
        </div>
      </body>
      </html>
    `;

    // Crear ventana para imprimir
    const ventanaPDF = window.open('', '_blank');
    ventanaPDF.document.write(contenidoPDF);
    ventanaPDF.document.close();
    
    // Esperar a que cargue el contenido y luego imprimir
    setTimeout(() => {
      ventanaPDF.print();
    }, 500);

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
window.solicitarPermisosNotificacion = solicitarPermisosNotificacion;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;