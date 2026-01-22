// ==================== CONFIGURACIÓN CLOUDINARY (CORREGIDO) ====================
const CLOUDINARY_CONFIG = {
  cloudName: 'dzkccjhn9',
  uploadPreset: 'inventario'
};

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}`;
const CLOUDINARY_IMAGE_UPLOAD = `${CLOUDINARY_UPLOAD_URL}/image/upload`;
const CLOUDINARY_RAW_UPLOAD = `${CLOUDINARY_UPLOAD_URL}/raw/upload`;

// Constantes y variables globales
const API_URL = "https://inventario-api-gw73.onrender.com";
let todosLosMovimientos = [];
let movimientosFiltrados = [];
let sedes = [];
let usuarios = [];
let tiposMovimiento = [];
let equipos = [];

// Variables para cámara y firmas
let cameraManager = null;

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

// Resto del código JavaScript permanece igual...

// ========================= FUNCIONES AUXILIARES =========================

// Convertir Data URL a Blob
function dataURLToBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

// Formatear fecha
function formatearFecha(fechaString) {
  if (!fechaString) return 'No especificada';

  try {
    const fecha = new Date(fechaString);

    if (isNaN(fecha.getTime())) {
      const partes = fechaString.split('-');
      if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
      return 'Fecha inválida';
    }

    const dia = fecha.getUTCDate().toString().padStart(2, '0');
    const mes = (fecha.getUTCMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getUTCFullYear();

    return `${dia}/${mes}/${año}`;

  } catch (e) {
    console.error('Error formateando fecha:', e, 'Fecha original:', fechaString);
    return fechaString;
  }
}

// ========================= SUBIR ARCHIVOS A CLOUDINARY =========================

async function subirArchivoCloudinary(archivo, tipo = 'image') {
  try {
    console.log(`📤 Subiendo ${tipo}: ${archivo.name} (${(archivo.size / 1024).toFixed(2)}KB)`);

    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    
    // Configurar según el tipo
    if (tipo === 'image') {
      formData.append('resource_type', 'image');
      formData.append('folder', 'movimientos/imagenes');
    } else if (tipo === 'signature') {
      formData.append('resource_type', 'image');
      formData.append('folder', 'movimientos/firmas');
    } else if (tipo === 'pdf') {
      formData.append('resource_type', 'raw');
      formData.append('folder', 'movimientos/pdf');
    }

    const uploadUrl = tipo === 'pdf' ? CLOUDINARY_RAW_UPLOAD : CLOUDINARY_IMAGE_UPLOAD;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Error ${response.status}`);
    }

    const data = await response.json();

    console.log(`✅ ${tipo.toUpperCase()} subido exitosamente:`, {
      url: data.secure_url,
      public_id: data.public_id,
      nombre: data.original_filename
    });

    return {
      url: data.secure_url,
      public_id: data.public_id,
      nombre_original: data.original_filename || archivo.name,
      tamaño: data.bytes
    };

  } catch (error) {
    console.error(`❌ Error subiendo ${tipo}:`, error);
    throw error;
  }
}

// ========================= INICIALIZACIÓN COMPLETA =========================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 Inicializando módulo de movimientos...');

    // Cargar datos del usuario
    cargarUsuario();

    // Inicializar cámara y firmas
    inicializarCamaraYFirmas();

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

// ========================= INICIALIZAR CÁMARA Y FIRMAS =========================

function inicializarCamaraYFirmas() {
  console.log('📸 Inicializando cámara y firmas...');

  // Verificar si el navegador soporta la API de cámara
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    cameraManager = {
      stream: null,
      videoElement: null,

      async initialize(videoId) {
        try {
          this.videoElement = document.getElementById(videoId);
          if (!this.videoElement) {
            console.error('Elemento de video no encontrado:', videoId);
            return false;
          }

          this.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
          });

          this.videoElement.srcObject = this.stream;
          return true;
        } catch (error) {
          console.error('Error accediendo a la cámara:', error);
          return false;
        }
      },

      capturePhoto(canvasId) {
        if (!this.videoElement) return null;

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
          console.error('Canvas no encontrado:', canvasId);
          return null;
        }

        const context = canvas.getContext('2d');
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;

        context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/jpeg', 0.8);
      },

      stopCamera() {
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.videoElement) {
          this.videoElement.srcObject = null;
        }
      }
    };
  }

  console.log('✅ Cámara y firmas inicializadas');
}

// ========================= CARGAR DATOS INICIALES =========================

async function cargarDatosIniciales() {
  try {
    console.log('📥 Cargando datos iniciales...');

    const [sedesRes, usuariosRes, tiposRes] = await Promise.all([
      fetch(`${API_URL}/sedes`),
      fetch(`${API_URL}/usuarios`),
      fetch(`${API_URL}/tipos-movimiento`)
    ]);

    if (!sedesRes.ok) throw new Error('Error al cargar sedes');
    if (!usuariosRes.ok) throw new Error('Error al cargar usuarios');
    if (!tiposRes.ok) throw new Error('Error al cargar tipos de movimiento');

    sedes = await sedesRes.json();
    usuarios = await usuariosRes.json();
    tiposMovimiento = await tiposRes.json();

    // Cargar movimientos con ubicación actual
    await cargarMovimientosCompletos();

    console.log('✅ Datos cargados:', {
      sedes: sedes.length,
      usuarios: usuarios.length,
      tiposMovimiento: tiposMovimiento.length,
      movimientos: todosLosMovimientos.length
    });

    inicializarSelects();

  } catch (error) {
    console.error('❌ Error cargando datos:', error);
    throw error;
  }
}

// ========================= CARGAR MOVIMIENTOS COMPLETOS =========================

async function cargarMovimientosCompletos() {
  try {
    console.log('📥 Cargando movimientos completos...');
    mostrarSkeletonTabla(true);

    const response = await fetch(`${API_URL}/movimientos-equipos`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al cargar movimientos');
    }

    todosLosMovimientos = await response.json();

    // CORRECCIÓN: Obtener ubicación actual correctamente
    const movimientosConUbicacion = await Promise.all(
      todosLosMovimientos.map(async (mov) => {
        try {
          // 1. Primero intentar obtener la ubicación desde la tabla ubicaciones_equipos
          const ubicacionRes = await fetch(`${API_URL}/equipos/${mov.id_equipo}/ubicacion-actual`);

          if (ubicacionRes.ok) {
            const ubicacion = await ubicacionRes.json();
            if (ubicacion && ubicacion.sede_nombre) {
              mov.sede_actual_nombre = ubicacion.sede_nombre;
            } else {
              // 2. Si no hay ubicación registrada, usar el destino o estado del movimiento
              if (mov.estado === 'recibido') {
                mov.sede_actual_nombre = mov.sede_destino_nombre || 'N/A';
              } else if (mov.estado === 'enviado') {
                mov.sede_actual_nombre = `${mov.sede_destino_nombre} (En tránsito)`;
              } else if (mov.estado === 'pendiente') {
                mov.sede_actual_nombre = mov.sede_origen_nombre || 'N/A';
              } else {
                mov.sede_actual_nombre = mov.sede_destino_nombre || 'N/A';
              }
            }
          } else {
            // 3. Fallback basado en estado
            if (mov.estado === 'recibido') {
              mov.sede_actual_nombre = mov.sede_destino_nombre || 'N/A';
            } else if (mov.estado === 'enviado') {
              mov.sede_actual_nombre = `${mov.sede_destino_nombre} (En tránsito)`;
            } else {
              mov.sede_actual_nombre = mov.sede_origen_nombre || 'N/A';
            }
          }

          // Verificar documentos adjuntos
          mov.tiene_documentos = !!(mov.imagen_salida_url || mov.imagen_recepcion_url ||
            mov.firma_envio_url || mov.firma_recepcion_url);

          return mov;
        } catch (error) {
          console.error(`Error obteniendo ubicación para equipo ${mov.id_equipo}:`, error);

          // Fallback: usar sede destino si está recibido, si no, sede origen
          if (mov.estado === 'recibido') {
            mov.sede_actual_nombre = mov.sede_destino_nombre || 'N/A';
          } else {
            mov.sede_actual_nombre = mov.sede_origen_nombre || 'N/A';
          }

          return mov;
        }
      })
    );

    todosLosMovimientos = movimientosConUbicacion;
    movimientosFiltrados = [...todosLosMovimientos];

    console.log(`✅ Movimientos completos cargados: ${todosLosMovimientos.length}`);

    calcularPaginacion();
    renderizarTablaMovimientos();
    actualizarContadorPendientes();

    mostrarSkeletonTabla(false);

  } catch (error) {
    console.error('❌ Error cargando movimientos completos:', error);
    mostrarMensaje('❌ Error al cargar movimientos', true);
    mostrarSkeletonTabla(false);
  }
}

