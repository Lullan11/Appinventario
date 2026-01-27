// ==================== CONFIGURACIÓN CLOUDINARY ====================
const CLOUDINARY_CONFIG = {
  cloudName: 'dzkccjhn9',
  uploadPreset: 'inventario'
};

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}`;
const CLOUDINARY_IMAGE_UPLOAD = `${CLOUDINARY_UPLOAD_URL}/image/upload`;
const CLOUDINARY_RAW_UPLOAD = `${CLOUDINARY_UPLOAD_URL}/raw/upload`;

// Constantes
const API_URL = "https://inventario-api-gw73.onrender.com";
let todosLosMovimientos = [];
let movimientosFiltrados = [];
let sedes = [];
let usuarios = [];
let tiposMovimiento = [];
let equipos = [];

// Variables globales
let cameraStream = null;
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

// ========================= FUNCIONES AUXILIARES =========================

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

function formatearFecha(fechaString) {
  if (!fechaString) return 'No especificada';

  try {
    const fecha = new Date(fechaString);
    if (isNaN(fecha.getTime())) {
      return fechaString;
    }

    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');

    return `${dia}/${mes}/${año} ${horas}:${minutos}`;
  } catch (e) {
    console.error('Error formateando fecha:', e);
    return fechaString;
  }
}

// ========================= SUBIR ARCHIVOS A CLOUDINARY =========================

async function subirArchivoCloudinary(archivo, tipo = 'image') {
  try {
    console.log(`📤 Subiendo ${tipo}: ${archivo.name}`);

    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    
    if (tipo === 'image' || tipo === 'signature') {
      formData.append('resource_type', 'image');
      formData.append('folder', tipo === 'signature' ? 'movimientos/firmas' : 'movimientos/imagenes');
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

    cargarUsuario();
    await cargarDatosIniciales();
    configurarEventos();
    mostrarTab('crear');

    console.log('✅ Módulo de movimientos inicializado');
  } catch (error) {
    console.error('❌ Error inicializando:', error);
    mostrarMensaje('Error al inicializar el módulo', true);
  }
});

// ========================= MANEJO DE CÁMARA SIMPLIFICADO =========================

async function inicializarCamara(videoElementId) {
  try {
    // Detener cámara anterior si existe
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }

    const videoElement = document.getElementById(videoElementId);
    if (!videoElement) {
      console.error('Elemento de video no encontrado:', videoElementId);
      return false;
    }

    // Solicitar acceso a la cámara
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // Cámara trasera
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    videoElement.srcObject = cameraStream;
    
    // Esperar a que el video esté listo
    await new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        resolve();
      };
    });

    return true;
  } catch (error) {
    console.error('❌ Error accediendo a la cámara:', error);
    
    // Intentar con cámara frontal como fallback
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      
      const videoElement = document.getElementById(videoElementId);
      if (videoElement) {
        videoElement.srcObject = cameraStream;
        await videoElement.play();
        return true;
      }
    } catch (fallbackError) {
      console.error('❌ Error con cámara frontal:', fallbackError);
    }
    
    return false;
  }
}

function detenerCamara() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}

function capturarFotoDesdeVideo(videoElementId, canvasElementId) {
  try {
    const video = document.getElementById(videoElementId);
    const canvas = document.getElementById(canvasElementId);
    
    if (!video || !canvas) {
      throw new Error('Elementos de video o canvas no encontrados');
    }

    // Configurar canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    
    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convertir a data URL
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('❌ Error capturando foto:', error);
    return null;
  }
}

// ========================= MODAL CÁMARA FORZADA MEJORADO =========================

async function mostrarModalCamaraForzada(tipo, movimientoId, titulo = '') {
  // Crear modal HTML
  const modalHTML = `
    <div id="modal-camara-forzada" class="fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center p-4">
      <div class="bg-white rounded-lg w-full max-w-2xl">
        <div class="p-4 border-b bg-red-50">
          <h3 class="text-lg font-semibold text-center text-red-600">${titulo || 'ATENCIÓN REQUERIDA'}</h3>
          <p class="text-sm text-gray-600 text-center mt-1">Este paso es obligatorio para continuar</p>
        </div>
        
        <div class="p-6">
          <div class="flex flex-col items-center">
            ${tipo.includes('imagen') ? `
              <!-- Instrucciones para foto -->
              <div class="mb-4 text-center">
                <div class="text-4xl text-blue-500 mb-2">
                  <i class="fas fa-camera"></i>
                </div>
                <p class="font-medium">Debe tomar una foto del equipo</p>
                <p class="text-sm text-gray-600">Esta foto es obligatoria para el proceso de recepción</p>
              </div>
              
              <!-- Contenedor de cámara -->
              <div id="camera-container-forzada" class="w-full">
                <video id="camera-preview-forzada" autoplay playsinline class="w-full h-64 bg-black rounded"></video>
                <canvas id="camera-canvas-forzada" class="hidden"></canvas>
                <div id="camera-error" class="hidden text-center p-4 text-red-600">
                  <i class="fas fa-camera-slash text-2xl mb-2"></i>
                  <p>No se pudo acceder a la cámara</p>
                  <p class="text-sm">Use el botón para seleccionar una imagen</p>
                </div>
              </div>
              
              <!-- Opción de archivo como fallback -->
              <div class="mt-4 w-full">
                <input type="file" id="file-input-forzada" accept="image/*" capture="environment" 
                       class="hidden">
                <div class="text-center">
                  <button onclick="document.getElementById('file-input-forzada').click()" 
                          class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm mb-2">
                    <i class="fas fa-upload"></i> Seleccionar imagen
                  </button>
                  <p class="text-xs text-gray-500">O seleccione una imagen si la cámara no funciona</p>
                </div>
              </div>
              
              <!-- Botón principal -->
              <div class="mt-6">
                <button onclick="procesarFotoForzada('${tipo}', ${movimientoId})" 
                        class="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-lg font-medium mx-auto">
                  <i class="fas fa-camera"></i> TOMAR FOTO
                </button>
                <p class="text-xs text-gray-500 text-center mt-2">No puede continuar sin completar este paso</p>
              </div>
            ` : `
              <!-- Instrucciones para firma -->
              <div class="mb-4 text-center">
                <div class="text-4xl text-green-500 mb-2">
                  <i class="fas fa-signature"></i>
                </div>
                <p class="font-medium">Debe firmar digitalmente</p>
                <p class="text-sm text-gray-600">Esta firma es obligatoria para confirmar la recepción</p>
              </div>
              
              <!-- Canvas para firma -->
              <div class="w-full mb-4">
                <canvas id="signature-canvas-forzada" 
                        class="border-2 border-gray-300 w-full h-64 bg-white touch-none rounded-lg"></canvas>
                <p class="text-xs text-gray-500 text-center mt-1">Firme en el área superior usando el dedo o el mouse</p>
              </div>
              
              <!-- Botones para firma -->
              <div class="flex gap-4 mt-4 w-full">
                <button onclick="limpiarFirmaForzada()" 
                        class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 flex items-center gap-1">
                  <i class="fas fa-eraser"></i> Limpiar
                </button>
                <button onclick="guardarFirmaForzada('${tipo}', ${movimientoId})" 
                        class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex-1">
                  <i class="fas fa-check-circle"></i> CONFIRMAR FIRMA
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  // Remover modal anterior si existe
  const modalAnterior = document.getElementById('modal-camara-forzada');
  if (modalAnterior) {
    modalAnterior.remove();
    detenerCamara();
  }

  // Agregar nuevo modal
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Configurar eventos según el tipo
  if (tipo.includes('imagen')) {
    // Inicializar cámara automáticamente
    setTimeout(async () => {
      const camaraInicializada = await inicializarCamara('camera-preview-forzada');
      
      if (!camaraInicializada) {
        // Mostrar opción de archivo como principal
        const errorDiv = document.getElementById('camera-error');
        const videoElement = document.getElementById('camera-preview-forzada');
        
        if (errorDiv && videoElement) {
          errorDiv.classList.remove('hidden');
          videoElement.classList.add('hidden');
        }
        
        mostrarMensaje('No se pudo acceder a la cámara. Use el botón para seleccionar una imagen.', true);
      }
    }, 300);

    // Configurar input de archivo
    const fileInput = document.getElementById('file-input-forzada');
    if (fileInput) {
      fileInput.addEventListener('change', async function(e) {
        if (e.target.files && e.target.files[0]) {
          await procesarArchivoForzada(e.target.files[0], tipo, movimientoId);
        }
      });
    }
  } else {
    // Inicializar canvas para firma
    setTimeout(() => {
      inicializarCanvasFirmaForzada();
    }, 300);
  }
}

// ========================= PROCESAR FOTO FORZADA (MEJORADO) =========================

async function procesarFotoForzada(tipo, movimientoId) {
  try {
    // Intentar capturar desde la cámara primero
    const videoElement = document.getElementById('camera-preview-forzada');
    let photoData = null;

    if (videoElement && videoElement.srcObject) {
      // Capturar desde cámara
      photoData = capturarFotoDesdeVideo('camera-preview-forzada', 'camera-canvas-forzada');
      
      if (!photoData) {
        // Si no se pudo capturar, intentar con archivo
        mostrarMensaje('No se pudo capturar la foto. Use el botón para seleccionar una imagen.', true);
        document.getElementById('file-input-forzada').click();
        return;
      }
    } else {
      // Si no hay cámara, usar archivo
      mostrarMensaje('Seleccione una imagen para continuar', true);
      document.getElementById('file-input-forzada').click();
      return;
    }

    // Subir la foto
    mostrarMensaje('📤 Subiendo foto...');

    const blob = dataURLToBlob(photoData);
    const archivo = new File([blob], `foto_${tipo}_${movimientoId}_${Date.now()}.jpg`, {
      type: 'image/jpeg'
    });

    const uploadResult = await subirArchivoCloudinary(archivo, 'image');

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
      mostrarMensaje('✅ Foto guardada correctamente');
      
      // Detener la cámara
      detenerCamara();
      
      // Cerrar modal
      const modal = document.getElementById('modal-camara-forzada');
      if (modal) modal.remove();
      
      // FLUJO AUTOMÁTICO: Después de imagen_salida, mostrar firma_envio
      if (tipo === 'imagen_salida') {
        setTimeout(() => {
          mostrarModalCamaraForzada('firma_envio', movimientoId, 'Firma de envío obligatoria');
        }, 1000);
      }
      // FLUJO AUTOMÁTICO: Después de imagen_recepcion, mostrar firma_recepcion
      else if (tipo === 'imagen_recepcion') {
        setTimeout(() => {
          mostrarModalCamaraForzada('firma_recepcion', movimientoId, 'Firma de recepción obligatoria');
        }, 1000);
      }
      
      // Actualizar movimiento localmente
      const movimientoIndex = todosLosMovimientos.findIndex(m => m.id == movimientoId);
      if (movimientoIndex !== -1) {
        todosLosMovimientos[movimientoIndex][`${tipo}_url`] = uploadResult.url;
      }
    } else {
      throw new Error('Error guardando foto');
    }
  } catch (error) {
    console.error('Error procesando foto forzada:', error);
    mostrarMensaje(`❌ Error: ${error.message}`, true);
  }
}

// ========================= PROCESAR ARCHIVO FORZADA =========================

async function procesarArchivoForzada(file, tipo, movimientoId) {
  try {
    if (!file) {
      mostrarMensaje('❌ No se seleccionó ninguna imagen', true);
      return;
    }

    // Verificar que sea una imagen
    if (!file.type.startsWith('image/')) {
      mostrarMensaje('❌ El archivo debe ser una imagen', true);
      return;
    }

    mostrarMensaje('📤 Subiendo imagen...');

    const uploadResult = await subirArchivoCloudinary(file, 'image');

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
      mostrarMensaje('✅ Imagen subida correctamente');
      
      // Cerrar modal
      const modal = document.getElementById('modal-camara-forzada');
      if (modal) modal.remove();
      
      // FLUJO AUTOMÁTICO: Después de imagen_salida, mostrar firma_envio
      if (tipo === 'imagen_salida') {
        setTimeout(() => {
          mostrarModalCamaraForzada('firma_envio', movimientoId, 'Firma de envío obligatoria');
        }, 1000);
      }
      // FLUJO AUTOMÁTICO: Después de imagen_recepcion, mostrar firma_recepcion
      else if (tipo === 'imagen_recepcion') {
        setTimeout(() => {
          mostrarModalCamaraForzada('firma_recepcion', movimientoId, 'Firma de recepción obligatoria');
        }, 1000);
      }
      
      // Actualizar movimiento localmente
      const movimientoIndex = todosLosMovimientos.findIndex(m => m.id == movimientoId);
      if (movimientoIndex !== -1) {
        todosLosMovimientos[movimientoIndex][`${tipo}_url`] = uploadResult.url;
      }
    } else {
      throw new Error('Error guardando imagen');
    }
  } catch (error) {
    console.error('Error procesando archivo forzada:', error);
    mostrarMensaje('❌ Error al subir imagen', true);
  }
}

// ========================= INICIALIZAR FIRMA FORZADA =========================

function inicializarCanvasFirmaForzada() {
  const canvas = document.getElementById('signature-canvas-forzada');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  // Configurar dimensiones
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  // Estilo
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
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

  // Eventos para touch (móviles)
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

// ========================= GUARDAR FIRMA FORZADA =========================

async function guardarFirmaForzada(tipo, movimientoId) {
  try {
    const canvas = document.getElementById('signature-canvas-forzada');
    if (!canvas) {
      mostrarMensaje('Error: Canvas no encontrado', true);
      return;
    }

    // Verificar si hay firma
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const hasSignature = imageData.data.some(channel => channel !== 255);

    if (!hasSignature) {
      mostrarMensaje('❌ Debe realizar su firma para continuar', true);
      return;
    }

    const signatureData = canvas.toDataURL('image/png');
    const blob = dataURLToBlob(signatureData);
    const archivo = new File([blob], `firma_${tipo}_${movimientoId}_${Date.now()}.png`, {
      type: 'image/png'
    });

    mostrarMensaje('📤 Guardando firma...');

    const uploadResult = await subirArchivoCloudinary(archivo, 'signature');

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
      mostrarMensaje('✅ Firma guardada correctamente');
      
      // Cerrar modal
      const modal = document.getElementById('modal-camara-forzada');
      if (modal) modal.remove();
      
      // Actualizar movimiento localmente
      const movimientoIndex = todosLosMovimientos.findIndex(m => m.id == movimientoId);
      if (movimientoIndex !== -1) {
        todosLosMovimientos[movimientoIndex][`${tipo}_url`] = uploadResult.url;
      }
      
      // FLUJO AUTOMÁTICO COMPLETO:
      if (tipo === 'firma_envio') {
        // Después de la firma de envío, marcar automáticamente como ENVIADO
        setTimeout(async () => {
          await actualizarEstado(movimientoId, 'enviado');
        }, 1000);
      }
      else if (tipo === 'firma_recepcion') {
        // Después de la firma de recepción, marcar automáticamente como RECIBIDO
        setTimeout(async () => {
          await actualizarEstado(movimientoId, 'recibido');
        }, 1000);
      }
    } else {
      throw new Error('Error guardando firma');
    }
  } catch (error) {
    console.error('Error guardando firma forzada:', error);
    mostrarMensaje('❌ Error al guardar firma', true);
  }
}

// ========================= LIMPIAR FIRMA FORZADA =========================

function limpiarFirmaForzada() {
  const canvas = document.getElementById('signature-canvas-forzada');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ========================= CONFIRMAR RECEPCIÓN FORZADA =========================

async function confirmarRecepcionForzada(movimientoId) {
  try {
    const movimiento = todosLosMovimientos.find(m => m.id == movimientoId);
    if (!movimiento) {
      mostrarMensaje('Movimiento no encontrado', true);
      return;
    }

    // Verificar usuario actual
    const userData = localStorage.getItem('currentUser');
    const currentUser = userData ? JSON.parse(userData) : null;
    
    if (currentUser && movimiento.id_responsable_recepcion != currentUser.id) {
      mostrarMensaje('❌ Solo el responsable de recepción puede confirmar la recepción', true);
      return;
    }

    // Verificar si ya tiene documentos de recepción
    if (movimiento.imagen_recepcion_url && movimiento.firma_recepcion_url) {
      // Ya tiene todo, marcar automáticamente como recibido
      await actualizarEstado(movimientoId, 'recibido');
      return;
    }

    // Mostrar modal forzado para foto de recepción
    mostrarModalCamaraForzada('imagen_recepcion', movimientoId, 'Foto obligatoria del equipo recibido');

  } catch (error) {
    console.error('Error en confirmación forzada:', error);
    mostrarMensaje('Error al procesar recepción', true);
  }
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

    const movimientosConUbicacion = await Promise.all(
      todosLosMovimientos.map(async (mov) => {
        try {
          const ubicacionRes = await fetch(`${API_URL}/equipos/${mov.id_equipo}/ubicacion-actual`);
          if (ubicacionRes.ok) {
            const ubicacion = await ubicacionRes.json();
            mov.sede_actual_nombre = ubicacion?.sede_nombre || 'N/A';
          } else {
            if (mov.estado === 'recibido') {
              mov.sede_actual_nombre = mov.sede_destino_nombre || 'N/A';
            } else if (mov.estado === 'enviado') {
              mov.sede_actual_nombre = `${mov.sede_destino_nombre} (En tránsito)`;
            } else {
              mov.sede_actual_nombre = mov.sede_origen_nombre || 'N/A';
            }
          }

          mov.tiene_documentos = !!(mov.imagen_salida_url || mov.imagen_recepcion_url ||
            mov.firma_envio_url || mov.firma_recepcion_url);

          return mov;
        } catch (error) {
          console.error(`Error obteniendo ubicación para equipo ${mov.id_equipo}:`, error);
          mov.sede_actual_nombre = mov.estado === 'recibido' ? 
            mov.sede_destino_nombre || 'N/A' : 
            mov.sede_origen_nombre || 'N/A';
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

    // INICIAR FLUJO AUTOMÁTICO DE FOTO Y FIRMA
    const movimientoId = responseData.movimiento?.id || responseData.id;
    if (movimientoId) {
      setTimeout(() => {
        // Mostrar modal forzado para foto de salida
        mostrarModalCamaraForzada('imagen_salida', movimientoId, 'Foto obligatoria del equipo al salir');
      }, 1000);
    }

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

// ========================= SOLICITAR FIRMA Y ENVIAR =========================

async function solicitarFirmaYEnviar(movimientoId) {
  try {
    const movimiento = todosLosMovimientos.find(m => m.id == movimientoId);
    if (!movimiento) {
      mostrarMensaje('Movimiento no encontrado', true);
      return;
    }

    // Verificar si ya tiene foto y firma de salida
    if (!movimiento.imagen_salida_url || !movimiento.firma_envio_url) {
      // Mostrar modal forzado para foto de salida
      mostrarModalCamaraForzada('imagen_salida', movimientoId, 'Foto obligatoria del equipo al salir');
      return;
    }

    // Si ya tiene todo, proceder con el envío
    await actualizarEstado(movimientoId, 'enviado');

  } catch (error) {
    console.error('Error solicitando firma y enviar:', error);
    mostrarMensaje('Error al procesar envío', true);
  }
}

// ========================= ACTUALIZAR ESTADO =========================

// ========================= ACTUALIZAR ESTADO =========================

async function actualizarEstado(id, nuevoEstado) {
  const movimiento = todosLosMovimientos.find(m => m.id == id);
  if (!movimiento) {
    mostrarMensaje('Movimiento no encontrado', true);
    return;
  }

  const mensajes = {
    'enviado': '¿Confirmar envío del equipo? El responsable de recepción será notificado.',
    'recibido': '¿Confirmar recepción del equipo? Se generará el documento PDF.'
  };

  if (!confirm(mensajes[nuevoEstado] || `¿Confirmar cambio de estado a "${nuevoEstado}"?`)) return;

  try {
    console.log(`🔄 Actualizando estado del movimiento ${id} a ${nuevoEstado}...`);

    const updateData = { estado: nuevoEstado };

    if (nuevoEstado === 'recibido') {
      updateData.fecha_recepcion = new Date().toISOString().split('T')[0];

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

    const index = todosLosMovimientos.findIndex(m => m.id == id);
    if (index !== -1) {
      todosLosMovimientos[index].estado = nuevoEstado;
      if (nuevoEstado === 'recibido') {
        todosLosMovimientos[index].fecha_recepcion = updateData.fecha_recepcion;
        todosLosMovimientos[index].sede_actual_nombre = movimiento.sede_destino_nombre;
      }
    }

    const mensajeExito = {
      'enviado': '✅ Equipo marcado como ENVIADO',
      'recibido': '✅ Equipo marcado como RECIBIDO'
    };

    mostrarMensaje(mensajeExito[nuevoEstado] || `Estado actualizado a ${nuevoEstado}`);

    if (nuevoEstado === 'recibido') {
      // Generar PDF inmediatamente después de marcar como recibido
      setTimeout(async () => {
        try {
          await generarDocumentoMovimiento(id);
        } catch (error) {
          console.error('Error generando PDF:', error);
          mostrarMensaje('⚠️ PDF generado pero hubo un error en la descarga automática', true);
        }
      }, 1000);
    }

    await cargarMovimientosCompletos();

  } catch (error) {
    console.error('❌ Error actualizando estado:', error);
    mostrarMensaje(`❌ Error: ${error.message}`, true);
  }
}

// ========================= MODAL SIMPLE PARA FOTOS =========================

function mostrarModalSimple(tipo, movimientoId, titulo = '') {
  const modalHTML = `
    <div id="modal-simple" class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg w-full max-w-md">
        <div class="p-4 border-b">
          <h3 class="text-lg font-semibold">${titulo}</h3>
        </div>
        
        <div class="p-6">
          <div class="text-center mb-6">
            <div class="text-4xl text-blue-500 mb-3">
              <i class="fas fa-camera"></i>
            </div>
            <p class="text-gray-700 mb-4">Tome una foto del equipo o seleccione una imagen</p>
          </div>
          
          <div class="space-y-4">
            <button onclick="abrirCamaraSimple('${tipo}', ${movimientoId})" 
                    class="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
              <i class="fas fa-camera"></i> Tomar foto con cámara
            </button>
            
            <div class="relative">
              <input type="file" id="file-input-simple" accept="image/*" capture="environment" class="hidden">
              <button onclick="document.getElementById('file-input-simple').click()" 
                      class="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                <i class="fas fa-upload"></i> Seleccionar imagen
              </button>
            </div>
            
            <button onclick="cerrarModalSimple()" 
                    class="w-full py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Configurar input de archivo
  const fileInput = document.getElementById('file-input-simple');
  if (fileInput) {
    fileInput.addEventListener('change', async function(e) {
      if (e.target.files && e.target.files[0]) {
        await subirArchivoSimple(e.target.files[0], tipo, movimientoId);
      }
    });
  }
}

