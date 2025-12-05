// Constantes y variables globales
const API_URL = "https://inventario-api-gw73.onrender.com";
let todosLosMovimientos = [];
let movimientosFiltrados = [];
let sedes = [];
let usuarios = [];
let tiposMovimiento = [];
let equipos = [];

// Variables de paginación
let paginaActual = 1;
let itemsPorPagina = 20;
let totalPaginas = 1;

// Elementos DOM
const elementos = {
  tabCrear: document.getElementById('tab-crear'),
  tabListar: document.getElementById('tab-listar'),
  tabPendientes: document.getElementById('tab-pendientes'),
  contenidoCrear: document.getElementById('contenido-crear'),
  contenidoListar: document.getElementById('contenido-listar'),
  contenidoPendientes: document.getElementById('contenido-pendientes'),
  movimientoForm: document.getElementById('movimiento-form'),
  tablaMovimientos: document.getElementById('movimientos-table-body'),
  pendientesContent: document.getElementById('pendientes-content'),
  pendingCount: document.getElementById('pending-count')
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 Inicializando módulo de movimientos...');

    // Cargar datos del usuario
    cargarUsuario();

    // Cargar datos iniciales
    await cargarDatosIniciales();

    // Configurar eventos
    configurarEventos();

    // Mostrar pestaña inicial
    mostrarTab('crear');

    console.log('✅ Módulo de movimientos inicializado');
  } catch (error) {
    console.error('❌ Error inicializando:', error);
    mostrarMensaje('Error al inicializar el módulo', true);
  }
});

// Funciones principales
async function cargarDatosIniciales() {
  try {
    console.log('📥 Cargando datos iniciales...');

    // Cargar todos los datos en paralelo
    const [sedesRes, usuariosRes, tiposRes] = await Promise.all([
      fetch(`${API_URL}/sedes`),
      fetch(`${API_URL}/usuarios`),
      fetch(`${API_URL}/tipos-movimiento`)
    ]);

    // Procesar respuestas
    if (!sedesRes.ok) throw new Error('Error al cargar sedes');
    if (!usuariosRes.ok) throw new Error('Error al cargar usuarios');
    if (!tiposRes.ok) throw new Error('Error al cargar tipos de movimiento');

    sedes = await sedesRes.json();
    usuarios = await usuariosRes.json();
    tiposMovimiento = await tiposRes.json();

    // Cargar movimientos
    await cargarMovimientos();

    console.log('✅ Datos cargados:', {
      sedes: sedes.length,
      usuarios: usuarios.length,
      tiposMovimiento: tiposMovimiento.length,
      movimientos: todosLosMovimientos.length
    });

    // Inicializar selects
    inicializarSelects();

  } catch (error) {
    console.error('❌ Error cargando datos:', error);
    throw error;
  }
}

function inicializarSelects() {
  console.log('⚙️ Inicializando selects...');

  // Select de sedes
  const sedeSelect = document.getElementById('sede-select');
  const sedeDestinoSelect = document.getElementById('sede-destino-select');

  if (sedeSelect && sedeDestinoSelect) {
    sedeSelect.innerHTML = '<option value="">Seleccionar sede</option>' +
      sedes.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');

    sedeDestinoSelect.innerHTML = '<option value="">Seleccionar sede destino</option>' +
      sedes.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
  }

  // Select de tipos de movimiento
  const tipoSelect = document.getElementById('tipo-movimiento-select');
  if (tipoSelect) {
    tipoSelect.innerHTML = '<option value="">Seleccionar tipo</option>' +
      tiposMovimiento.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
  }

  // Select de responsables
  const responsableSelects = ['responsable-envio-select', 'responsable-recepcion-select'];
  responsableSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) {
      select.innerHTML = '<option value="">Seleccionar responsable</option>' +
        usuarios.map(u => `<option value="${u.id}">${u.nombre} (${u.documento}) - ${u.rol || 'Usuario'}</option>`).join('');
    }
  });

  console.log('✅ Selects inicializados');
}

function configurarEventos() {
  console.log('⚙️ Configurando eventos...');

  // Eventos de pestañas
  elementos.tabCrear.addEventListener('click', () => mostrarTab('crear'));
  elementos.tabListar.addEventListener('click', () => mostrarTab('listar'));
  elementos.tabPendientes.addEventListener('click', () => mostrarTab('pendientes'));

  // Evento para cambio de sede (cargar equipos)
  document.getElementById('sede-select')?.addEventListener('change', async function (e) {
    const sedeId = e.target.value;
    await cargarEquiposPorSede(sedeId);
  });

  // Evento para el formulario
  elementos.movimientoForm?.addEventListener('submit', crearMovimiento);

  // Evento para filtro de estado
  document.getElementById('filter-estado')?.addEventListener('change', filtrarMovimientos);

  // Evento para botón refresh
  document.getElementById('btn-refresh')?.addEventListener('click', async () => {
    await cargarMovimientos();
    mostrarMensaje('Movimientos actualizados');
  });

  // Eventos de paginación
  document.getElementById('btn-paginacion-anterior')?.addEventListener('click', () => cambiarPagina(paginaActual - 1));
  document.getElementById('btn-paginacion-siguiente')?.addEventListener('click', () => cambiarPagina(paginaActual + 1));
  document.getElementById('items-por-pagina')?.addEventListener('change', function () {
    itemsPorPagina = parseInt(this.value);
    paginaActual = 1;
    calcularPaginacion();
    renderizarTablaMovimientos();
  });

  console.log('✅ Eventos configurados');
}