// ========================= INICIALIZAR SELECTS =========================

function inicializarSelects() {
  console.log('⚙️ Inicializando selects...');

  const sedeSelect = document.getElementById('sede-select');
  const sedeDestinoSelect = document.getElementById('sede-destino-select');

  if (sedeSelect && sedeDestinoSelect) {
    sedeSelect.innerHTML = '<option value="">Seleccionar sede</option>' +
      sedes.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');

    sedeDestinoSelect.innerHTML = '<option value="">Seleccionar sede destino</option>' +
      sedes.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
  }

  const tipoSelect = document.getElementById('tipo-movimiento-select');
  if (tipoSelect) {
    tipoSelect.innerHTML = '<option value="">Seleccionar tipo</option>' +
      tiposMovimiento.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
  }

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

// ========================= CONFIGURAR EVENTOS =========================

function configurarEventos() {
  console.log('⚙️ Configurando eventos...');

  elementos.tabCrear.addEventListener('click', () => mostrarTab('crear'));
  elementos.tabListar.addEventListener('click', () => mostrarTab('listar'));
  elementos.tabPendientes.addEventListener('click', () => mostrarTab('pendientes'));

  document.getElementById('sede-select')?.addEventListener('change', async function (e) {
    const sedeId = e.target.value;
    await cargarEquiposPorSede(sedeId);
  });

  elementos.movimientoForm?.addEventListener('submit', crearMovimiento);

  document.getElementById('filter-estado')?.addEventListener('change', filtrarMovimientos);

  document.getElementById('btn-refresh')?.addEventListener('click', async () => {
    await cargarMovimientosCompletos();
    mostrarMensaje('Movimientos actualizados');
  });

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

// ========================= CARGAR EQUIPOS POR SEDE =========================

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
      const equiposPorTipo = {};
      equipos.forEach(equipo => {
        const tipo = equipo.tipo_equipo_nombre || 'Sin tipo';
        if (!equiposPorTipo[tipo]) {
          equiposPorTipo[tipo] = [];
        }
        equiposPorTipo[tipo].push(equipo);
      });

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

// ========================= CREAR MOVIMIENTO =========================

async function crearMovimiento(e) {
  e.preventDefault();
  console.log('📝 Creando movimiento...');

  const formData = new FormData(e.target);
  const movimientoData = {};

  for (const [key, value] of formData.entries()) {
    movimientoData[key] = value;
  }

  console.log('📊 Datos del movimiento:', movimientoData);

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

  movimientoData.id_equipo = parseInt(movimientoData.id_equipo);
  movimientoData.id_tipo_movimiento = parseInt(movimientoData.id_tipo_movimiento);
  movimientoData.id_sede_origen = parseInt(movimientoData.id_sede_origen);
  movimientoData.id_sede_destino = parseInt(movimientoData.id_sede_destino);
  movimientoData.id_responsable_envio = parseInt(movimientoData.id_responsable_envio);
  movimientoData.id_responsable_recepcion = parseInt(movimientoData.id_responsable_recepcion);

  const fechaInput = document.querySelector('input[name="fecha_salida"]');
  if (fechaInput) {
    movimientoData.fecha_salida = fechaInput.value;
  }

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

    // Mostrar modal para adjuntar foto de salida
    const movimientoId = responseData.movimiento?.id || responseData.id;
    if (movimientoId) {
      setTimeout(() => {
        mostrarModalCamara('imagen_salida', movimientoId, 'Foto del equipo al salir');
      }, 1000);
    }

    // Limpiar formulario
    e.target.reset();

    const detallesDiv = document.getElementById('equipo-details');
    if (detallesDiv) {
      detallesDiv.innerHTML = '';
      detallesDiv.classList.add('hidden');
    }

    const equipoSelect = document.getElementById('equipo-select');
    if (equipoSelect) {
      equipoSelect.innerHTML = '<option value="">Primero seleccione una sede</option>';
      equipoSelect.disabled = true;
    }

    await cargarMovimientosCompletos();
    mostrarTab('listar');

  } catch (error) {
    console.error('❌ Error creando movimiento:', error);
    mostrarMensaje(`❌ Error: ${error.message}`, true);
  }
}

// ========================= MOSTRAR MODAL CÁMARA =========================

function mostrarModalCamara(tipo, movimientoId, titulo = '') {
  const modalHTML = `
    <div id="modal-camara" class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg w-full max-w-2xl">
        <div class="p-4 border-b flex justify-between items-center">
          <h3 class="text-lg font-semibold">${titulo || 'Capturar imagen'}</h3>
          <button onclick="cerrarModalCamara()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="p-4">
          <div class="flex flex-col items-center">
            ${tipo.includes('imagen') ? `
              <div id="camera-container" class="w-full">
                <video id="camera-preview" autoplay playsinline class="w-full h-64 bg-black rounded"></video>
                <canvas id="camera-canvas" class="hidden"></canvas>
              </div>
              <div class="mt-4">
                <button onclick="capturarFoto('${tipo}', ${movimientoId})" 
                        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <i class="fas fa-camera"></i> Capturar foto
                </button>
              </div>
            ` : `
              <div class="w-full mb-4">
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 text-center">
                  <p class="text-gray-600">Firma en el recuadro</p>
                </div>
                <canvas id="signature-canvas" 
                        class="border border-gray-300 w-full h-48 bg-white touch-none"></canvas>
              </div>
              <div class="flex gap-2 mt-4">
                <button onclick="limpiarFirma()" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                  Limpiar
                </button>
                <button onclick="guardarFirma('${tipo}', ${movimientoId})" 
                        class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  Guardar firma
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  if (tipo.includes('imagen')) {
    setTimeout(async () => {
      if (cameraManager) {
        const initialized = await cameraManager.initialize('camera-preview');
        if (!initialized) {
          mostrarMensaje('No se pudo acceder a la cámara', true);
          // Mostrar input de archivo alternativo
          const cameraContainer = document.getElementById('camera-container');
          if (cameraContainer) {
            cameraContainer.innerHTML = `
              <div class="text-center p-8">
                <i class="fas fa-camera-slash text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-600 mb-4">No se pudo acceder a la cámara</p>
                <input type="file" id="file-input" accept="image/*" capture="environment" 
                       class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                              file:rounded-full file:border-0 file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                <button onclick="subirFotoArchivo('${tipo}', ${movimientoId})" 
                        class="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Subir imagen
                </button>
              </div>
            `;
          }
        }
      }
    }, 100);
  } else {
    setTimeout(() => {
      inicializarCanvasFirma();
    }, 100);
  }
}

// ========================= CAPTURAR Y SUBIR FOTO =========================

async function capturarFoto(tipo, movimientoId) {
  try {
    if (!cameraManager) {
      mostrarMensaje('Cámara no disponible', true);
      return;
    }

    mostrarMensaje('📸 Capturando foto...');

    const photoData = cameraManager.capturePhoto('camera-canvas');

    if (!photoData) {
      mostrarMensaje('Error al capturar foto', true);
      return;
    }

    // Convertir data URL a Blob
    const blob = dataURLToBlob(photoData);
    const archivo = new File([blob], `foto_${tipo}_${movimientoId}_${Date.now()}.jpg`, {
      type: 'image/jpeg'
    });

    mostrarMensaje('📤 Subiendo foto a Cloudinary...');

    // Subir a Cloudinary
    const uploadResult = await subirArchivoCloudinary(archivo, 'image');

    // Guardar en la base de datos
    const response = await fetch(`${API_URL}/movimientos-equipos/${movimientoId}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: tipo,
        url: uploadResult.url,
        public_id: uploadResult.public_id,
        nombre_original: uploadResult.nombre_original
      })
    });

    if (response.ok) {
      mostrarMensaje('✅ Foto guardada en Cloudinary correctamente');
      cerrarModalCamara();

      // Actualizar el movimiento localmente
      const movimientoIndex = todosLosMovimientos.findIndex(m => m.id == movimientoId);
      if (movimientoIndex !== -1) {
        todosLosMovimientos[movimientoIndex][`${tipo}_url`] = uploadResult.url;
      }

      // Si es foto de salida, preguntar por firma de envío
      if (tipo === 'imagen_salida') {
        setTimeout(() => {
          mostrarModalCamara('firma_envio', movimientoId, 'Firma del responsable de envío');
        }, 1000);
      }
    } else {
      throw new Error('Error guardando foto en la base de datos');
    }
  } catch (error) {
    console.error('Error capturando y subiendo foto:', error);
    mostrarMensaje(`❌ Error: ${error.message}`, true);
  }
}

// ========================= INICIALIZAR CANVAS DE FIRMA =========================

function inicializarCanvasFirma() {
  const canvas = document.getElementById('signature-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  // Configurar canvas
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Limpiar canvas
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Eventos para mouse
  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
  });

  canvas.addEventListener('mouseup', () => isDrawing = false);
  canvas.addEventListener('mouseout', () => isDrawing = false);

  // Eventos para touch
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    isDrawing = true;
    [lastX, lastY] = [touch.clientX - rect.left, touch.clientY - rect.top];
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
  });

  canvas.addEventListener('touchend', () => isDrawing = false);
}

// ========================= GUARDAR Y SUBIR FIRMA =========================

async function guardarFirma(tipo, movimientoId) {
  try {
    const canvas = document.getElementById('signature-canvas');
    if (!canvas) {
      mostrarMensaje('Canvas de firma no encontrado', true);
      return;
    }

    // Verificar si hay firma
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const hasSignature = imageData.data.some(channel => channel !== 255);

    if (!hasSignature) {
      mostrarMensaje('Por favor, realice su firma primero', true);
      return;
    }

    const signatureData = canvas.toDataURL('image/png');

    mostrarMensaje('📤 Guardando firma en Cloudinary...');

    // Convertir a Blob
    const blob = dataURLToBlob(signatureData);
    const archivo = new File([blob], `firma_${tipo}_${movimientoId}_${Date.now()}.png`, {
      type: 'image/png'
    });

    // Subir a Cloudinary
    const uploadResult = await subirArchivoCloudinary(archivo, 'signature');

    // Guardar en la base de datos
    const response = await fetch(`${API_URL}/movimientos-equipos/${movimientoId}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: tipo,
        url: uploadResult.url,
        public_id: uploadResult.public_id,
        nombre_original: uploadResult.nombre_original
      })
    });

    if (response.ok) {
      mostrarMensaje('✅ Firma guardada en Cloudinary correctamente');
      cerrarModalCamara();

      // Actualizar el movimiento localmente
      const movimientoIndex = todosLosMovimientos.findIndex(m => m.id == movimientoId);
      if (movimientoIndex !== -1) {
        todosLosMovimientos[movimientoIndex][`${tipo}_url`] = uploadResult.url;
      }
    } else {
      throw new Error('Error guardando firma en la base de datos');
    }
  } catch (error) {
    console.error('Error guardando firma:', error);
    mostrarMensaje('❌ Error al guardar firma', true);
  }
}