function cerrarModalSimple() {
  detenerCamara();
  const modal = document.getElementById('modal-simple');
  if (modal) modal.remove();
}

async function abrirCamaraSimple(tipo, movimientoId) {
  try {
    // Cerrar modal actual
    cerrarModalSimple();
    
    // Abrir cámara del dispositivo
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    
    // Crear nuevo modal para la cámara
    const cameraModalHTML = `
      <div id="modal-camera-simple" class="fixed inset-0 bg-black z-[100]">
        <div class="relative h-full">
          <video id="camera-live" autoplay playsinline class="w-full h-full object-cover"></video>
          <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div class="flex justify-center gap-4">
              <button onclick="capturarDesdeCamara('${tipo}', ${movimientoId})" 
                      class="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <div class="w-14 h-14 bg-white rounded-full border-4 border-gray-800"></div>
              </button>
            </div>
            <button onclick="cerrarCameraModal()" 
                    class="absolute top-4 right-4 text-white text-2xl">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', cameraModalHTML);
    
    // Configurar video
    const videoElement = document.getElementById('camera-live');
    videoElement.srcObject = stream;
    await videoElement.play();
    
  } catch (error) {
    console.error('Error abriendo cámara:', error);
    mostrarMensaje('No se pudo acceder a la cámara. Por favor, seleccione una imagen.', true);
  }
}

function cerrarCameraModal() {
  // Detener cámara
  const videoElement = document.getElementById('camera-live');
  if (videoElement && videoElement.srcObject) {
    videoElement.srcObject.getTracks().forEach(track => track.stop());
  }
  
  // Remover modal
  const modal = document.getElementById('modal-camera-simple');
  if (modal) modal.remove();
}

async function capturarDesdeCamara(tipo, movimientoId) {
  try {
    const videoElement = document.getElementById('camera-live');
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    const blob = dataURLToBlob(photoData);
    const archivo = new File([blob], `foto_${tipo}_${movimientoId}_${Date.now()}.jpg`, {
      type: 'image/jpeg'
    });
    
    // Cerrar modal de cámara
    cerrarCameraModal();
    
    // Subir imagen
    await subirArchivoSimple(archivo, tipo, movimientoId);
    
  } catch (error) {
    console.error('Error capturando foto:', error);
    mostrarMensaje('Error al capturar foto', true);
  }
}

async function subirArchivoSimple(file, tipo, movimientoId) {
  try {
    mostrarMensaje('📤 Subiendo imagen...');

    const uploadResult = await subirArchivoCloudinary(file, 'image');

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
      mostrarMensaje('✅ Imagen subida correctamente');
      
      // Cerrar modal
      cerrarModalSimple();
      
      // Si es imagen_salida, preguntar por firma_envio
      if (tipo === 'imagen_salida') {
        setTimeout(() => {
          mostrarModalFirmaSimple('firma_envio', movimientoId, 'Firma del responsable de envío');
        }, 1000);
      }
      
      // Actualizar movimiento localmente
      const movimientoIndex = todosLosMovimientos.findIndex(m => m.id == movimientoId);
      if (movimientoIndex !== -1) {
        todosLosMovimientos[movimientoIndex][`${tipo}_url`] = uploadResult.url;
      }
    } else {
      throw new Error('Error guardando imagen');
    }
  } catch (error) {
    console.error('Error subiendo imagen:', error);
    mostrarMensaje('❌ Error al subir imagen', true);
  }
}

// ========================= MODAL SIMPLE PARA FIRMAS =========================

function mostrarModalFirmaSimple(tipo, movimientoId, titulo = '') {
  const modalHTML = `
    <div id="modal-firma-simple" class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg w-full max-w-md">
        <div class="p-4 border-b">
          <h3 class="text-lg font-semibold">${titulo}</h3>
        </div>
        
        <div class="p-6">
          <div class="text-center mb-4">
            <p class="text-gray-700">Firme en el área utilizando su dedo o mouse</p>
          </div>
          
          <div class="mb-4">
            <canvas id="canvas-firma-simple" 
                    class="border-2 border-gray-300 w-full h-48 bg-white touch-none rounded"></canvas>
          </div>
          
          <div class="flex gap-2">
            <button onclick="limpiarFirmaSimple()" 
                    class="flex-1 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Limpiar
            </button>
            <button onclick="guardarFirmaSimple('${tipo}', ${movimientoId})" 
                    class="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Guardar
            </button>
            <button onclick="cerrarModalFirmaSimple()" 
                    class="flex-1 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Inicializar canvas
  setTimeout(() => {
    inicializarCanvasFirmaSimple();
  }, 100);
}

function cerrarModalFirmaSimple() {
  const modal = document.getElementById('modal-firma-simple');
  if (modal) modal.remove();
}

function inicializarCanvasFirmaSimple() {
  const canvas = document.getElementById('canvas-firma-simple');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Eventos
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

  // Touch events
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

function limpiarFirmaSimple() {
  const canvas = document.getElementById('canvas-firma-simple');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

async function guardarFirmaSimple(tipo, movimientoId) {
  try {
    const canvas = document.getElementById('canvas-firma-simple');
    if (!canvas) {
      mostrarMensaje('Error: Canvas no encontrado', true);
      return;
    }

    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const hasSignature = imageData.data.some(channel => channel !== 255);

    if (!hasSignature) {
      mostrarMensaje('Por favor, realice su firma primero', true);
      return;
    }

    const signatureData = canvas.toDataURL('image/png');
    const blob = dataURLToBlob(signatureData);
    const archivo = new File([blob], `firma_${tipo}_${movimientoId}_${Date.now()}.png`, {
      type: 'image/png'
    });

    mostrarMensaje('📤 Guardando firma...');

    const uploadResult = await subirArchivoCloudinary(archivo, 'signature');

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
      mostrarMensaje('✅ Firma guardada correctamente');
      cerrarModalFirmaSimple();
      
      const movimientoIndex = todosLosMovimientos.findIndex(m => m.id == movimientoId);
      if (movimientoIndex !== -1) {
        todosLosMovimientos[movimientoIndex][`${tipo}_url`] = uploadResult.url;
      }
    } else {
      throw new Error('Error guardando firma');
    }
  } catch (error) {
    console.error('Error guardando firma:', error);
    mostrarMensaje('❌ Error al guardar firma', true);
  }
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
                 onclick="mostrarModalSimple('imagen_salida', ${movimientoId}, 'Foto del equipo al salir')">
              <div class="text-3xl text-blue-500 mb-2">
                <i class="fas fa-camera"></i>
              </div>
              <h4 class="font-medium mb-1">Foto del equipo (Salida)</h4>
              <p class="text-sm text-gray-600">Tome foto del equipo al salir</p>
            </div>
            
            <div class="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                 onclick="mostrarModalFirmaSimple('firma_envio', ${movimientoId}, 'Firma del responsable de envío')">
              <div class="text-3xl text-green-500 mb-2">
                <i class="fas fa-signature"></i>
              </div>
              <h4 class="font-medium mb-1">Firma responsable envío</h4>
              <p class="text-sm text-gray-600">Firma digital del remitente</p>
            </div>
            
            <div class="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                 onclick="mostrarModalSimple('imagen_recepcion', ${movimientoId}, 'Foto del equipo al recibir')">
              <div class="text-3xl text-yellow-500 mb-2">
                <i class="fas fa-camera"></i>
              </div>
              <h4 class="font-medium mb-1">Foto del equipo (Recepción)</h4>
              <p class="text-sm text-gray-600">Tome foto al recibir el equipo</p>
            </div>
            
            <div class="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                 onclick="mostrarModalFirmaSimple('firma_recepcion', ${movimientoId}, 'Firma del responsable de recepción')">
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
  cargarDocumentosExistente(movimientoId);
}

// ========================= DESCARGAR ARCHIVO =========================

// ========================= DESCARGAR ARCHIVO =========================

function descargarArchivo(url, nombreArchivo) {
  try {
    if (!url) {
      mostrarMensaje('❌ No hay archivo para descargar', true);
      return;
    }

    console.log('📥 Iniciando descarga:', { url, nombreArchivo });

    // Método más confiable usando fetch
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = nombreArchivo || 'documento.pdf';
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar URL
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
        
        mostrarMensaje('✅ Descargando archivo...');
      })
      .catch(error => {
        console.error('Error con fetch:', error);
        // Fallback simple
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo || 'documento.pdf';
        link.target = '_blank';
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        mostrarMensaje('✅ Abriendo archivo para descarga...');
      });
      
  } catch (error) {
    console.error('Error descargando archivo:', error);
    // Último recurso: abrir en nueva pestaña
    window.open(url, '_blank');
    mostrarMensaje('📄 Archivo abierto en nueva pestaña. Puede descargarlo desde allí.');
  }
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

    const documentosSinImagen = [
      { 
        nombre: 'Documento PDF', 
        url: movimiento.documento_pdf_url, 
        icon: 'file-pdf',
        tipo: 'pdf' 
      }
    ];

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

// ========================= FUNCIONES RESTANTES =========================

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
            <button onclick="verDetallesMovimiento(${mov.id})" 
                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition flex items-center justify-center gap-1 text-sm w-full"
                    title="Ver detalles">
              <i class="fas fa-eye text-xs"></i>
              <span>Detalles</span>
            </button>
            
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
              <button onclick="confirmarRecepcionForzada(${mov.id})" 
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
              <button onclick="confirmarRecepcionForzada(${mov.id})" 
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
            <button onclick="confirmarRecepcionForzada(${movimiento.id})"
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

function cerrarModalDetalles() {
  const modal = document.getElementById('modal-detalles');
  if (modal) {
    modal.classList.add('hidden');
  }
}

async function generarDocumentoMovimiento(movimientoId) {
  try {
    console.log(`📄 Generando PDF para movimiento ${movimientoId}...`);
    mostrarMensaje('📄 Preparando documento PDF...', false);

    // 1. Cargar datos del movimiento
    const response = await fetch(`${API_URL}/movimientos-equipos/${movimientoId}/completo`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al cargar datos del movimiento');
    }
    
    const movimiento = await response.json();
    console.log('✅ Datos cargados:', movimiento);

    // 2. Formatear fechas
    const fechaSalida = movimiento.fecha_salida ? formatearFecha(movimiento.fecha_salida) : 'N/A';
    const fechaRecepcion = movimiento.fecha_recepcion ? formatearFecha(movimiento.fecha_recepcion) : 'Pendiente';
    const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 3. Crear contenido HTML CORREGIDO y SIMPLE
    const contenidoHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Movimiento ${movimiento.codigo_movimiento || movimientoId}</title>
        <style>
          /* ESTILOS MÍNIMOS Y SEGUROS */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000000;
            padding: 20px;
            background-color: #ffffff;
          }
          
          /* ENCABEZADO */
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 3px solid #639A33;
          }
          
          .header h1 {
            font-size: 22px;
            color: #0F172A;
            margin-bottom: 5px;
            font-weight: bold;
          }
          
          .header h2 {
            font-size: 14px;
            color: #666666;
            margin-bottom: 10px;
            font-weight: normal;
          }
          
          .codigo-movimiento {
            background-color: #f5f5f5;
            padding: 8px 15px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            display: inline-block;
            margin-top: 10px;
          }
          
          /* SECCIONES */
          .section {
            margin: 20px 0;
            page-break-inside: avoid;
          }
          
          .section-title {
            background-color: #f0f7ff;
            padding: 8px 12px;
            font-weight: bold;
            border-left: 4px solid #639A33;
            margin-bottom: 15px;
            color: #0F172A;
            font-size: 13px;
          }
          
          /* TABLA DE INFORMACIÓN */
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          
          .info-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #eeeeee;
            vertical-align: top;
          }
          
          .info-label {
            font-weight: bold;
            width: 35%;
            color: #0F172A;
          }
          
          .info-value {
            color: #000000;
          }
          
          /* ESTADOS */
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
          }
          
          .badge.pendiente {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #f59e0b;
          }
          
          .badge.enviado {
            background-color: #dbeafe;
            color: #1e40af;
            border: 1px solid #3b82f6;
          }
          
          .badge.recibido {
            background-color: #dcfce7;
            color: #166534;
            border: 1px solid #10b981;
          }
          
          /* FIRMAS */
          .firmas-container {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          
          .firma-box {
            width: 48%;
            text-align: center;
            padding: 15px;
            border: 1px solid #cccccc;
            border-radius: 5px;
          }
          
          .firma-titulo {
            font-weight: bold;
            margin-bottom: 10px;
            color: #0F172A;
          }
          
          .firma-imagen {
            max-width: 180px;
            max-height: 60px;
            margin: 10px auto;
            display: block;
            border: 1px solid #dddddd;
          }
          
          .firma-linea {
            height: 1px;
            background-color: #000000;
            margin: 15px 0 5px;
          }
          
          .firma-placeholder {
            height: 60px;
            background-color: #f9f9f9;
            border: 1px dashed #cccccc;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999999;
            font-style: italic;
            margin: 10px 0;
          }
          
          /* CAMPOS DE TEXTO */
          .texto-campo {
            background-color: #f9f9f9;
            padding: 12px;
            border-radius: 5px;
            border-left: 3px solid #639A33;
            margin: 10px 0;
            white-space: pre-line;
          }
          
          /* PIE DE PÁGINA */
          .footer {
            margin-top: 50px;
            padding-top: 10px;
            border-top: 1px solid #dddddd;
            text-align: center;
            font-size: 10px;
            color: #666666;
          }
          
          /* PARA IMPRESIÓN */
          @media print {
            body {
              padding: 10px;
              font-size: 11px;
            }
            
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <!-- ENCABEZADO -->
        <div class="header">
          <h1>ACTA DE MOVIMIENTO DE EQUIPO</h1>
          <h2>Sistema de Gestión de Inventario - SIGIPS</h2>
          <div class="codigo-movimiento">
            Código: ${movimiento.codigo_movimiento || 'N/A'} | Fecha: ${fechaGeneracion}
          </div>
        </div>
        
        <!-- INFORMACIÓN GENERAL -->
        <div class="section">
          <div class="section-title">INFORMACIÓN GENERAL</div>
          <table class="info-table">
            <tr>
              <td class="info-label">Equipo:</td>
              <td class="info-value">${movimiento.equipo_nombre || 'N/A'}</td>
            </tr>
            <tr>
              <td class="info-label">Código Interno:</td>
              <td class="info-value">${movimiento.equipo_codigo || 'N/A'}</td>
            </tr>
            <tr>
              <td class="info-label">Tipo Movimiento:</td>
              <td class="info-value">${movimiento.tipo_movimiento_nombre || 'N/A'}</td>
            </tr>
            <tr>
              <td class="info-label">Estado:</td>
              <td class="info-value">
                <span class="badge ${movimiento.estado || 'pendiente'}">
                  ${movimiento.estado ? movimiento.estado.toUpperCase() : 'PENDIENTE'}
                </span>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- FECHAS -->
        <div class="section">
          <div class="section-title">FECHAS</div>
          <table class="info-table">
            <tr>
              <td class="info-label">Fecha de Salida:</td>
              <td class="info-value">${fechaSalida}</td>
            </tr>
            <tr>
              <td class="info-label">Fecha de Recepción:</td>
              <td class="info-value">${fechaRecepcion}</td>
            </tr>
            <tr>
              <td class="info-label">Ubicación Actual:</td>
              <td class="info-value">${movimiento.sede_actual_nombre || movimiento.sede_destino_nombre || 'N/A'}</td>
            </tr>
          </table>
        </div>
        
        <!-- UBICACIONES -->
        <div class="section">
          <div class="section-title">UBICACIONES</div>
          <table class="info-table">
            <tr>
              <td class="info-label">Sede Origen:</td>
              <td class="info-value">${movimiento.sede_origen_nombre || 'N/A'}</td>
            </tr>
            <tr>
              <td class="info-label">Sede Destino:</td>
              <td class="info-value">${movimiento.sede_destino_nombre || 'N/A'}</td>
            </tr>
          </table>
        </div>
        
        <!-- RESPONSABLES -->
        <div class="section">
          <div class="section-title">RESPONSABLES</div>
          <table class="info-table">
            <tr>
              <td class="info-label">Responsable de Envío:</td>
              <td class="info-value">
                ${movimiento.responsable_envio_nombre || 'N/A'}
                ${movimiento.responsable_envio_documento ? `<br><small>Documento: ${movimiento.responsable_envio_documento}</small>` : ''}
              </td>
            </tr>
            <tr>
              <td class="info-label">Responsable de Recepción:</td>
              <td class="info-value">
                ${movimiento.responsable_recepcion_nombre || 'N/A'}
                ${movimiento.responsable_recepcion_documento ? `<br><small>Documento: ${movimiento.responsable_recepcion_documento}</small>` : ''}
              </td>
            </tr>
          </table>
        </div>
        
        <!-- MOTIVO -->
        ${movimiento.motivo ? `
        <div class="section">
          <div class="section-title">MOTIVO DEL MOVIMIENTO</div>
          <div class="texto-campo">${movimiento.motivo}</div>
        </div>
        ` : ''}
        
        <!-- OBSERVACIONES -->
        ${movimiento.observaciones ? `
        <div class="section">
          <div class="section-title">OBSERVACIONES</div>
          <div class="texto-campo">${movimiento.observaciones}</div>
        </div>
        ` : ''}
        
        <!-- ACCESORIOS -->
        ${movimiento.accesorios ? `
        <div class="section">
          <div class="section-title">ACCESORIOS ENTREGADOS</div>
          <div class="texto-campo">${movimiento.accesorios}</div>
        </div>
        ` : ''}
        
        <!-- FIRMAS -->
        <div class="section">
          <div class="section-title">FIRMAS DE CONFORMIDAD</div>
          <div class="firmas-container">
            <!-- Firma de Envío -->
            <div class="firma-box">
              <div class="firma-titulo">RESPONSABLE DE ENVÍO</div>
              ${movimiento.firma_envio_url ? 
                `<img src="${movimiento.firma_envio_url}" class="firma-imagen" 
                     onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML += '<div class=\\'firma-placeholder\\'>Firma no disponible</div>';" />` : 
                '<div class="firma-placeholder">Firma no disponible</div>'
              }
              <div class="firma-linea"></div>
              <div><strong>Nombre:</strong> ${movimiento.responsable_envio_nombre || ''}</div>
              <div><strong>Documento:</strong> ${movimiento.responsable_envio_documento || ''}</div>
              <div><small>Fecha: ${fechaSalida}</small></div>
            </div>
            
            <!-- Firma de Recepción -->
            <div class="firma-box">
              <div class="firma-titulo">RESPONSABLE DE RECEPCIÓN</div>
              ${movimiento.firma_recepcion_url ? 
                `<img src="${movimiento.firma_recepcion_url}" class="firma-imagen" 
                     onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML += '<div class=\\'firma-placeholder\\'>Firma no disponible</div>';" />` : 
                '<div class="firma-placeholder">Firma no disponible</div>'
              }
              <div class="firma-linea"></div>
              <div><strong>Nombre:</strong> ${movimiento.responsable_recepcion_nombre || ''}</div>
              <div><strong>Documento:</strong> ${movimiento.responsable_recepcion_documento || ''}</div>
              <div><small>Fecha: ${fechaRecepcion}</small></div>
            </div>
          </div>
        </div>
        
        <!-- DOCUMENTACIÓN -->
        <div class="section">
          <div class="section-title">DOCUMENTACIÓN ADJUNTA</div>
          <div class="texto-campo">
            <div style="margin: 5px 0;">${movimiento.imagen_salida_url ? '✅' : '❌'} Foto del equipo al salir</div>
            <div style="margin: 5px 0;">${movimiento.firma_envio_url ? '✅' : '❌'} Firma del responsable de envío</div>
            <div style="margin: 5px 0;">${movimiento.imagen_recepcion_url ? '✅' : '❌'} Foto del equipo al recibir</div>
            <div style="margin: 5px 0;">${movimiento.firma_recepcion_url ? '✅' : '❌'} Firma del responsable de recepción</div>
          </div>
        </div>
        
        <!-- PIE DE PÁGINA -->
        <div class="footer">
          <div>Documento generado automáticamente por el Sistema SIGIPS</div>
          <div>Fecha de generación: ${fechaGeneracion}</div>
          <div style="margin-top: 5px; font-style: italic;">
            Este documento tiene validez legal y técnica. Conservar para fines de auditoría.
          </div>
        </div>
        
        <!-- SCRIPT PARA MANEJO DE ERRORES DE IMÁGENES -->
        <script>
          // Manejar errores de carga de imágenes
          document.addEventListener('DOMContentLoaded', function() {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
              img.onerror = function() {
                this.style.display = 'none';
                const placeholder = document.createElement('div');
                placeholder.className = 'firma-placeholder';
                placeholder.textContent = 'Imagen no disponible';
                this.parentNode.insertBefore(placeholder, this.nextSibling);
              };
            });
          });
        </script>
      </body>
      </html>
    `;

    // 4. CREAR ELEMENTO TEMPORAL
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.innerHTML = contenidoHTML;
    document.body.appendChild(element);

    // 5. CONFIGURACIÓN SEGURA DE HTML2PDF
    const opt = {
      margin: [10, 10, 10, 10], // [top, right, bottom, left]
      filename: `movimiento_${movimiento.codigo_movimiento || movimientoId}_${Date.now()}.pdf`,
      image: { 
        type: 'jpeg', 
        quality: 0.95 
      },
      html2canvas: { 
        scale: 2, // Alta calidad
        useCORS: true, // Permite CORS
        logging: false, // Desactiva logs
        backgroundColor: '#FFFFFF',
        allowTaint: true, // Permite imágenes externas
        onclone: function(clonedDoc) {
          // Reemplazar imágenes que fallen con placeholders
          const images = clonedDoc.querySelectorAll('img');
          images.forEach(img => {
            // Verificar si la imagen carga
            const originalSrc = img.src;
            img.onerror = function() {
              console.warn('Imagen no cargada:', originalSrc);
              this.style.display = 'none';
              const placeholder = document.createElement('div');
              placeholder.style.cssText = `
                width: ${this.width || 180}px;
                height: ${this.height || 60}px;
                background-color: #f9f9f9;
                border: 1px dashed #ccc;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #999;
                font-style: italic;
                margin: 10px auto;
              `;
              placeholder.textContent = 'Imagen no disponible';
              this.parentNode.insertBefore(placeholder, this.nextSibling);
            };
          });
        }
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true,
        hotfixes: ['px_scaling'] // Corrige problemas de escala
      }
    };

    // 6. GENERAR PDF
    mostrarMensaje('🔄 Generando PDF...', false);
    
    console.log('Generando PDF con html2pdf...');
    const pdfBlob = await html2pdf().set(opt).from(element).toPdf().output('blob');
    
    // 7. LIMPIAR ELEMENTO TEMPORAL
    document.body.removeChild(element);
    
    console.log('✅ PDF generado como blob:', pdfBlob.size, 'bytes');

    // 8. SUBIR A CLOUDINARY
    mostrarMensaje('📤 Subiendo PDF a Cloudinary...', false);
    
    const pdfFile = new File([pdfBlob], 
      `movimiento_${movimiento.codigo_movimiento || movimientoId}.pdf`, 
      { type: 'application/pdf' }
    );

    const uploadResult = await subirArchivoCloudinary(pdfFile, 'pdf');
    console.log('✅ PDF subido a Cloudinary:', uploadResult.url);

    // 9. GUARDAR URL EN LA BASE DE DATOS
    const saveResponse = await fetch(`${API_URL}/movimientos-equipos/${movimientoId}/generar-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdf_url: uploadResult.url,
        pdf_public_id: uploadResult.public_id,
        pdf_nombre: uploadResult.nombre_original
      })
    });

    if (!saveResponse.ok) {
      throw new Error('Error guardando PDF en la base de datos');
    }

    // 10. ACTUALIZAR LOCALMENTE
    const movimientoIndex = todosLosMovimientos.findIndex(m => m.id == movimientoId);
    if (movimientoIndex !== -1) {
      todosLosMovimientos[movimientoIndex].documento_pdf_url = uploadResult.url;
    }

    // 11. DESCARGAR AUTOMÁTICAMENTE
    mostrarMensaje('✅ PDF generado correctamente. Descargando...', false);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = uploadResult.url;
    downloadLink.download = `movimiento_${movimiento.codigo_movimiento || movimientoId}.pdf`;
    downloadLink.target = '_blank';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // También abrir en nueva pestaña
    setTimeout(() => {
      window.open(uploadResult.url, '_blank');
    }, 500);

    // 12. ACTUALIZAR INTERFAZ
    setTimeout(() => {
      mostrarMensaje('✅ PDF generado y descargado exitosamente');
    }, 1000);

  } catch (error) {
    console.error('❌ ERROR en generarDocumentoMovimiento:', error);
    
    // Mostrar error específico
    let mensajeError = 'Error al generar PDF';
    if (error.message.includes('NetworkError')) {
      mensajeError = 'Error de red. Verifique su conexión.';
    } else if (error.message.includes('CORS')) {
      mensajeError = 'Error de CORS. Las imágenes no se pueden cargar.';
    } else if (error.message.includes('html2pdf')) {
      mensajeError = 'Error en la generación del PDF. Intente nuevamente.';
    }
    
    mostrarMensaje(`❌ ${mensajeError}: ${error.message}`, true);
    
    // Limpiar elementos temporales
    const tempElements = document.querySelectorAll('div[style*="position: absolute"]');
    tempElements.forEach(el => {
      if (el.style.left === '-9999px') {
        document.body.removeChild(el);
      }
    });
  }
}