async function cargarEquiposPorSede(sedeId) {
  console.log(`📦 Cargando equipos para sede ${sedeId}...`);

  const equipoSelect = document.getElementById('equipo-select');
  const detallesDiv = document.getElementById('equipo-details');

  if (!equipoSelect) return;

  if (!sedeId) {
    equipoSelect.innerHTML = '<option value="">Primero seleccione una sede</option>';
    equipoSelect.disabled = true;
    if (detallesDiv) detallesDiv.classList.add('hidden');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/equipos/sede/${sedeId}`);
    if (!response.ok) throw new Error('Error al cargar equipos');

    equipos = await response.json();

    console.log(`✅ Equipos cargados: ${equipos.length}`);

    if (equipos.length === 0) {
      equipoSelect.innerHTML = '<option value="">No hay equipos disponibles en esta sede</option>';
      equipoSelect.disabled = true;
      if (detallesDiv) detallesDiv.classList.add('hidden');
    } else {
      // Organizar equipos por tipo
      const equiposPorTipo = {};
      equipos.forEach(equipo => {
        const tipo = equipo.tipo_equipo_nombre || 'Sin tipo';
        if (!equiposPorTipo[tipo]) {
          equiposPorTipo[tipo] = [];
        }
        equiposPorTipo[tipo].push(equipo);
      });

      // Construir opciones agrupadas
      let optionsHTML = '<option value="">Seleccionar equipo</option>';

      for (const tipo in equiposPorTipo) {
        optionsHTML += `<optgroup label="${tipo}">`;

        equiposPorTipo[tipo].sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(equipo => {
          const responsableInfo = equipo.responsable_nombre ?
            ` (Responsable: ${equipo.responsable_nombre})` : '';
          optionsHTML += `<option value="${equipo.id}">${equipo.nombre} - ${equipo.codigo_interno || 'Sin código'}${responsableInfo}</option>`;
        });

        optionsHTML += '</optgroup>';
      }

      equipoSelect.innerHTML = optionsHTML;
      equipoSelect.disabled = false;

      // Configurar evento para mostrar detalles del equipo
      equipoSelect.addEventListener('change', function (e) {
        const equipoId = e.target.value;
        if (equipoId && detallesDiv) {
          const equipo = equipos.find(e => e.id == equipoId);
          if (equipo) {
            detallesDiv.innerHTML = `
              <div class="bg-gray-50 p-3 rounded border border-gray-200 animate-fade-in-up">
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p class="mb-1"><strong>Equipo:</strong> ${equipo.nombre}</p>
                    <p class="mb-1"><strong>Código:</strong> ${equipo.codigo_interno || 'No asignado'}</p>
                    <p class="mb-1"><strong>Tipo:</strong> ${equipo.tipo_equipo_nombre || 'No especificado'}</p>
                  </div>
                  <div>
                    <p class="mb-1"><strong>Área:</strong> ${equipo.area_nombre || 'No asignada'}</p>
                    <p class="mb-1"><strong>Responsable:</strong> ${equipo.responsable_nombre || 'No asignado'}</p>
                    <p class="mb-1"><strong>Documento:</strong> ${equipo.responsable_documento || 'No asignado'}</p>
                  </div>
                </div>
                ${equipo.descripcion ? `<p class="mt-2 text-xs text-gray-600"><strong>Descripción:</strong> ${equipo.descripcion.substring(0, 100)}${equipo.descripcion.length > 100 ? '...' : ''}</p>` : ''}
              </div>
            `;
            detallesDiv.classList.remove('hidden');
          }
        } else {
          detallesDiv.innerHTML = '';
          detallesDiv.classList.add('hidden');
        }
      });
    }

  } catch (error) {
    console.error('❌ Error cargando equipos:', error);
    equipoSelect.innerHTML = '<option value="">Error al cargar equipos</option>';
    equipoSelect.disabled = true;
    if (detallesDiv) detallesDiv.classList.add('hidden');
    mostrarMensaje('Error al cargar equipos de la sede', true);
  }
}

async function crearMovimiento(e) {
  e.preventDefault();
  console.log('📝 Creando movimiento...');

  const formData = new FormData(e.target);
  const movimientoData = {};

  // Convertir FormData a objeto
  for (const [key, value] of formData.entries()) {
    movimientoData[key] = value;
  }

  console.log('📊 Datos del movimiento:', movimientoData);

  // Validar campos requeridos
  const requiredFields = ['id_equipo', 'id_tipo_movimiento', 'id_sede_origen',
    'id_sede_destino', 'id_responsable_envio', 'id_responsable_recepcion', 'motivo', 'fecha_salida'];

  const fieldNames = {
    'id_equipo': 'equipo',
    'id_tipo_movimiento': 'tipo de movimiento',
    'id_sede_origen': 'sede origen',
    'id_sede_destino': 'sede destino',
    'id_responsable_envio': 'responsable de envío',
    'id_responsable_recepcion': 'responsable de recepción',
    'motivo': 'motivo',
    'fecha_salida': 'fecha de salida'
  };

  for (const field of requiredFields) {
    if (!movimientoData[field]) {
      mostrarMensaje(`El campo "${fieldNames[field]}" es requerido`, true);
      return;
    }
  }

  // Convertir valores numéricos
  movimientoData.id_equipo = parseInt(movimientoData.id_equipo);
  movimientoData.id_tipo_movimiento = parseInt(movimientoData.id_tipo_movimiento);
  movimientoData.id_sede_origen = parseInt(movimientoData.id_sede_origen);
  movimientoData.id_sede_destino = parseInt(movimientoData.id_sede_destino);
  movimientoData.id_responsable_envio = parseInt(movimientoData.id_responsable_envio);
  movimientoData.id_responsable_recepcion = parseInt(movimientoData.id_responsable_recepcion);

  // CORRECCIÓN: SOLUCIONAR PROBLEMA DE FECHA (ZONA HORARIA)
  // Asegurar que la fecha se envíe exactamente como la seleccionó el usuario
  const fechaInput = document.querySelector('input[name="fecha_salida"]');
  if (fechaInput) {
    // Usar el valor directamente del input, no del objeto
    movimientoData.fecha_salida = fechaInput.value;
  }

  console.log('📅 Fecha enviada a la API:', movimientoData.fecha_salida);

  // Agregar estado pendiente por defecto
  movimientoData.estado = 'pendiente';

  try {
    console.log('📤 Enviando datos a la API...');
    const response = await fetch(`${API_URL}/movimientos-equipos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(movimientoData)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Error de API:', responseData);
      throw new Error(responseData.error || 'Error al crear movimiento');
    }

    console.log('✅ Respuesta de API:', responseData);
    mostrarMensaje('✅ Movimiento creado exitosamente con estado PENDIENTE');

    // Limpiar formulario
    e.target.reset();

    // Limpiar detalles del equipo
    const detallesDiv = document.getElementById('equipo-details');
    if (detallesDiv) {
      detallesDiv.innerHTML = '';
      detallesDiv.classList.add('hidden');
    }

    // Resetear select de equipos
    const equipoSelect = document.getElementById('equipo-select');
    if (equipoSelect) {
      equipoSelect.innerHTML = '<option value="">Primero seleccione una sede</option>';
      equipoSelect.disabled = true;
    }

    // Recargar movimientos
    await cargarMovimientos();

    // Cambiar a la pestaña de listar
    mostrarTab('listar');

  } catch (error) {
    console.error('❌ Error creando movimiento:', error);
    mostrarMensaje(`❌ Error: ${error.message}`, true);
  }
}