// ========================= LIMPIAR FIRMA =========================

function limpiarFirma() {
  const canvas = document.getElementById('signature-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ========================= CERRAR MODAL CÁMARA =========================

function cerrarModalCamara() {
  if (cameraManager) {
    cameraManager.stopCamera();
  }

  const modal = document.getElementById('modal-camara');
  if (modal) {
    modal.remove();
  }
}

// ========================= SUBIR FOTO DESDE ARCHIVO =========================

async function subirFotoArchivo(tipo, movimientoId) {
  const fileInput = document.getElementById('file-input');
  if (!fileInput || !fileInput.files[0]) {
    mostrarMensaje('Seleccione una imagen primero', true);
    return;
  }

  try {
    const file = fileInput.files[0];
    
    mostrarMensaje('📤 Subiendo imagen a Cloudinary...');

    // Subir a Cloudinary
    const uploadResult = await subirArchivoCloudinary(file, 'image');

    // Guardar en la base de datos
    const response = await fetch(`${API_URL}/movimientos-equipos/${movimientoId}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: tipo,
        url: uploadResult.url,
        public_id: uploadResult.public_id,
        nombre_original: uploadResult.nombre_original
      })
    });

    if (response.ok) {
      mostrarMensaje('✅ Imagen subida a Cloudinary correctamente');
      cerrarModalCamara();
    } else {
      throw new Error('Error guardando imagen en la base de datos');
    }
  } catch (error) {
    console.error('Error subiendo imagen:', error);
    mostrarMensaje('❌ Error al subir imagen', true);
  }
}

// ========================= DESCARGAR ARCHIVO =========================

function descargarArchivo(url, nombreArchivo) {
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo || 'documento.pdf';
    link.target = '_blank';
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarMensaje('📥 Descargando archivo...');
  } catch (error) {
    console.error('Error descargando archivo:', error);
    // Fallback: abrir en nueva pestaña
    window.open(url, '_blank');
  }
}

// ========================= AMPLIAR IMAGEN =========================

function ampliarImagen(url, titulo) {
  if (!url) {
    mostrarMensaje('No hay imagen para mostrar', true);
    return;
  }

  // Crear modal mejorado
  const modalHTML = `
    <div id="modal-imagen-completa" class="fixed inset-0 bg-black bg-opacity-90 z-[100] flex flex-col items-center justify-center p-4">
      <div class="w-full max-w-6xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="bg-white rounded-t-lg p-4 flex justify-between items-center border-b">
          <h3 class="text-lg font-semibold text-[#0F172A]">${titulo}</h3>
          <div class="flex gap-2">
            <button onclick="descargarArchivo('${url}', '${titulo.replace(/\s+/g, '_')}.jpg')" 
                    class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1">
              <i class="fas fa-download"></i> Descargar
            </button>
            <button onclick="document.getElementById('modal-imagen-completa').remove()" 
                    class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded">
              <i class="fas fa-times"></i> Cerrar
            </button>
          </div>
        </div>
        
        <!-- Contenido de la imagen -->
        <div class="bg-black flex-1 overflow-hidden rounded-b-lg">
          <img src="${url}" 
               alt="${titulo}" 
               class="w-full h-full object-contain"
               id="imagen-ampliada"
               onload="console.log('Imagen cargada correctamente')"
               onerror="console.error('Error cargando imagen'); this.src='https://via.placeholder.com/800x600/cccccc/969696?text=Imagen+no+disponible'">
        </div>
        
        <!-- Controles -->
        <div class="mt-2 flex justify-center gap-4">
          <button onclick="document.getElementById('imagen-ampliada').style.transform = 'scale(1)'" 
                  class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
            <i class="fas fa-search-minus"></i> Normal
          </button>
          <button onclick="document.getElementById('imagen-ampliada').style.transform = 'scale(1.5)'" 
                  class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
            <i class="fas fa-search-plus"></i> Ampliar 1.5x
          </button>
          <button onclick="document.getElementById('imagen-ampliada').style.transform = 'scale(2)'" 
                  class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
            <i class="fas fa-search"></i> Ampliar 2x
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Remover modal anterior si existe
  const modalAnterior = document.getElementById('modal-imagen-completa');
  if (modalAnterior) {
    modalAnterior.remove();
  }
  
  // Agregar nuevo modal
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ========================= FILTRAR MOVIMIENTOS =========================

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

// ========================= RENDERIZAR TABLA DE MOVIMIENTOS =========================

function renderizarTablaMovimientos() {
  const tbody = elementos.tablaMovimientos;
  if (!tbody) return;

  if (movimientosFiltrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-gray-500">
          <i class="fas fa-inbox text-4xl text-gray-300 mb-2"></i>
          <p>No hay movimientos registrados</p>
        </td>
      </tr>
    `;
    actualizarInfoPaginacion();
    actualizarControlesPaginacion();
    return;
  }

  const inicio = (paginaActual - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  const movimientosPagina = movimientosFiltrados.slice(inicio, fin);

  tbody.innerHTML = movimientosPagina.map(mov => {
    let fechaSalida = 'N/A';
    if (mov.fecha_salida) {
      fechaSalida = formatearFecha(mov.fecha_salida);
    } else if (mov.fecha_salida_formateada) {
      fechaSalida = formatearFecha(mov.fecha_salida_formateada);
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
        <td class="px-4 py-3 border border-gray-200">
          <div class="text-sm font-medium">${mov.sede_actual_nombre || 'N/A'}</div>
          <div class="text-xs text-gray-500">Ubicación actual</div>
        </td>
        <td class="px-4 py-3 border border-gray-200">
          <div class="flex flex-col gap-1">
            <!-- Botón principal de detalles -->
            <button onclick="verDetallesMovimiento(${mov.id})" 
                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition flex items-center justify-center gap-1 text-sm w-full"
                    title="Ver detalles">
              <i class="fas fa-eye text-xs"></i>
              <span>Detalles</span>
            </button>
            
            <!-- Botones según estado -->
            ${mov.estado === 'pendiente' ? `
              <div class="flex gap-1">
                <button onclick="mostrarModalAdjuntos(${mov.id})" 
                        class="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-2 py-1.5 rounded transition flex items-center justify-center gap-1 text-xs"
                        title="Adjuntar documentos">
                  <i class="fas fa-paperclip"></i>
                </button>
                <button onclick="solicitarFirmaYEnviar(${mov.id})" 
                        class="flex-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded transition flex items-center justify-center gap-1 text-xs"
                        title="Marcar como enviado">
                  <i class="fas fa-paper-plane"></i>
                </button>
              </div>
            ` : ''}
            
            ${mov.estado === 'enviado' ? `
              <button onclick="solicitarFirmaYRecibir(${mov.id})" 
                      class="bg-[#639A33] hover:bg-green-700 text-white px-3 py-1.5 rounded transition flex items-center justify-center gap-1 text-sm w-full"
                      title="Marcar como recibido">
                <i class="fas fa-check text-xs"></i>
                <span>Recibir</span>
              </button>
            ` : ''}
            
            ${mov.estado === 'recibido' && mov.documento_pdf_url ? `
              <a href="${mov.documento_pdf_url}" target="_blank"
                 class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded transition flex items-center justify-center gap-1 text-sm w-full"
                 title="Ver PDF">
                <i class="fas fa-file-pdf text-xs"></i>
                <span>Ver PDF</span>
              </a>
            ` : ''}
            
            ${mov.estado === 'recibido' && !mov.documento_pdf_url ? `
              <button onclick="generarDocumentoMovimiento(${mov.id})" 
                      class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded transition flex items-center justify-center gap-1 text-sm w-full"
                      title="Generar PDF">
                <i class="fas fa-file-pdf text-xs"></i>
                <span>Generar PDF</span>
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

// ========================= MOSTRAR MODAL ADJUNTOS =========================

function mostrarModalAdjuntos(movimientoId) {
  const modalHTML = `
    <div id="modal-adjuntos" class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg w-full max-w-2xl">
        <div class="p-4 border-b flex justify-between items-center">
          <h3 class="text-lg font-semibold">Adjuntar documentos</h3>
          <button onclick="cerrarModalAdjuntos()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                 onclick="mostrarModalCamara('imagen_salida', ${movimientoId}, 'Foto del equipo al salir')">
              <div class="text-3xl text-blue-500 mb-2">
                <i class="fas fa-camera"></i>
              </div>
              <h4 class="font-medium mb-1">Foto del equipo (Salida)</h4>
              <p class="text-sm text-gray-600">Tome foto del equipo al salir</p>
            </div>
            
            <div class="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                 onclick="mostrarModalCamara('firma_envio', ${movimientoId}, 'Firma del responsable de envío')">
              <div class="text-3xl text-green-500 mb-2">
                <i class="fas fa-signature"></i>
              </div>
              <h4 class="font-medium mb-1">Firma responsable envío</h4>
              <p class="text-sm text-gray-600">Firma digital del remitente</p>
            </div>
            
            <div class="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                 onclick="mostrarModalCamara('imagen_recepcion', ${movimientoId}, 'Foto del equipo al recibir')">
              <div class="text-3xl text-yellow-500 mb-2">
                <i class="fas fa-camera"></i>
              </div>
              <h4 class="font-medium mb-1">Foto del equipo (Recepción)</h4>
              <p class="text-sm text-gray-600">Tome foto al recibir el equipo</p>
            </div>
            
            <div class="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                 onclick="mostrarModalCamara('firma_recepcion', ${movimientoId}, 'Firma del responsable de recepción')">
              <div class="text-3xl text-red-500 mb-2">
                <i class="fas fa-signature"></i>
              </div>
              <h4 class="font-medium mb-1">Firma responsable recepción</h4>
              <p class="text-sm text-gray-600">Firma digital del receptor</p>
            </div>
          </div>
          
          <div class="border-t pt-4">
            <h4 class="font-medium mb-2">Documentos ya subidos:</h4>
            <div id="lista-documentos-${movimientoId}" class="text-sm">
              <div class="text-gray-500 italic">Cargando...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Cargar documentos existentes
  cargarDocumentosExistente(movimientoId);
}

// ========================= CARGAR DOCUMENTOS EXISTENTES =========================

async function cargarDocumentosExistente(movimientoId) {
  try {
    const response = await fetch(`${API_URL}/movimientos-equipos/${movimientoId}/completo`);
    if (!response.ok) throw new Error('Error al cargar documentos');

    const movimiento = await response.json();
    const lista = document.getElementById(`lista-documentos-${movimientoId}`);

    if (!lista) return;

    let documentosHTML = '';
    
    // Documentos con imágenes (mostrar miniaturas)
    const documentosConImagen = [
      { 
        nombre: 'Foto al salir', 
        url: movimiento.imagen_salida_url, 
        icon: 'camera',
        tipo: 'imagen' 
      },
      { 
        nombre: 'Firma remitente', 
        url: movimiento.firma_envio_url, 
        icon: 'signature',
        tipo: 'imagen' 
      },
      { 
        nombre: 'Foto al recibir', 
        url: movimiento.imagen_recepcion_url, 
        icon: 'camera',
        tipo: 'imagen' 
      },
      { 
        nombre: 'Firma receptor', 
        url: movimiento.firma_recepcion_url, 
        icon: 'signature',
        tipo: 'imagen' 
      }
    ];

    // Documentos sin imágenes (solo enlaces)
    const documentosSinImagen = [
      { 
        nombre: 'Documento PDF', 
        url: movimiento.documento_pdf_url, 
        icon: 'file-pdf',
        tipo: 'pdf' 
      }
    ];

    // Procesar documentos con imágenes
    documentosConImagen.forEach(doc => {
      if (doc.url) {
        documentosHTML += `
          <div class="mb-3 p-3 bg-gray-50 rounded border">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <i class="fas fa-${doc.icon} text-gray-600"></i>
                <span class="font-medium">${doc.nombre}</span>
              </div>
              <div class="flex gap-2">
                <button onclick="ampliarImagen('${doc.url}', '${doc.nombre}')" 
                        class="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
                        title="Ver imagen">
                  <i class="fas fa-expand"></i> Ampliar
                </button>
                <a href="${doc.url}" target="_blank" 
                   class="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded hover:bg-green-50"
                   title="Abrir en nueva pestaña">
                  <i class="fas fa-external-link-alt"></i> Abrir
                </a>
              </div>
            </div>
            <div class="mt-2 border rounded p-2 bg-white">
              <img src="${doc.url}" 
                   alt="${doc.nombre}" 
                   class="w-full h-32 object-contain cursor-pointer"
                   onclick="ampliarImagen('${doc.url}', '${doc.nombre}')"
                   style="cursor: pointer;">
            </div>
          </div>
        `;
      }
    });

    // Procesar documentos sin imágenes
    documentosSinImagen.forEach(doc => {
      if (doc.url) {
        documentosHTML += `
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded border mb-2">
            <div class="flex items-center gap-2">
              <i class="fas fa-${doc.icon} text-gray-600"></i>
              <span>${doc.nombre}</span>
            </div>
            <div class="flex gap-2">
              <a href="${doc.url}" target="_blank" 
                 class="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50">
                <i class="fas fa-eye"></i> Ver
              </a>
              <button onclick="descargarArchivo('${doc.url}', '${movimiento.codigo_movimiento || 'documento'}.pdf')" 
                      class="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded hover:bg-green-50">
                <i class="fas fa-download"></i> Descargar
              </button>
            </div>
          </div>
        `;
      }
    });

    if (documentosHTML === '') {
      documentosHTML = `
        <div class="text-center p-4 text-gray-500 italic">
          <i class="fas fa-folder-open text-3xl mb-2"></i>
          <p>No hay documentos adjuntos</p>
        </div>
      `;
    }

    lista.innerHTML = documentosHTML;

  } catch (error) {
    console.error('Error cargando documentos:', error);
    const lista = document.getElementById(`lista-documentos-${movimientoId}`);
    if (lista) {
      lista.innerHTML = `
        <div class="text-center p-4 text-red-500">
          <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
          <p>Error al cargar documentos</p>
        </div>
      `;
    }
  }
}

// ========================= CERRAR MODAL ADJUNTOS =========================

function cerrarModalAdjuntos() {
  const modal = document.getElementById('modal-adjuntos');
  if (modal) {
    modal.remove();
  }
}

// ========================= SOLICITAR FIRMA Y ENVIAR =========================

async function solicitarFirmaYEnviar(movimientoId) {
  try {
    const movimiento = todosLosMovimientos.find(m => m.id == movimientoId);
    if (!movimiento) {
      mostrarMensaje('Movimiento no encontrado', true);
      return;
    }

    // Verificar si ya tiene foto y firma de envío
    const tieneFotoSalida = movimiento.imagen_salida_url;
    const tieneFirmaEnvio = movimiento.firma_envio_url;

    if (!tieneFotoSalida || !tieneFirmaEnvio) {
      const accionesFaltantes = [];
      if (!tieneFotoSalida) accionesFaltantes.push('foto del equipo al salir');
      if (!tieneFirmaEnvio) accionesFaltantes.push('firma del responsable de envío');

      const confirmar = confirm(`Para marcar como ENVIADO, necesita:\n\n• ${accionesFaltantes.join('\n• ')}\n\n¿Desea proceder con estas acciones ahora?`);

      if (confirmar) {
        // Mostrar modal para completar acciones faltantes
        mostrarModalAdjuntos(movimientoId);
        return;
      } else {
        return;
      }
    }

    // Si ya tiene todo, proceder con el envío
    await actualizarEstado(movimientoId, 'enviado');

  } catch (error) {
    console.error('Error solicitando firma y enviar:', error);
    mostrarMensaje('Error al procesar envío', true);
  }
}

// ========================= SOLICITAR FIRMA Y RECIBIR =========================

async function solicitarFirmaYRecibir(movimientoId) {
  try {
    const movimiento = todosLosMovimientos.find(m => m.id == movimientoId);
    if (!movimiento) {
      mostrarMensaje('Movimiento no encontrado', true);
      return;
    }

    // Verificar si ya tiene foto y firma de recepción
    const tieneFotoRecepcion = movimiento.imagen_recepcion_url;
    const tieneFirmaRecepcion = movimiento.firma_recepcion_url;

    if (!tieneFotoRecepcion || !tieneFirmaRecepcion) {
      const accionesFaltantes = [];
      if (!tieneFotoRecepcion) accionesFaltantes.push('foto del equipo al recibir');
      if (!tieneFirmaRecepcion) accionesFaltantes.push('firma del responsable de recepción');

      const confirmar = confirm(`Para marcar como RECIBIDO, necesita:\n\n• ${accionesFaltantes.join('\n• ')}\n\n¿Desea proceder con estas acciones ahora?`);

      if (confirmar) {
        // Mostrar modal para completar acciones faltantes
        mostrarModalAdjuntos(movimientoId);
        return;
      } else {
        return;
      }
    }

    // Si ya tiene todo, proceder con la recepción
    await actualizarEstado(movimientoId, 'recibido');

  } catch (error) {
    console.error('Error solicitando firma y recibir:', error);
    mostrarMensaje('Error al procesar recepción', true);
  }
}

// ========================= ACTUALIZAR ESTADO =========================

async function actualizarEstado(id, nuevoEstado) {
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
    console.log(`🔄 Actualizando estado del movimiento ${id} a ${nuevoEstado}...`);

    const updateData = { estado: nuevoEstado };

    if (nuevoEstado === 'recibido') {
      updateData.fecha_recepcion = new Date().toISOString().split('T')[0];

      // Actualizar ubicación del equipo
      try {
        await fetch(`${API_URL}/equipos/${movimiento.id_equipo}/actualizar-ubicacion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_sede: movimiento.id_sede_destino,
            tipo_movimiento: 'recepcion',
            id_movimiento: id,
            observaciones: `Equipo recibido en ${movimiento.sede_destino_nombre}`
          })
        });

        console.log('✅ Ubicación del equipo actualizada');
      } catch (error) {
        console.error('Error actualizando ubicación:', error);
      }
    }

    const response = await fetch(`${API_URL}/movimientos-equipos/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || 'Error al actualizar estado');
    }

    // Actualizar localmente
    const index = todosLosMovimientos.findIndex(m => m.id == id);
    if (index !== -1) {
      todosLosMovimientos[index].estado = nuevoEstado;
      if (nuevoEstado === 'recibido') {
        todosLosMovimientos[index].fecha_recepcion = updateData.fecha_recepcion;

        // Actualizar ubicación localmente
        todosLosMovimientos[index].sede_actual_nombre = movimiento.sede_destino_nombre;
      }
    }

    const mensajeExito = {
      'enviado': '✅ Equipo marcado como ENVIADO',
      'recibido': '✅ Equipo marcado como RECIBIDO'
    };

    mostrarMensaje(mensajeExito[nuevoEstado] || `Estado actualizado a ${nuevoEstado}`);

    // Si es recibido, generar y guardar PDF
    if (nuevoEstado === 'recibido') {
      setTimeout(async () => {
        await generarDocumentoMovimiento(id);
      }, 1000);
    }

    await cargarMovimientosCompletos();

  } catch (error) {
    console.error('❌ Error actualizando estado:', error);
    mostrarMensaje(`❌ Error: ${error.message}`, true);
  }
}

// ========================= GENERAR Y GUARDAR PDF EN CLOUDINARY =========================

async function generarDocumentoMovimiento(movimientoId) {
  try {
    console.log(`📄 Generando documento PDF para movimiento ${movimientoId}...`);
    mostrarMensaje('📄 Generando PDF...');

    // Obtener datos completos del movimiento
    const response = await fetch(`${API_URL}/movimientos-equipos/${movimientoId}/completo`);
    if (!response.ok) throw new Error('Error al cargar datos para PDF');

    const movimiento = await response.json();

    // Crear contenido HTML para el PDF
    const contenidoHTML = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; border-bottom: 2px solid #639A33; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { max-width: 150px; }
              .title { color: #0F172A; font-size: 24px; font-weight: bold; margin: 10px 0; }
              .subtitle { color: #666; font-size: 16px; }
              .section { margin: 20px 0; }
              .section-title { background-color: #f0f0f0; padding: 10px; font-weight: bold; border-left: 4px solid #639A33; }
              .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0; }
              .info-item { padding: 5px 0; }
              .info-label { font-weight: bold; color: #0F172A; }
              .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
              .signature-box { width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
              .qrcode { text-align: center; margin: 20px 0; }
              .status-badge { display: inline-block; padding: 5px 10px; border-radius: 20px; font-weight: bold; }
              .pendiente { background-color: #fef3c7; color: #92400e; }
              .enviado { background-color: #dbeafe; color: #1e40af; }
              .recibido { background-color: #dcfce7; color: #166534; }
              .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 10px; }
              .images-container { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
              .image-box { width: 200px; border: 1px solid #ddd; padding: 10px; text-align: center; }
              .image-preview { max-width: 180px; max-height: 150px; }
          </style>
      </head>
      <body>
          <div class="header">
              <div class="title">ACTA DE MOVIMIENTO DE EQUIPO</div>
              <div class="subtitle">Sistema de Inventario SIGIPS</div>
              <div>Código: ${movimiento.codigo_movimiento || 'N/A'}</div>
          </div>
          
          <div class="section">
              <div class="section-title">INFORMACIÓN DEL MOVIMIENTO</div>
              <div class="info-grid">
                  <div class="info-item">
                      <span class="info-label">Equipo:</span> ${movimiento.equipo_nombre || 'N/A'}
                  </div>
                  <div class="info-item">
                      <span class="info-label">Código Interno:</span> ${movimiento.equipo_codigo || 'N/A'}
                  </div>
                  <div class="info-item">
                      <span class="info-label">Tipo:</span> ${movimiento.tipo_movimiento_nombre || 'N/A'}
                  </div>
                  <div class="info-item">
                      <span class="info-label">Estado:</span> 
                      <span class="status-badge ${movimiento.estado || 'pendiente'}">
                          ${movimiento.estado ? movimiento.estado.toUpperCase() : 'PENDIENTE'}
                      </span>
                  </div>
              </div>
          </div>
          
          <div class="section">
              <div class="section-title">UBICACIONES</div>
              <div class="info-grid">
                  <div class="info-item">
                      <span class="info-label">Origen:</span><br>
                      ${movimiento.sede_origen_nombre || 'N/A'}<br>
                      ${movimiento.sede_origen_direccion || ''}
                  </div>
                  <div class="info-item">
                      <span class="info-label">Destino:</span><br>
                      ${movimiento.sede_destino_nombre || 'N/A'}<br>
                      ${movimiento.sede_destino_direccion || ''}
                  </div>
                  <div class="info-item">
                      <span class="info-label">Ubicación Actual:</span><br>
                      ${movimiento.sede_actual_nombre || movimiento.sede_destino_nombre || 'N/A'}
                  </div>
              </div>
          </div>
          
          <div class="section">
              <div class="section-title">FECHAS</div>
              <div class="info-grid">
                  <div class="info-item">
                      <span class="info-label">Fecha de Salida:</span> ${formatearFecha(movimiento.fecha_salida) || 'N/A'}
                  </div>
                  <div class="info-item">
                      <span class="info-label">Fecha de Recepción:</span> ${movimiento.fecha_recepcion ? formatearFecha(movimiento.fecha_recepcion) : 'Pendiente'}
                  </div>
              </div>
          </div>
          
          ${movimiento.motivo ? `
          <div class="section">
              <div class="section-title">MOTIVO DEL MOVIMIENTO</div>
              <p>${movimiento.motivo}</p>
          </div>
          ` : ''}
          
          ${movimiento.observaciones ? `
          <div class="section">
              <div class="section-title">OBSERVACIONES</div>
              <p>${movimiento.observaciones}</p>
          </div>
          ` : ''}
          
          <div class="section">
              <div class="section-title">RESPONSABLES</div>
              <div class="info-grid">
                  <div class="info-item">
                      <span class="info-label">Responsable de Envío:</span><br>
                      ${movimiento.responsable_envio_nombre || 'N/A'}<br>
                      Documento: ${movimiento.responsable_envio_documento || ''}
                  </div>
                  <div class="info-item">
                      <span class="info-label">Responsable de Recepción:</span><br>
                      ${movimiento.responsable_recepcion_nombre || 'N/A'}<br>
                      Documento: ${movimiento.responsable_recepcion_documento || ''}
                  </div>
              </div>
          </div>
          
          ${(movimiento.imagen_salida_url || movimiento.imagen_recepcion_url) ? `
          <div class="section">
              <div class="section-title">DOCUMENTACIÓN ADJUNTA</div>
              <div class="images-container">
                  ${movimiento.imagen_salida_url ? `
                  <div class="image-box">
                      <div><strong>Foto Salida</strong></div>
                      <img src="${movimiento.imagen_salida_url}" class="image-preview">
                  </div>
                  ` : ''}
                  
                  ${movimiento.imagen_recepcion_url ? `
                  <div class="image-box">
                      <div><strong>Foto Recepción</strong></div>
                      <img src="${movimiento.imagen_recepcion_url}" class="image-preview">
                  </div>
                  ` : ''}
              </div>
          </div>
          ` : ''}
          
          <div class="section">
              <div class="section-title">FIRMAS</div>
              <div class="signatures">
                  <div class="signature-box">
                      <div>Responsable de Envío</div>
                      ${movimiento.firma_envio_url ?
        `<img src="${movimiento.firma_envio_url}" style="max-width: 150px; max-height: 80px;">` :
        '___________________'
      }
                      <div>${movimiento.responsable_envio_nombre || ''}</div>
                      <div>${movimiento.responsable_envio_documento || ''}</div>
                  </div>
                  <div class="signature-box">
                      <div>Responsable de Recepción</div>
                      ${movimiento.firma_recepcion_url ?
        `<img src="${movimiento.firma_recepcion_url}" style="max-width: 150px; max-height: 80px;">` :
        '___________________'
      }
                      <div>${movimiento.responsable_recepcion_nombre || ''}</div>
                      <div>${movimiento.responsable_recepcion_documento || ''}</div>
                  </div>
              </div>
          </div>
          
          <div class="qrcode">
              <div>Código QR del movimiento:</div>
              <div style="font-family: monospace; font-size: 10px; margin-top: 10px;">
                  ${movimiento.codigo_movimiento || 'N/A'}
              </div>
          </div>
          
          <div class="footer">
              Documento generado automáticamente por SIGIPS<br>
              Fecha de generación: ${new Date().toLocaleDateString('es-ES')}<br>
              Este documento tiene validez legal y técnica
          </div>
      </body>
      </html>
    `;

    // Crear un elemento temporal para el PDF
    const element = document.createElement('div');
    element.innerHTML = contenidoHTML;
    document.body.appendChild(element);

    // Configurar opciones para html2pdf
    const opt = {
      margin: 10,
      filename: `movimiento_${movimiento.codigo_movimiento || movimientoId}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      }
    };

    mostrarMensaje('🔄 Generando PDF...');

    // Generar PDF como Blob
    const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
    
    // Crear archivo para subir a Cloudinary
    const pdfFile = new File([pdfBlob], 
      `movimiento_${movimiento.codigo_movimiento || movimientoId}_${new Date().getTime()}.pdf`, 
      { type: 'application/pdf' }
    );

    mostrarMensaje('📤 Subiendo PDF a Cloudinary...');

    // Subir PDF a Cloudinary
    const uploadResult = await subirArchivoCloudinary(pdfFile, 'pdf');

    // Guardar URL del PDF en la base de datos
    const saveResponse = await fetch(`${API_URL}/movimientos-equipos/${movimientoId}/generar-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdf_url: uploadResult.url,
        pdf_public_id: uploadResult.public_id,
        pdf_nombre: uploadResult.nombre_original
      })
    });

    if (saveResponse.ok) {
      // Limpiar elemento temporal
      document.body.removeChild(element);
      
      // Actualizar movimiento localmente
      const movimientoIndex = todosLosMovimientos.findIndex(m => m.id == movimientoId);
      if (movimientoIndex !== -1) {
        todosLosMovimientos[movimientoIndex].documento_pdf_url = uploadResult.url;
      }

      mostrarMensaje('✅ PDF generado y guardado en Cloudinary');

      // Preguntar si quiere descargar el PDF
      setTimeout(() => {
        if (confirm('¿Desea descargar el PDF generado?')) {
          descargarArchivo(uploadResult.url, pdfFile.name);
        }
      }, 500);
    } else {
      throw new Error('Error guardando PDF en la base de datos');
    }

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    mostrarMensaje(`❌ Error al generar PDF: ${error.message}`, true);
    
    // Limpiar elemento temporal si existe
    const element = document.querySelector('div[style*="position: absolute"]');
    if (element) {
      element.remove();
    }
  }
}