// ========================= FUNCIÓN AUXILIAR PARA DESCARGAR PDF AUTOMÁTICAMENTE =========================

async function descargarPDFAutomaticamente(url, nombreArchivo) {
  try {
    console.log('📥 Descargando PDF automáticamente...', { url, nombreArchivo });

    // Crear un enlace invisible y simular clic
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.target = '_blank';
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // También abrir en nueva pestaña para verificación
    window.open(url, '_blank', 'noopener,noreferrer');

    mostrarMensaje('✅ PDF generado y descargado automáticamente');
    
  } catch (error) {
    console.error('❌ Error en descarga automática:', error);
    
    // Fallback: Solo abrir en nueva pestaña
    window.open(url, '_blank', 'noopener,noreferrer');
    mostrarMensaje('✅ PDF generado. Si no se descarga automáticamente, haga clic en el enlace para descargar.');
  }
}

// ========================= AMPLIAR IMAGEN =========================

function ampliarImagen(url, titulo) {
  if (!url) {
    mostrarMensaje('No hay imagen para mostrar', true);
    return;
  }

  const modalHTML = `
    <div id="modal-imagen-completa" class="fixed inset-0 bg-black bg-opacity-90 z-[100] flex flex-col items-center justify-center p-4">
      <div class="w-full max-w-6xl max-h-[90vh] flex flex-col">
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
        
        <div class="bg-black flex-1 overflow-hidden rounded-b-lg">
          <img src="${url}" 
               alt="${titulo}" 
               class="w-full h-full object-contain"
               id="imagen-ampliada"
               onload="console.log('Imagen cargada correctamente')"
               onerror="console.error('Error cargando imagen'); this.src='https://via.placeholder.com/800x600/cccccc/969696?text=Imagen+no+disponible'">
        </div>
        
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
  
  const modalAnterior = document.getElementById('modal-imagen-completa');
  if (modalAnterior) {
    modalAnterior.remove();
  }
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
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

// Añadir estilo para animación
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
window.generarDocumentoMovimiento = generarDocumentoMovimiento;
window.mostrarModalSimple = mostrarModalSimple;
window.mostrarModalFirmaSimple = mostrarModalFirmaSimple;
window.mostrarModalCamaraForzada = mostrarModalCamaraForzada;
window.confirmarRecepcionForzada = confirmarRecepcionForzada;
window.solicitarFirmaYEnviar = solicitarFirmaYEnviar;
window.mostrarModalAdjuntos = mostrarModalAdjuntos;
window.cerrarModalAdjuntos = cerrarModalAdjuntos;
window.ampliarImagen = ampliarImagen;
window.descargarArchivo = descargarArchivo;
window.procesarFotoForzada = procesarFotoForzada;
window.guardarFirmaForzada = guardarFirmaForzada;
window.limpiarFirmaForzada = limpiarFirmaForzada;
window.cerrarModalDetalles = cerrarModalDetalles;
window.cerrarModalSimple = cerrarModalSimple;
window.cerrarCameraModal = cerrarCameraModal;
window.capturarDesdeCamara = capturarDesdeCamara;
window.subirArchivoSimple = subirArchivoSimple;
window.abrirCamaraSimple = abrirCamaraSimple;
window.guardarFirmaSimple = guardarFirmaSimple;
window.limpiarFirmaSimple = limpiarFirmaSimple;
window.cerrarModalFirmaSimple = cerrarModalFirmaSimple;