async function cargarMovimientos() {
  try {
    console.log('📥 Cargando movimientos...');
    mostrarSkeletonTabla(true);

    const response = await fetch(`${API_URL}/movimientos-equipos`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al cargar movimientos');
    }

    todosLosMovimientos = await response.json();
    movimientosFiltrados = [...todosLosMovimientos];

    console.log(`✅ Movimientos cargados: ${todosLosMovimientos.length}`);

    calcularPaginacion();
    renderizarTablaMovimientos();
    actualizarContadorPendientes();

    mostrarSkeletonTabla(false);

  } catch (error) {
    console.error('❌ Error cargando movimientos:', error);
    mostrarMensaje('❌ Error al cargar movimientos', true);
    mostrarSkeletonTabla(false);
  }
}

function filtrarMovimientos() {
  const filtroEstado = document.getElementById('filter-estado').value;

  if (!filtroEstado) {
    movimientosFiltrados = [...todosLosMovimientos];
  } else {
    movimientosFiltrados = todosLosMovimientos.filter(m => m.estado === filtroEstado);
  }

  paginaActual = 1;
  calcularPaginacion();
  renderizarTablaMovimientos();
}

function renderizarTablaMovimientos() {
  const tbody = elementos.tablaMovimientos;
  if (!tbody) return;

  if (movimientosFiltrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-gray-500">
          <i class="fas fa-inbox text-4xl text-gray-300 mb-2"></i>
          <p>No hay movimientos registrados</p>
        </td>
      </tr>
    `;
    actualizarInfoPaginacion();
    actualizarControlesPaginacion();
    return;
  }

  // Calcular índices para la página actual
  const inicio = (paginaActual - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  const movimientosPagina = movimientosFiltrados.slice(inicio, fin);

  // Crear filas de la tabla
  tbody.innerHTML = movimientosPagina.map(mov => {
    // CORRECCIÓN: Formatear fecha localmente para evitar problemas de zona horaria
    let fechaSalida = 'N/A';
    if (mov.fecha_salida_formateada) {
      // Si ya viene formateada desde la API
      fechaSalida = mov.fecha_salida_formateada;
    } else if (mov.fecha_salida) {
      // Si viene como string, convertir a fecha local
      const fecha = new Date(mov.fecha_salida);
      fechaSalida = fecha.toLocaleDateString('es-ES');
    }

    return `
      <tr class="hover:bg-gray-50 transition-colors duration-200">
        <td class="px-4 py-3 border border-gray-200 font-mono text-sm">${mov.codigo_movimiento || 'N/A'}</td>
        <td class="px-4 py-3 border border-gray-200">
          <div class="font-medium text-[#0F172A]">${mov.equipo_nombre || 'N/A'}</div>
          <div class="text-xs text-gray-500">${mov.equipo_codigo || 'Sin código'}</div>
        </td>
        <td class="px-4 py-3 border border-gray-200">
          <div class="text-sm">${mov.sede_origen_nombre || 'N/A'}</div>
        </td>
        <td class="px-4 py-3 border border-gray-200">
          <div class="text-sm">${mov.sede_destino_nombre || 'N/A'}</div>
        </td>
        <td class="px-4 py-3 border border-gray-200 text-sm">${fechaSalida}</td>
        <td class="px-4 py-3 border border-gray-200">
          <span class="px-2 py-1 rounded-full text-xs font-bold ${getEstadoClass(mov.estado)}">
            ${getEstadoTexto(mov.estado)}
          </span>
        </td>
        <td class="px-4 py-3 border border-gray-200 text-center">
          <div class="flex justify-center gap-2 action-buttons">
            <button onclick="verDetallesMovimiento(${mov.id})" 
                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition flex items-center gap-1 text-sm"
                    title="Ver detalles">
              <i class="fas fa-eye text-xs"></i>
            </button>
            
            <!-- SOLO mostrar botón de enviar si está PENDIENTE -->
            ${mov.estado === 'pendiente' ? `
              <button onclick="actualizarEstado(${mov.id}, 'enviado')" 
                      class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded transition flex items-center gap-1 text-sm"
                      title="Marcar como enviado">
                <i class="fas fa-paper-plane text-xs"></i>
              </button>
              <button onclick="eliminarMovimiento(${mov.id})" 
                      class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition flex items-center gap-1 text-sm"
                      title="Eliminar movimiento">
                <i class="fas fa-trash text-xs"></i>
              </button>
            ` : ''}
            
            <!-- SOLO mostrar botón de recibido si está ENVIADO -->
            ${mov.estado === 'enviado' ? `
              <button onclick="actualizarEstado(${mov.id}, 'recibido')" 
                      class="bg-[#639A33] hover:bg-green-700 text-white px-3 py-1.5 rounded transition flex items-center gap-1 text-sm"
                      title="Marcar como recibido">
                <i class="fas fa-check text-xs"></i>
              </button>
            ` : ''}
            
            ${mov.estado === 'recibido' ? `
              <button onclick="generarDocumentoMovimiento(${mov.id})" 
                      class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded transition flex items-center gap-1 text-sm"
                      title="Generar documento PDF">
                <i class="fas fa-file-pdf text-xs"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  actualizarInfoPaginacion();
  actualizarControlesPaginacion();
}

function getEstadoClass(estado) {
  switch (estado) {
    case 'pendiente': return 'badge-pendiente';
    case 'enviado': return 'badge-enviado';
    case 'recibido': return 'badge-recibido';
    case 'cancelado': return 'badge-cancelado';
    default: return 'badge-pendiente';
  }
}

function getEstadoTexto(estado) {
  switch (estado) {
    case 'pendiente': return 'PENDIENTE';
    case 'enviado': return 'ENVIADO';
    case 'recibido': return 'RECIBIDO';
    case 'cancelado': return 'CANCELADO';
    default: return estado?.toUpperCase() || 'N/A';
  }
}

// Funciones de paginación
function calcularPaginacion() {
  totalPaginas = Math.max(1, Math.ceil(movimientosFiltrados.length / itemsPorPagina));

  if (paginaActual > totalPaginas) {
    paginaActual = totalPaginas;
  }
}

function cambiarPagina(nuevaPagina) {
  if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;

  paginaActual = nuevaPagina;
  renderizarTablaMovimientos();
}

function actualizarInfoPaginacion() {
  const info = document.getElementById('info-paginacion');
  if (info) {
    const inicio = Math.min((paginaActual - 1) * itemsPorPagina + 1, movimientosFiltrados.length);
    const fin = Math.min(paginaActual * itemsPorPagina, movimientosFiltrados.length);
    info.textContent = `Mostrando ${inicio}-${fin} de ${movimientosFiltrados.length} movimientos`;
  }
}

function actualizarControlesPaginacion() {
  const btnAnterior = document.getElementById('btn-paginacion-anterior');
  const btnSiguiente = document.getElementById('btn-paginacion-siguiente');
  const contenedorNumeros = document.getElementById('numeros-paginacion');

  if (btnAnterior) {
    btnAnterior.disabled = paginaActual === 1;
  }

  if (btnSiguiente) {
    btnSiguiente.disabled = paginaActual === totalPaginas;
  }

  if (contenedorNumeros) {
    contenedorNumeros.innerHTML = '';

    const maxNumeros = 5;
    let inicio = Math.max(1, paginaActual - Math.floor(maxNumeros / 2));
    let fin = Math.min(totalPaginas, inicio + maxNumeros - 1);

    if (fin - inicio + 1 < maxNumeros) {
      inicio = Math.max(1, fin - maxNumeros + 1);
    }

    for (let i = inicio; i <= fin; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = `px-3 py-1 mx-1 rounded text-sm ${i === paginaActual ? 'bg-[#639A33] text-white' : 'bg-gray-100 hover:bg-gray-200'}`;
      btn.addEventListener('click', () => cambiarPagina(i));
      contenedorNumeros.appendChild(btn);
    }
  }
}

async function cargarPendientes() {
  try {
    // Obtener usuario actual
    const userData = localStorage.getItem('currentUser');
    const currentUser = userData ? JSON.parse(userData) : null;
    
    // FILTRAR: SOLO movimientos ENVIADOS donde el usuario actual es responsable de recepción
    let pendientesParaRecepcion = [];
    
    if (currentUser) {
      pendientesParaRecepcion = todosLosMovimientos.filter(m => 
        m.estado === 'enviado' && 
        m.id_responsable_recepcion == currentUser.id
      );
    } else {
      pendientesParaRecepcion = todosLosMovimientos.filter(m => m.estado === 'enviado');
    }
    
    const content = elementos.pendientesContent;
    if (!content) return;
    
    if (pendientesParaRecepcion.length === 0) {
      content.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-check-circle text-4xl text-green-500 mb-3"></i>
          <p class="text-gray-600">No hay movimientos pendientes de recepción</p>
          ${currentUser ? `
            <p class="text-sm text-gray-500 mt-2">
              Los movimientos que estén "ENVIADOS" y tú seas el "responsable de recepción" aparecerán aquí
            </p>
          ` : ''}
        </div>
      `;
      return;
    }
    
    content.innerHTML = pendientesParaRecepcion.map(mov => {
      // Formatear fecha localmente
      let fechaSalida = 'No especificada';
      if (mov.fecha_salida_formateada) {
        fechaSalida = mov.fecha_salida_formateada;
      } else if (mov.fecha_salida) {
        const fecha = new Date(mov.fecha_salida);
        fechaSalida = fecha.toLocaleDateString('es-ES');
      }
      
      return `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 animate-fade-in-up">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h4 class="font-semibold text-blue-800">${mov.equipo_nombre || 'Equipo'}</h4>
                <span class="badge-enviado px-2 py-1 rounded-full text-xs font-bold">ENVIADO - PENDIENTE DE RECEPCIÓN</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <p class="text-blue-700">
                  <strong class="text-blue-800">Código movimiento:</strong> ${mov.codigo_movimiento || 'N/A'}
                </p>
                <p class="text-blue-700">
                  <strong class="text-blue-800">Fecha salida:</strong> ${fechaSalida}
                </p>
                <p class="text-blue-700">
                  <strong class="text-blue-800">De:</strong> ${mov.sede_origen_nombre || 'N/A'}
                </p>
                <p class="text-blue-700">
                  <strong class="text-blue-800">Para:</strong> ${mov.sede_destino_nombre || 'N/A'}
                </p>
                <p class="text-blue-700">
                  <strong class="text-blue-800">Envía:</strong> ${mov.responsable_envio_nombre || 'No asignado'}
                </p>
                <p class="text-blue-700 md:col-span-2">
                  <strong class="text-blue-800">Motivo:</strong> ${mov.motivo || 'No especificado'}
                </p>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <button onclick="verDetallesMovimiento(${mov.id})" 
                      class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded transition flex items-center gap-1 text-sm justify-center">
                <i class="fas fa-eye"></i> Ver detalles
              </button>
              <button onclick="actualizarEstado(${mov.id}, 'recibido')" 
                      class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded transition flex items-center gap-1 text-sm justify-center">
                <i class="fas fa-check-circle"></i> Confirmar recepción
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('❌ Error cargando pendientes:', error);
    elementos.pendientesContent.innerHTML = `
      <div class="text-center py-8 text-red-500">
        <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
        <p>Error al cargar movimientos pendientes</p>
      </div>
    `;
  }
}

function actualizarContadorPendientes() {
  if (elementos.pendingCount) {
    // Obtener usuario actual
    const userData = localStorage.getItem('currentUser');
    const currentUser = userData ? JSON.parse(userData) : null;

    // Contar SOLO movimientos ENVIADOS donde el usuario es responsable de recepción
    let pendientesParaRecepcion = [];
    
    if (currentUser) {
      pendientesParaRecepcion = todosLosMovimientos.filter(m => 
        m.estado === 'enviado' && 
        m.id_responsable_recepcion == currentUser.id
      );
    } else {
      pendientesParaRecepcion = todosLosMovimientos.filter(m => m.estado === 'enviado');
    }

    elementos.pendingCount.textContent = pendientesParaRecepcion.length;

    // Mostrar/ocultar contador
    if (pendientesParaRecepcion.length > 0) {
      elementos.pendingCount.classList.remove('hidden');
    } else {
      elementos.pendingCount.classList.add('hidden');
    }
  }
}

// NUEVA FUNCIÓN PARA CANCELAR MOVIMIENTO
async function cancelarMovimiento(id) {
  if (!confirm('¿Está seguro de cancelar este movimiento? Esta acción notificará al responsable de recepción.')) {
    return;
  }

  try {
    console.log(`❌ Cancelando movimiento ${id}...`);

    const response = await fetch(`${API_URL}/movimientos-equipos/${id}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estado: 'cancelado' })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Error de API:', responseData);
      throw new Error(responseData.error || 'Error al cancelar movimiento');
    }

    // Actualizar localmente el array de movimientos
    const index = todosLosMovimientos.findIndex(m => m.id == id);
    if (index !== -1) {
      todosLosMovimientos[index].estado = 'cancelado';
    }

    mostrarMensaje('✅ Movimiento cancelado exitosamente');

    // Recargar datos
    await cargarMovimientos();
    
    // Actualizar vista actual
    const tabActive = document.querySelector('.tab-movimientos.active');
    if (tabActive) {
      if (tabActive.id === 'tab-listar') {
        renderizarTablaMovimientos();
      } else if (tabActive.id === 'tab-pendientes') {
        cargarPendientes();
      }
    }

    // Actualizar contador de pendientes
    actualizarContadorPendientes();

  } catch (error) {
    console.error('❌ Error cancelando movimiento:', error);
    mostrarMensaje(`❌ Error: ${error.message}`, true);
  }
}