// ========================= GET ESTADO CLASS/TEXTO =========================

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

// ========================= PAGINACIÓN =========================

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

// ========================= CARGAR PENDIENTES =========================

async function cargarPendientes() {
  try {
    const userData = localStorage.getItem('currentUser');
    const currentUser = userData ? JSON.parse(userData) : null;

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
      let fechaSalida = 'No especificada';
      if (mov.fecha_salida) {
        fechaSalida = formatearFecha(mov.fecha_salida);
      } else if (mov.fecha_salida_formateada) {
        fechaSalida = formatearFecha(mov.fecha_salida_formateada);
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
              <button onclick="solicitarFirmaYRecibir(${mov.id})" 
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
    const userData = localStorage.getItem('currentUser');
    const currentUser = userData ? JSON.parse(userData) : null;

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

    if (pendientesParaRecepcion.length > 0) {
      elementos.pendingCount.classList.remove('hidden');
    } else {
      elementos.pendingCount.classList.add('hidden');
    }
  }
}

// ========================= VER DETALLES MOVIMIENTO =========================

async function verDetallesMovimiento(id) {
  try {
    console.log(`👁️ Cargando detalles del movimiento ${id}...`);
    mostrarMensaje('Cargando detalles...');

    const response = await fetch(`${API_URL}/movimientos-equipos/${id}/completo`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al cargar detalles');
    }

    const movimiento = await response.json();
    console.log('📊 Detalles cargados:', movimiento);

    const contenido = document.getElementById('detalles-contenido');
    if (contenido) {
      let fechaSalida = 'No especificada';
      if (movimiento.fecha_salida) {
        fechaSalida = formatearFecha(movimiento.fecha_salida);
      } else if (movimiento.fecha_salida_formateada) {
        fechaSalida = formatearFecha(movimiento.fecha_salida_formateada);
      }

      let fechaRecepcion = 'Pendiente';
      if (movimiento.fecha_recepcion) {
        fechaRecepcion = formatearFecha(movimiento.fecha_recepcion);
      } else if (movimiento.fecha_recepcion_formateada) {
        fechaRecepcion = formatearFecha(movimiento.fecha_recepcion_formateada);
      }

      // Sección de documentos adjuntos mejorada
      let documentosHTML = '';
      const documentos = [
        { 
          nombre: 'Foto al salir', 
          url: movimiento.imagen_salida_url, 
          icon: 'camera',
          tipo: 'imagen',
          existe: !!movimiento.imagen_salida_url
        },
        { 
          nombre: 'Firma remitente', 
          url: movimiento.firma_envio_url, 
          icon: 'signature',
          tipo: 'imagen',
          existe: !!movimiento.firma_envio_url
        },
        { 
          nombre: 'Foto al recibir', 
          url: movimiento.imagen_recepcion_url, 
          icon: 'camera',
          tipo: 'imagen',
          existe: !!movimiento.imagen_recepcion_url
        },
        { 
          nombre: 'Firma receptor', 
          url: movimiento.firma_recepcion_url, 
          icon: 'signature',
          tipo: 'imagen',
          existe: !!movimiento.firma_recepcion_url
        },
        { 
          nombre: 'Documento PDF', 
          url: movimiento.documento_pdf_url, 
          icon: 'file-pdf',
          tipo: 'pdf',
          existe: !!movimiento.documento_pdf_url
        }
      ];

      // Crear cards para cada documento
      documentos.forEach(doc => {
        if (doc.existe) {
          if (doc.tipo === 'imagen') {
            documentosHTML += `
              <div class="border rounded-lg p-4 bg-gray-50">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <i class="fas fa-${doc.icon} text-blue-600"></i>
                    <span class="font-medium">${doc.nombre}</span>
                  </div>
                  <button onclick="ampliarImagen('${doc.url}', '${doc.nombre}')" 
                          class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm">
                    <i class="fas fa-expand"></i> Ver completa
                  </button>
                </div>
                <div class="border rounded overflow-hidden bg-white">
                  <img src="${doc.url}" 
                       alt="${doc.nombre}" 
                       class="w-full h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                       onclick="ampliarImagen('${doc.url}', '${doc.nombre}')"
                       onerror="this.src='https://via.placeholder.com/400x300/cccccc/969696?text=Imagen+no+disponible'">
                </div>
                <div class="mt-2 text-xs text-gray-500 text-center">
                  Haz clic en la imagen para ampliar
                </div>
              </div>
            `;
          } else {
            documentosHTML += `
              <div class="border rounded-lg p-4 bg-gray-50">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <i class="fas fa-${doc.icon} text-red-600"></i>
                    <span class="font-medium">${doc.nombre}</span>
                  </div>
                  <div class="flex gap-2">
                    <a href="${doc.url}" target="_blank" 
                       class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm">
                      <i class="fas fa-eye"></i> Ver
                    </a>
                    <button onclick="descargarArchivo('${doc.url}', 'movimiento_${movimiento.codigo_movimiento}.pdf')" 
                            class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm">
                      <i class="fas fa-download"></i> Descargar
                    </button>
                  </div>
                </div>
              </div>
            `;
          }
        }
      });

      if (documentosHTML === '') {
        documentosHTML = `
          <div class="text-center p-6 border rounded-lg bg-gray-50">
            <i class="fas fa-folder-open text-4xl text-gray-400 mb-3"></i>
            <p class="text-gray-500">No hay documentos adjuntos</p>
            ${movimiento.estado === 'pendiente' ? `
              <button onclick="mostrarModalAdjuntos(${movimiento.id})" 
                      class="mt-3 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2 mx-auto">
                <i class="fas fa-paperclip"></i> Adjuntar documentos
              </button>
            ` : ''}
          </div>
        `;
      }

      contenido.innerHTML = `
        <!-- Información principal -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Columna izquierda -->
          <div class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h4 class="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <i class="fas fa-info-circle"></i> Información básica
              </h4>
              <div class="space-y-2">
                <p><strong class="text-blue-700">Código movimiento:</strong> ${movimiento.codigo_movimiento || 'N/A'}</p>
                <p><strong class="text-blue-700">Equipo:</strong> ${movimiento.equipo_nombre || 'N/A'}</p>
                <p><strong class="text-blue-700">Código equipo:</strong> ${movimiento.equipo_codigo || 'Sin código'}</p>
                <p><strong class="text-blue-700">Tipo movimiento:</strong> ${movimiento.tipo_movimiento_nombre || 'N/A'}</p>
                <p><strong class="text-blue-700">Estado:</strong> 
                  <span class="${getEstadoClass(movimiento.estado)} px-2 py-1 rounded-full text-xs ml-2">
                    ${getEstadoTexto(movimiento.estado)}
                  </span>
                </p>
              </div>
            </div>

            <div class="bg-green-50 p-4 rounded-lg border border-green-100">
              <h4 class="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <i class="fas fa-calendar-alt"></i> Fechas
              </h4>
              <div class="space-y-2">
                <p><strong class="text-green-700">Fecha Salida:</strong> ${fechaSalida}</p>
                <p><strong class="text-green-700">Fecha Recepción:</strong> ${fechaRecepcion}</p>
                <p><strong class="text-green-700">Ubicación actual:</strong> ${movimiento.sede_actual_nombre || movimiento.sede_destino_nombre || 'N/A'}</p>
              </div>
            </div>
          </div>

          <!-- Columna derecha -->
          <div class="space-y-4">
            <div class="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <h4 class="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                <i class="fas fa-map-marker-alt"></i> Ubicaciones
              </h4>
              <div class="space-y-2">
                <p><strong class="text-purple-700">Origen:</strong> ${movimiento.sede_origen_nombre || 'N/A'}</p>
                <p><strong class="text-purple-700">Destino:</strong> ${movimiento.sede_destino_nombre || 'N/A'}</p>
                <p><strong class="text-purple-700">Transporte:</strong> ${movimiento.transporte || 'No especificado'}</p>
                <p><strong class="text-purple-700">Embalaje:</strong> ${movimiento.embalaje || 'No especificado'}</p>
              </div>
            </div>

            <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
              <h4 class="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <i class="fas fa-users"></i> Responsables
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p class="font-medium text-yellow-700">Envío:</p>
                  <p>${movimiento.responsable_envio_nombre || 'No asignado'}</p>
                  <p class="text-sm text-gray-500">${movimiento.responsable_envio_documento || ''}</p>
                </div>
                <div>
                  <p class="font-medium text-yellow-700">Recepción:</p>
                  <p>${movimiento.responsable_recepcion_nombre || 'No asignado'}</p>
                  <p class="text-sm text-gray-500">${movimiento.responsable_recepcion_documento || ''}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Motivo -->
        ${movimiento.motivo ? `
        <div class="mt-6 bg-gray-50 p-4 rounded-lg border">
          <h4 class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <i class="fas fa-comment-alt"></i> Motivo del movimiento
          </h4>
          <p class="text-gray-700">${movimiento.motivo}</p>
        </div>
        ` : ''}

        <!-- Documentos adjuntos -->
        <div class="mt-6">
          <h4 class="font-semibold text-[#0F172A] mb-4 flex items-center gap-2 text-lg">
            <i class="fas fa-paperclip"></i> Documentos adjuntos
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${documentosHTML}
          </div>
        </div>

        <!-- Información adicional -->
        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          ${movimiento.observaciones ? `
          <div class="bg-gray-50 p-4 rounded-lg border">
            <h4 class="font-semibold text-gray-800 mb-2">Observaciones</h4>
            <p class="text-gray-700">${movimiento.observaciones}</p>
          </div>
          ` : ''}
          
          ${movimiento.accesorios ? `
          <div class="bg-gray-50 p-4 rounded-lg border">
            <h4 class="font-semibold text-gray-800 mb-2">Accesorios</h4>
            <p class="text-gray-700">${movimiento.accesorios}</p>
          </div>
          ` : ''}
        </div>

        <!-- Botones de acción -->
        <div class="mt-8 pt-6 border-t flex flex-wrap gap-3 justify-end">
          ${movimiento.estado === 'pendiente' ? `
            <button onclick="solicitarFirmaYEnviar(${movimiento.id})"
                    class="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg transition flex items-center gap-2 font-medium">
              <i class="fas fa-paper-plane"></i> Marcar como Enviado
            </button>
          ` : ''}
          
          ${movimiento.estado === 'enviado' ? `
            <button onclick="solicitarFirmaYRecibir(${movimiento.id})"
                    class="bg-[#639A33] hover:bg-green-700 text-white px-5 py-2.5 rounded-lg transition flex items-center gap-2 font-medium">
              <i class="fas fa-check-circle"></i> Marcar como Recibido
            </button>
          ` : ''}
          
          ${movimiento.estado === 'recibido' && !movimiento.documento_pdf_url ? `
            <button onclick="generarDocumentoMovimiento(${movimiento.id})"
                    class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg transition flex items-center gap-2 font-medium">
              <i class="fas fa-file-pdf"></i> Generar Documento PDF
            </button>
          ` : ''}
          
          ${movimiento.estado === 'recibido' && movimiento.documento_pdf_url ? `
            <a href="${movimiento.documento_pdf_url}" target="_blank"
               class="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg transition flex items-center gap-2 font-medium">
              <i class="fas fa-file-pdf"></i> Ver Documento PDF
            </a>
          ` : ''}
          
          <button onclick="cerrarModalDetalles()"
                  class="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2.5 rounded-lg transition flex items-center gap-2 font-medium">
            <i class="fas fa-times"></i> Cerrar
          </button>
        </div>
      `;
    }

    document.getElementById('modal-detalles').classList.remove('hidden');
    mostrarMensaje('✅ Detalles cargados');

  } catch (error) {
    console.error('❌ Error cargando detalles:', error);
    mostrarMensaje('❌ Error al cargar detalles del movimiento', true);
  }
}

// ========================= FUNCIONES AUXILIARES =========================

function mostrarTab(tabName) {
  console.log(`📑 Cambiando a pestaña: ${tabName}`);

  elementos.contenidoCrear.classList.add('hidden');
  elementos.contenidoListar.classList.add('hidden');
  elementos.contenidoPendientes.classList.add('hidden');

  elementos.tabCrear.classList.remove('active');
  elementos.tabListar.classList.remove('active');
  elementos.tabPendientes.classList.remove('active');

  if (tabName === 'crear') {
    elementos.contenidoCrear.classList.remove('hidden');
    elementos.tabCrear.classList.add('active');
  } else if (tabName === 'listar') {
    elementos.contenidoListar.classList.remove('hidden');
    elementos.tabListar.classList.add('active');
    cargarMovimientosCompletos();
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

      const rol = user.rol || 'Técnico';
      const rolFormateado = rol.charAt(0).toUpperCase() + rol.slice(1).toLowerCase();
      document.getElementById('user-role').textContent = rolFormateado;

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
          <td class="px-4 py-3 border border-gray-200"><div class="h-4 bg-gray-200 rounded w-28"></div></td>
        </tr>
      `).join('')}
    `;
  }
}

function mostrarMensaje(texto, esError = false) {
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

// ========================= EXPORTAR FUNCIONES GLOBALES =========================

window.verDetallesMovimiento = verDetallesMovimiento;
window.actualizarEstado = actualizarEstado;
window.cerrarModalDetalles = cerrarModalDetalles;
window.generarDocumentoMovimiento = generarDocumentoMovimiento;
window.mostrarModalCamara = mostrarModalCamara;
window.cerrarModalCamara = cerrarModalCamara;
window.capturarFoto = capturarFoto;
window.guardarFirma = guardarFirma;
window.limpiarFirma = limpiarFirma;
window.subirFotoArchivo = subirFotoArchivo;
window.mostrarModalAdjuntos = mostrarModalAdjuntos;
window.cerrarModalAdjuntos = cerrarModalAdjuntos;
window.solicitarFirmaYEnviar = solicitarFirmaYEnviar;
window.solicitarFirmaYRecibir = solicitarFirmaYRecibir;
window.ampliarImagen = ampliarImagen;
window.descargarArchivo = descargarArchivo;