// FUNCIÓN PARA ACTUALIZAR ESTADO (ENVIADO O RECIBIDO)
async function actualizarEstado(id, nuevoEstado) {
  // Obtener el movimiento actual primero
  const movimiento = todosLosMovimientos.find(m => m.id == id);
  if (!movimiento) {
    mostrarMensaje('Movimiento no encontrado', true);
    return;
  }

  const mensajes = {
    'enviado': '¿Confirmar envío del equipo? El responsable de recepción será notificado.',
    'recibido': '¿Confirmar recepción del equipo? El responsable de envío será notificado.'
  };

  if (!confirm(mensajes[nuevoEstado] || `¿Confirmar cambio de estado a "${nuevoEstado}"?`)) return;

  try {
    console.log(`🔄 Actualizando estado del movimiento ${id} de ${movimiento.estado} a ${nuevoEstado}...`);

    const updateData = {
      estado: nuevoEstado
    };

    // Solo agregar fecha de recepción si es recibido
    if (nuevoEstado === 'recibido') {
      updateData.fecha_recepcion = new Date().toISOString().split('T')[0];
    }

    const response = await fetch(`${API_URL}/movimientos-equipos/${id}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Error de API:', responseData);
      throw new Error(responseData.error || 'Error al actualizar estado');
    }

    // Actualizar localmente el array de movimientos
    const index = todosLosMovimientos.findIndex(m => m.id == id);
    if (index !== -1) {
      todosLosMovimientos[index].estado = nuevoEstado;
      if (nuevoEstado === 'recibido') {
        todosLosMovimientos[index].fecha_recepcion = updateData.fecha_recepcion;
      }
    }

    const mensajeExito = {
      'enviado': '✅ Equipo marcado como ENVIADO. El responsable de recepción ha sido notificado.',
      'recibido': '✅ Equipo marcado como RECIBIDO. El responsable de envío ha sido notificado.'
    };

    mostrarMensaje(mensajeExito[nuevoEstado] || `Estado actualizado a ${nuevoEstado}`);

    // Recargar datos
    await cargarMovimientos();
    
    // Actualizar vista actual
    const tabActive = document.querySelector('.tab-movimientos.active');
    if (tabActive) {
      if (tabActive.id === 'tab-listar') {
        renderizarTablaMovimientos();
      } else if (tabActive.id === 'tab-pendientes') {
        cargarPendientes();
      }
    }

    // Actualizar contador de pendientes
    actualizarContadorPendientes();

  } catch (error) {
    console.error('❌ Error actualizando estado:', error);
    mostrarMensaje(`❌ Error: ${error.message}`, true);
  }
}

async function verDetallesMovimiento(id) {
  try {
    console.log(`👁️ Cargando detalles del movimiento ${id}...`);
    const response = await fetch(`${API_URL}/movimientos-equipos/${id}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al cargar detalles');
    }

    const movimiento = await response.json();
    console.log('📊 Detalles cargados:', movimiento);

    const contenido = document.getElementById('detalles-contenido');
    if (contenido) {
      // Formatear fechas localmente
      let fechaSalida = 'No especificada';
      if (movimiento.fecha_salida_formateada) {
        fechaSalida = movimiento.fecha_salida_formateada;
      } else if (movimiento.fecha_salida) {
        const fecha = new Date(movimiento.fecha_salida);
        fechaSalida = fecha.toLocaleDateString('es-ES');
      }

      let fechaRecepcion = 'Pendiente';
      if (movimiento.fecha_recepcion_formateada) {
        fechaRecepcion = movimiento.fecha_recepcion_formateada;
      } else if (movimiento.fecha_recepcion) {
        const fecha = new Date(movimiento.fecha_recepcion);
        fechaRecepcion = fecha.toLocaleDateString('es-ES');
      }

      contenido.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <p><strong class="text-[#0F172A]">Código movimiento:</strong> ${movimiento.codigo_movimiento || 'N/A'}</p>
            <p><strong class="text-[#0F172A]">Equipo:</strong> ${movimiento.equipo_nombre || 'N/A'}</p>
            <p><strong class="text-[#0F172A]">Tipo movimiento:</strong> ${movimiento.tipo_movimiento_nombre || 'N/A'}</p>
            <p><strong class="text-[#0F172A]">Estado:</strong> <span class="${getEstadoClass(movimiento.estado)} px-2 py-1 rounded-full text-xs">${getEstadoTexto(movimiento.estado)}</span></p>
          </div>
          <div class="space-y-2">
            <p><strong class="text-[#0F172A]">Sede Origen:</strong> ${movimiento.sede_origen_nombre || 'N/A'}</p>
            <p><strong class="text-[#0F172A]">Sede Destino:</strong> ${movimiento.sede_destino_nombre || 'N/A'}</p>
            <p><strong class="text-[#0F172A]">Fecha Salida:</strong> ${fechaSalida}</p>
            <p><strong class="text-[#0F172A]">Fecha Recepción:</strong> ${fechaRecepcion}</p>
          </div>
        </div>
        
        <div class="border-t pt-4">
          <p class="font-semibold text-[#0F172A] mb-2">Motivo:</p>
          <p class="text-gray-700 bg-gray-50 p-3 rounded">${movimiento.motivo || 'No especificado'}</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="font-semibold text-[#0F172A] mb-2">Responsable Envío:</p>
            <p class="text-gray-700">${movimiento.responsable_envio_nombre || 'No asignado'}</p>
            <p class="text-sm text-gray-500">${movimiento.responsable_envio_documento || ''}</p>
          </div>
          <div>
            <p class="font-semibold text-[#0F172A] mb-2">Responsable Recepción:</p>
            <p class="text-gray-700">${movimiento.responsable_recepcion_nombre || 'No asignado'}</p>
            <p class="text-sm text-gray-500">${movimiento.responsable_recepcion_documento || ''}</p>
          </div>
        </div>
        
        ${movimiento.observaciones ? `
        <div>
          <p class="font-semibold text-[#0F172A] mb-2">Observaciones:</p>
          <p class="text-gray-700 bg-gray-50 p-3 rounded">${movimiento.observaciones}</p>
        </div>
        ` : ''}
        
        ${movimiento.accesorios ? `
        <div>
          <p class="font-semibold text-[#0F172A] mb-2">Accesorios:</p>
          <p class="text-gray-700 bg-gray-50 p-3 rounded">${movimiento.accesorios}</p>
        </div>
        ` : ''}
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong class="text-[#0F172A]">Transporte:</strong> ${movimiento.transporte || 'No especificado'}</p>
            <p><strong class="text-[#0F172A]">Embalaje:</strong> ${movimiento.embalaje || 'No especificado'}</p>
          </div>
          <div>
            <p><strong class="text-[#0F172A]">Creado:</strong> ${movimiento.creado_en ? new Date(movimiento.creado_en).toLocaleDateString('es-ES') : 'N/A'}</p>
            <p><strong class="text-[#0F172A]">Condición:</strong> ${movimiento.condicion_salida || 'No especificada'}</p>
          </div>
        </div>
        
        <!-- Botones de acción según estado -->
        <div class="flex justify-end gap-2 pt-4 border-t">
          ${movimiento.estado === 'pendiente' ? `
            <button onclick="actualizarEstado(${movimiento.id}, 'enviado')"
                    class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-2">
              <i class="fas fa-paper-plane"></i> Marcar como Enviado
            </button>
            <button onclick="cancelarMovimiento(${movimiento.id})"
                    class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center gap-2">
              <i class="fas fa-times"></i> Cancelar Movimiento
            </button>
          ` : ''}
          
          ${movimiento.estado === 'enviado' ? `
            <button onclick="actualizarEstado(${movimiento.id}, 'recibido')"
                    class="px-4 py-2 bg-[#639A33] text-white rounded hover:bg-green-700 transition flex items-center gap-2">
              <i class="fas fa-check"></i> Marcar como Recibido
            </button>
          ` : ''}
          
          ${movimiento.estado === 'recibido' ? `
            <button onclick="generarDocumentoMovimiento(${movimiento.id})"
                    class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition flex items-center gap-2">
              <i class="fas fa-file-pdf"></i> Generar Documento PDF
            </button>
          ` : ''}
        </div>
      `;
    }

    document.getElementById('modal-detalles').classList.remove('hidden');

  } catch (error) {
    console.error('❌ Error cargando detalles:', error);
    mostrarMensaje('❌ Error al cargar detalles del movimiento', true);
  }
}


// FUNCIÓN PARA ELIMINAR MOVIMIENTO (OPCIONAL)
async function eliminarMovimiento(id) {
  if (!confirm('⚠️ ¿Está seguro de ELIMINAR este movimiento? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    console.log(`🗑️ Eliminando movimiento ${id}...`);

    const response = await fetch(`${API_URL}/movimientos-equipos/${id}`, {
      method: 'DELETE'
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Error de API:', responseData);
      throw new Error(responseData.error || 'Error al eliminar movimiento');
    }

    console.log('✅ Respuesta de API al eliminar:', responseData);

    // Remover del array de movimientos
    todosLosMovimientos = todosLosMovimientos.filter(m => m.id != id);
    movimientosFiltrados = movimientosFiltrados.filter(m => m.id != id);

    mostrarMensaje('✅ Movimiento eliminado exitosamente');

    // Recargar la vista
    renderizarTablaMovimientos();
    actualizarContadorPendientes();

  } catch (error) {
    console.error('❌ Error eliminando movimiento:', error);
    mostrarMensaje(`❌ Error: ${error.message}`, true);
  }
}


// Función para generar documento PDF del movimiento (mantén tu versión actual)
async function generarDocumentoMovimiento(id) {
    try {
    console.log(`📄 Generando documento para movimiento ${id}...`);
    mostrarMensaje('Generando documento PDF...');

    const response = await fetch(`${API_URL}/movimientos-equipos/${id}`);
    if (!response.ok) {
      throw new Error('Error al cargar datos del movimiento');
    }

    const movimiento = await response.json();

    // Abrir ventana para el PDF
    const ventanaPDF = window.open('', '_blank');
    if (!ventanaPDF) {
      mostrarMensaje('❌ Permite ventanas emergentes para generar el PDF', true);
      return;
    }

    const fechaActual = new Date();
    const fechaFormateada = fechaActual.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // CORRECCIÓN: Formatear fechas localmente
    let fechaSalida = 'No especificada';
    if (movimiento.fecha_salida_formateada) {
      fechaSalida = movimiento.fecha_salida_formateada;
    } else if (movimiento.fecha_salida) {
      const fecha = new Date(movimiento.fecha_salida);
      fechaSalida = fecha.toLocaleDateString('es-ES');
    }

    let fechaRecepcion = 'Pendiente';
    if (movimiento.fecha_recepcion_formateada) {
      fechaRecepcion = movimiento.fecha_recepcion_formateada;
    } else if (movimiento.fecha_recepcion) {
      const fecha = new Date(movimiento.fecha_recepcion);
      fechaRecepcion = fecha.toLocaleDateString('es-ES');
    }

    const tipoDocumento = movimiento.estado === 'recibido' ? 'ACTA DE RECEPCIÓN' : 'ACTA DE MOVIMIENTO';

    const contenidoHTML = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Documento de Movimiento - ${movimiento.codigo_movimiento}</title>
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
                  font-size: 13px;
                  line-height: 1.4;
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
                  font-size: 22px;
                  font-weight: 700;
                  margin-bottom: 3px;
                  color: white !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  line-height: 1.2;
              }
              
              .title-container .subtitle {
                  font-size: 13px;
                  font-weight: 400;
                  color: white !important;
                  opacity: 0.95;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  line-height: 1.2;
              }
              
              .document-info {
                  text-align: center;
                  padding: 10px 0;
                  background: #f8fafc;
                  border-bottom: 2px solid #e2e8f0;
              }
              
              .document-code {
                  font-size: 18px;
                  font-weight: 700;
                  color: #639A33;
                  letter-spacing: 1px;
              }
              
              .document-type {
                  font-size: 16px;
                  font-weight: 600;
                  color: #1e293b;
                  margin-top: 5px;
              }
              
              /* Contenido principal */
              .content {
                  padding: 20px;
              }
              
              .section {
                  margin-bottom: 15px;
                  background: white;
                  border-radius: 8px;
                  border: 1px solid #e2e8f0;
                  overflow: hidden;
              }
              
              .section-title {
                  background: #639A33 !important;
                  padding: 10px 15px;
                  font-weight: 600;
                  color: white !important;
                  font-size: 14px;
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
                  grid-template-columns: repeat(2, 1fr);
                  gap: 15px;
              }
              
              .info-item {
                  display: flex;
                  flex-direction: column;
                  padding: 5px 0;
              }
              
              .label {
                  font-weight: 600;
                  color: #475569;
                  font-size: 11px;
                  margin-bottom: 3px;
                  text-transform: uppercase;
              }
              
              .value {
                  font-weight: 500;
                  color: #1e293b;
                  font-size: 12px;
                  padding: 5px;
                  background: #f8fafc;
                  border-radius: 4px;
                  border: 1px solid #e2e8f0;
              }
              
              /* Tabla de información */
              .info-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 10px;
              }
              
              .info-table th {
                  background: #639A33 !important;
                  color: white !important;
                  padding: 8px;
                  text-align: left;
                  font-weight: 600;
                  font-size: 11px;
                  border-right: 1px solid #4a7a27;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
              }
              
              .info-table td {
                  padding: 8px;
                  border-bottom: 1px solid #e2e8f0;
                  border-right: 1px solid #e2e8f0;
                  color: #475569;
                  font-size: 12px;
              }
              
              .info-table tr:nth-child(even) {
                  background: #f8fafc;
              }
              
              /* Firmas */
              .signatures {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 30px;
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 2px dashed #cbd5e1;
              }
              
              .signature-box {
                  text-align: center;
              }
              
              .signature-line {
                  width: 80%;
                  height: 1px;
                  background: #1e293b;
                  margin: 40px auto 10px;
              }
              
              .signature-name {
                  font-weight: 600;
                  color: #1e293b;
                  font-size: 13px;
                  margin-top: 5px;
              }
              
              .signature-role {
                  font-size: 11px;
                  color: #64748b;
              }
              
              /* Footer */
              .footer {
                  margin-top: 20px;
                  padding: 15px;
                  background: #f8fafc;
                  border-top: 2px solid #639A33;
                  text-align: center;
              }
              
              .footer-content {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 10px;
                  margin-bottom: 10px;
              }
              
              .footer-item {
                  text-align: center;
              }
              
              .footer-item .label {
                  font-size: 10px;
                  color: #64748b;
              }
              
              .footer-item .value {
                  font-size: 11px;
                  color: #1e293b;
                  font-weight: 600;
                  background: none;
                  border: none;
                  padding: 0;
              }
              
              .copyright {
                  font-size: 10px;
                  color: #94a3b8;
                  margin-top: 10px;
                  padding-top: 10px;
                  border-top: 1px solid #e2e8f0;
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
                  }
                  
                  .page-container {
                      box-shadow: none;
                      min-height: 100vh;
                  }
                  
                  .header, .section-title, .info-table th {
                      background: #639A33 !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
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
                              <img src="../assets/logo_ips.png" alt="Logo IPS Progresando" />
                          </div>
                      </div>
                      
                      <div class="title-container">
                          <h1>IPS PROGRESANDO EN SALUD</h1>
                          <div class="subtitle">Sistema de Gestión de Movimientos de Equipos</div>
                      </div>
                  </div>
              </div>
              
              <!-- Información del documento -->
              <div class="document-info">
                  <div class="document-code">${movimiento.codigo_movimiento || 'N/A'}</div>
                  <div class="document-type">${tipoDocumento}</div>
                  <div style="font-size: 12px; color: #64748b; margin-top: 5px;">
                      Generado: ${fechaFormateada}
                  </div>
              </div>
              
              <!-- Contenido principal -->
              <div class="content">
                  <!-- Información del movimiento -->
                  <div class="section">
                      <div class="section-title">
                          <i class="fas fa-info-circle"></i>
                          INFORMACIÓN DEL MOVIMIENTO
                      </div>
                      <div class="section-content">
                          <table class="info-table">
                              <tr>
                                  <th>Equipo</th>
                                  <td>${movimiento.equipo_nombre || 'N/A'}</td>
                                  <th>Código Equipo</th>
                                  <td>${movimiento.equipo_codigo || 'N/A'}</td>
                              </tr>
                              <tr>
                                  <th>Tipo Movimiento</th>
                                  <td>${movimiento.tipo_movimiento_nombre || 'N/A'}</td>
                                  <th>Estado</th>
                                  <td>${getEstadoTexto(movimiento.estado)}</td>
                              </tr>
                              <tr>
                                  <th>Sede Origen</th>
                                  <td>${movimiento.sede_origen_nombre || 'N/A'}</td>
                                  <th>Sede Destino</th>
                                  <td>${movimiento.sede_destino_nombre || 'N/A'}</td>
                              </tr>
                              <tr>
                                  <th>Fecha Salida</th>
                                  <td>${fechaSalida}</td>
                                  <th>Fecha Recepción</th>
                                  <td>${fechaRecepcion}</td>
                              </tr>
                          </table>
                      </div>
                  </div>
                  
                  <!-- Responsables -->
                  <div class="section">
                      <div class="section-title">
                          <i class="fas fa-users"></i>
                          RESPONSABLES
                      </div>
                      <div class="section-content">
                          <div class="info-grid">
                              <div class="info-item">
                                  <span class="label">Responsable de Envío</span>
                                  <span class="value">${movimiento.responsable_envio_nombre || 'No asignado'}</span>
                              </div>
                              <div class="info-item">
                                  <span class="label">Documento</span>
                                  <span class="value">${movimiento.responsable_envio_documento || 'N/A'}</span>
                              </div>
                              <div class="info-item">
                                  <span class="label">Responsable de Recepción</span>
                                  <span class="value">${movimiento.responsable_recepcion_nombre || 'No asignado'}</span>
                              </div>
                              <div class="info-item">
                                  <span class="label">Documento</span>
                                  <span class="value">${movimiento.responsable_recepcion_documento || 'N/A'}</span>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  <!-- Información adicional -->
                  <div class="section">
                      <div class="section-title">
                          <i class="fas fa-clipboard-list"></i>
                          INFORMACIÓN ADICIONAL
                      </div>
                      <div class="section-content">
                          <div class="info-grid">
                              <div class="info-item">
                                  <span class="label">Motivo</span>
                                  <span class="value">${movimiento.motivo || 'No especificado'}</span>
                              </div>
                              <div class="info-item">
                                  <span class="label">Condición del Equipo</span>
                                  <span class="value">${movimiento.condicion_salida || 'Buena'}</span>
                              </div>
                              <div class="info-item">
                                  <span class="label">Transporte</span>
                                  <span class="value">${movimiento.transporte || 'Interno'}</span>
                              </div>
                              <div class="info-item">
                                  <span class="label">Embalaje</span>
                                  <span class="value">${movimiento.embalaje || 'Original'}</span>
                              </div>
                          </div>
                          
                          ${movimiento.observaciones ? `
                          <div class="info-item" style="grid-column: span 2;">
                              <span class="label">Observaciones</span>
                              <span class="value">${movimiento.observaciones}</span>
                          </div>
                          ` : ''}
                          
                          ${movimiento.accesorios ? `
                          <div class="info-item" style="grid-column: span 2;">
                              <span class="label">Accesorios Entregados</span>
                              <span class="value">${movimiento.accesorios}</span>
                          </div>
                          ` : ''}
                          
                          ${movimiento.compromiso_retorno ? `
                          <div class="info-item" style="grid-column: span 2;">
                              <span class="label">Compromiso de Retorno</span>
                              <span class="value">${movimiento.compromiso_retorno}</span>
                          </div>
                          ` : ''}
                      </div>
                  </div>
                  
                  <!-- Firmas -->

              <!-- Footer -->
              <div class="footer">
                  <div class="footer-content">
                      <div class="footer-item">
                          <div class="label">Fecha de generación</div>
                          <div class="value">${fechaFormateada}</div>
                      </div>
                      <div class="footer-item">
                          <div class="label">Hora de generación</div>
                          <div class="value">${fechaActual.toLocaleTimeString('es-ES')}</div>
                      </div>
                      <div class="footer-item">
                          <div class="label">Estado del movimiento</div>
                          <div class="value">${getEstadoTexto(movimiento.estado)}</div>
                      </div>
                  </div>
                  <div class="copyright">
                      © ${fechaActual.getFullYear()} IPS Progresando - Sistema de Gestión de Inventarios | Documento generado automáticamente
                  </div>
              </div>
          </div>
      </body>
      </html>
    `;

    ventanaPDF.document.write(contenidoHTML);
    ventanaPDF.document.close();

    // Esperar a que el PDF se cargue completamente antes de imprimir
    setTimeout(() => {
      if (ventanaPDF && !ventanaPDF.closed) {
        ventanaPDF.focus();
        ventanaPDF.print();
        mostrarMensaje('✅ Documento PDF generado correctamente');
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Error generando documento:', error);
    mostrarMensaje('Error al generar documento PDF', true);
  }
}

// Funciones auxiliares
function mostrarTab(tabName) {
  console.log(`📑 Cambiando a pestaña: ${tabName}`);

  // Ocultar todos los contenidos
  elementos.contenidoCrear.classList.add('hidden');
  elementos.contenidoListar.classList.add('hidden');
  elementos.contenidoPendientes.classList.add('hidden');

  // Remover clase active de todas las pestañas
  elementos.tabCrear.classList.remove('active');
  elementos.tabListar.classList.remove('active');
  elementos.tabPendientes.classList.remove('active');

  // Mostrar contenido seleccionado
  if (tabName === 'crear') {
    elementos.contenidoCrear.classList.remove('hidden');
    elementos.tabCrear.classList.add('active');
  } else if (tabName === 'listar') {
    elementos.contenidoListar.classList.remove('hidden');
    elementos.tabListar.classList.add('active');
    cargarMovimientos();
  } else if (tabName === 'pendientes') {
    elementos.contenidoPendientes.classList.remove('hidden');
    elementos.tabPendientes.classList.add('active');
    cargarPendientes();
  }
}

function cargarUsuario() {
  try {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const user = JSON.parse(userData);
      document.getElementById('user-name').textContent = user.nombre || 'Usuario';
      
      // CORRECCIÓN: Mostrar rol con primera letra mayúscula
      const rol = user.rol || 'Técnico';
      const rolFormateado = rol.charAt(0).toUpperCase() + rol.slice(1).toLowerCase();
      document.getElementById('user-role').textContent = rolFormateado;

      // Pre-seleccionar usuario actual en responsable de envío
      const responsableSelect = document.getElementById('responsable-envio-select');
      if (responsableSelect && user.id) {
        setTimeout(() => {
          const option = responsableSelect.querySelector(`option[value="${user.id}"]`);
          if (option) {
            responsableSelect.value = user.id;
          }
        }, 500);
      }
    }
  } catch (error) {
    console.error('Error cargando usuario:', error);
  }
}

function mostrarSkeletonTabla(mostrar) {
  const tbody = elementos.tablaMovimientos;
  if (!tbody) return;

  if (mostrar) {
    tbody.innerHTML = `
      ${Array.from({ length: 5 }).map(() => `
        <tr class="animate-pulse">
          <td class="px-4 py-3 border border-gray-200"><div class="h-4 bg-gray-200 rounded w-24"></div></td>
          <td class="px-4 py-3 border border-gray-200"><div class="h-4 bg-gray-200 rounded w-32"></div></td>
          <td class="px-4 py-3 border border-gray-200"><div class="h-4 bg-gray-200 rounded w-28"></div></td>
          <td class="px-4 py-3 border border-gray-200"><div class="h-4 bg-gray-200 rounded w-28"></div></td>
          <td class="px-4 py-3 border border-gray-200"><div class="h-4 bg-gray-200 rounded w-20"></div></td>
          <td class="px-4 py-3 border border-gray-200"><div class="h-4 bg-gray-200 rounded w-24"></div></td>
          <td class="px-4 py-3 border border-gray-200"><div class="h-4 bg-gray-200 rounded w-28"></div></td>
        </tr>
      `).join('')}
    `;
  }
}

function mostrarMensaje(texto, esError = false) {
  // Crear o actualizar elemento de mensaje
  let mensaje = document.getElementById('mensaje-flotante');
  if (!mensaje) {
    mensaje = document.createElement('div');
    mensaje.id = 'mensaje-flotante';
    mensaje.className = 'fixed top-4 right-4 z-50 animate-slide-in';
    document.body.appendChild(mensaje);
  }

  const bgColor = esError ? 'bg-red-100 border-red-300 text-red-700' : 'bg-green-100 border-green-300 text-green-700';
  const icon = esError ? '❌' : '✅';

  mensaje.innerHTML = `
    <div class="${bgColor} border rounded-lg p-4 shadow-lg max-w-sm">
      <div class="flex items-center">
        <div class="mr-3 text-xl">${icon}</div>
        <div>
          <p class="font-medium">${texto}</p>
          <div class="h-1 w-full mt-2 ${esError ? 'bg-red-500' : 'bg-green-500'} rounded-full animate-progress"></div>
        </div>
      </div>
    </div>
  `;

  // Auto-remover después de 4 segundos
  setTimeout(() => {
    if (mensaje.parentNode) {
      mensaje.style.opacity = '0';
      mensaje.style.transform = 'translateX(100%)';
      mensaje.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (mensaje.parentNode) mensaje.remove();
      }, 300);
    }
  }, 4000);
}

function cerrarModalDetalles() {
  document.getElementById('modal-detalles').classList.add('hidden');
}

// Hacer funciones disponibles globalmente
window.verDetallesMovimiento = verDetallesMovimiento;
window.actualizarEstado = actualizarEstado;
window.cancelarMovimiento = cancelarMovimiento;
window.cerrarModalDetalles = cerrarModalDetalles;
window.generarDocumentoMovimiento = generarDocumentoMovimiento;

// Función de animación para el progreso del mensaje
const style = document.createElement('style');
style.textContent = `
  @keyframes progress {
    0% { width: 100%; }
    100% { width: 0%; }
  }
  .animate-progress {
    animation: progress 4s linear forwards;
  }
`;
document.head.appendChild(style);