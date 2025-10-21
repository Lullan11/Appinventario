// API Base URL
const API_URL = "https://inventario-api-gw73.onrender.com";
const API_EQUIPOS = `${API_URL}/equipos`;
const API_MANTENIMIENTOS = `${API_URL}/mantenimientos`;
const API_TIPOS_EQUIPO = `${API_URL}/tipos-equipo`;
const API_TIPOS_MANTENIMIENTO = `${API_URL}/tipos-mantenimiento`;

// Configuración de Google Drive - ¡REMPLAZA ESTOS DATOS!
const GOOGLE_DRIVE_CONFIG = {
  CLIENT_ID: "570589687449-vkvoc9qtufhh3a2mugea1jck2h5sjh8d.apps.googleusercontent.com",
  // API_KEY: "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",
  FOLDER_ID: "14FaIoldyTKWX_MUaHM5twHIgWdO1RHeS",
  SCOPES: "https://www.googleapis.com/auth/drive.file",
  DISCOVERY_DOC: "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
};

// Variables globales
let currentEquipo = null;
let mantenimientosRealizados = [];
let tiposMantenimiento = [];
let mantenimientosProgramados = [];
let googleTokenClient = null;

// Verificar si QRCode está disponible
function isQRCodeAvailable() {
  return typeof QRCode !== 'undefined' && QRCode.toCanvas;
}

// ✅ INICIALIZAR GOOGLE DRIVE
// ✅ FUNCIÓN SIMPLIFICADA SIN API KEY
async function initializeGoogleDrive() {
  try {
    // Verificar disponibilidad
    if (!window.gapi) {
      throw new Error('Google API no está disponible');
    }

    // Si ya está inicializado, retornar
    if (gapi.client && gapi.client.drive) {
      console.log('✅ Google Drive API ya está inicializada');
      return;
    }

    console.log('🔄 Cargando cliente de Google API...');

    // Cargar el cliente sin API Key problemática
    await new Promise((resolve, reject) => {
      gapi.load('client', {
        callback: resolve,
        onerror: reject
      });
    });

    console.log('✅ Cliente de Google API cargado');

    // Inicializar solo con discovery docs (sin API Key)
    await gapi.client.init({
      discoveryDocs: [GOOGLE_DRIVE_CONFIG.DISCOVERY_DOC],
    });

    console.log('✅ Google Drive API inicializada correctamente (sin API Key)');
    
  } catch (error) {
    console.error('❌ Error inicializando Google Drive:', error);
    
    // Si falla la inicialización, continuamos sin Google Drive
    throw new Error('Google Drive no disponible. Usando almacenamiento local.');
  }
}

// ✅ AUTENTICAR CON GOOGLE DRIVE
// ✅ FUNCIÓN MEJORADA: Autenticar con Google Drive
async function authenticateGoogleDrive() {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error('Google Identity Services no está disponible'));
      return;
    }

    // Verificar si ya tenemos un token válido
    const existingToken = gapi.auth?.getToken();
    if (existingToken && existingToken.expires_at > Date.now()) {
      console.log('✅ Usando token existente');
      resolve(existingToken.access_token);
      return;
    }

    googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
      scope: GOOGLE_DRIVE_CONFIG.SCOPES,
      prompt: 'consent', // Forzar consentimiento
      callback: async (response) => {
        if (response.error) {
          console.error('❌ Error de autenticación:', response);
          
          if (response.error === 'popup_closed') {
            reject(new Error('El usuario cerró la ventana de autenticación'));
          } else if (response.error === 'access_denied') {
            reject(new Error('Acceso denegado por el usuario'));
          } else {
            reject(new Error(response.error));
          }
          return;
        }
        
        console.log('✅ Autenticación exitosa con Google Drive');
        mostrarMensaje('✅ Conectado a Google Drive');
        resolve(response.access_token);
      },
    });

    // Solicitar token
    googleTokenClient.requestAccessToken();
  });
}

// ✅ FUNCIÓN MEJORADA: Subir archivo a Google Drive
async function subirArchivoGoogleDrive(archivo, tipo = 'pdf', equipoId = null) {
  try {
    console.log('📤 Subiendo archivo a Google Drive...');

    // Validar que sea PDF
    if (tipo === 'pdf' && archivo.type !== 'application/pdf') {
      throw new Error('Solo se permiten archivos PDF');
    }

    // Autenticar con Google Drive
    await authenticateGoogleDrive();

    // Crear metadata del archivo
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = equipoId
      ? `mantenimiento_${currentEquipo.codigo_interno}_${fecha}.pdf`
      : `documento_${fecha}.pdf`;

    const metadata = {
      name: nombreArchivo,
      mimeType: 'application/pdf',
      parents: [GOOGLE_DRIVE_CONFIG.FOLDER_ID]
    };

    // Crear form data para la subida
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', archivo);

    // Obtener token de acceso
    const token = gapi.auth.getToken().access_token;

    // Subir archivo a Google Drive
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error al subir archivo');
    }

    const fileData = await response.json();
    console.log('✅ Archivo subido a Google Drive:', fileData);

    // Hacer el archivo público
    await hacerArchivoPublico(fileData.id);

    // Crear URLs de acceso
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileData.id}`;
    const viewUrl = `https://drive.google.com/file/d/${fileData.id}/view`;

    return {
      id: fileData.id,
      nombre: fileData.name,
      url: downloadUrl,
      viewUrl: viewUrl,
      webViewLink: fileData.webViewLink,
      storage: 'google_drive'
    };

  } catch (error) {
    console.error('❌ Error subiendo archivo a Google Drive:', error);
    throw error;
  }
}

// ✅ SISTEMA HÍBRIDO: Google Drive con respaldo local
async function subirArchivoConRespaldo(archivo, tipo = 'pdf', equipoId = null) {
  try {
    console.log('📤 Intentando subir archivo a Google Drive...');
    
    // Primero intentamos con Google Drive
    return await subirArchivoGoogleDrive(archivo, tipo, equipoId);
    
  } catch (error) {
    console.warn('⚠️ Google Drive falló, usando respaldo local:', error);
    
    // Respaldar en almacenamiento local
    return await subirArchivoLocal(archivo, tipo, equipoId);
  }
}

// ✅ ALMACENAMIENTO LOCAL COMO RESPALDO
async function subirArchivoLocal(archivo, tipo = 'pdf', equipoId = null) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = equipoId
          ? `mantenimiento_${currentEquipo.codigo_interno}_${fecha}.pdf`
          : `documento_${fecha}.pdf`;

        // Crear objeto de archivo local
        const fileData = {
          id: 'local_' + Date.now(),
          nombre: nombreArchivo,
          url: e.target.result, // Data URL
          viewUrl: e.target.result,
          storage: 'local',
          blob: e.target.result,
          fecha_subida: new Date().toISOString()
        };

        console.log('✅ Archivo guardado localmente:', fileData);
        resolve(fileData);
      };

      reader.onerror = function(error) {
        reject(new Error('Error al leer el archivo: ' + error));
      };

      reader.readAsDataURL(archivo);
      
    } catch (error) {
      reject(new Error('Error en almacenamiento local: ' + error.message));
    }
  });
}

// ✅ FUNCIÓN: Hacer archivo público en Google Drive
async function hacerArchivoPublico(fileId) {
  try {
    const response = await gapi.client.drive.permissions.create({
      fileId: fileId,
      resource: {
        role: 'reader',
        type: 'anyone'
      }
    });
    console.log('✅ Archivo hecho público:', response);
    return response;
  } catch (error) {
    console.warn('⚠️ No se pudo hacer el archivo público:', error);
    return null;
  }
}

// ✅ FUNCIÓN MEJORADA: Descargar documento (soporta local y Google Drive)
async function descargarDocumento(url, nombreArchivo, storageType = 'google_drive') {
  if (!url) {
    mostrarMensaje('❌ No hay documento disponible', true);
    return false;
  }

  try {
    console.log('📥 Iniciando descarga...');

    if (storageType === 'local') {
      // Para archivos locales (Data URL)
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo || `documento_${Date.now()}.pdf`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Documento local descargado correctamente');
      mostrarMensaje('✅ Documento descargado correctamente');
      return true;
    } else {
      // Para Google Drive (tu código existente)
      return await descargarDeGoogleDrive(url, nombreArchivo);
    }

  } catch (error) {
    console.error('❌ Error en descarga:', error);
    
    // Fallback: abrir en nueva pestaña
    window.open(url, '_blank');
    mostrarMensaje('📄 Documento abierto en nueva pestaña. Use Ctrl+S para guardar.');
    return false;
  }
}

// ✅ FUNCIÓN AUXILIAR: Descargar de Google Drive
async function descargarDeGoogleDrive(url, nombreArchivo) {
  try {
    // Extraer ID del archivo de la URL
    const fileId = extraerFileIdDeUrl(url);
    if (!fileId) {
      throw new Error('No se pudo obtener el ID del archivo');
    }

    // Si estamos autenticados, intentar descarga directa
    if (gapi.auth.getToken()) {
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${gapi.auth.getToken().access_token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = nombreArchivo || `documento_${Date.now()}.pdf`;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpiar URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        mostrarMensaje('✅ Documento descargado correctamente');
        return true;
      }
    }

    // Fallback: abrir en nueva pestaña
    const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
    window.open(viewUrl, '_blank');
    mostrarMensaje('📄 Documento abierto en Google Drive. Use "Descargar" en Drive.');
    return true;

  } catch (error) {
    console.error('❌ Error descargando de Google Drive:', error);

    // Último fallback: usar enlace de descarga directa
    const fileId = extraerFileIdDeUrl(url);
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    window.open(directUrl, '_blank');
    mostrarMensaje('📄 Documento abierto para descarga');
    return false;
  }
}

// ✅ FUNCIÓN AUXILIAR: Extraer ID de archivo de URL de Google Drive
function extraerFileIdDeUrl(url) {
  const patterns = [
    /\/file\/d\/([^\/]+)/,
    /id=([^&]+)/,
    /\/d\/([^\/]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// ✅ FUNCIÓN ACTUALIZADA: Guardar mantenimiento con sistema híbrido
async function guardarMantenimiento() {
  const tipo = document.getElementById('mantenimiento-tipo')?.value;
  const id = document.getElementById('mantenimiento-id')?.value;

  if (tipo === 'edicion' && id) {
    await actualizarMantenimiento();
    return;
  }

  const idMantenimientoProgramado = document.getElementById('id-mantenimiento-programado')?.value;
  const fechaRealizado = document.getElementById('fecha-realizado')?.value;
  const descripcion = document.getElementById('descripcion-mantenimiento')?.value;
  const realizadoPor = document.getElementById('realizado-por')?.value;
  const observaciones = document.getElementById('observaciones-mantenimiento')?.value;

  if (!fechaRealizado || !descripcion || !realizadoPor) {
    mostrarMensaje('❌ Complete todos los campos requeridos', true);
    return;
  }

  try {
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
      return;
    }

    let nombrePersonalizado = '';
    if (idMantenimientoProgramado) {
      const mantenimientoProgramado = mantenimientosProgramados.find(mp => mp.id == idMantenimientoProgramado);
      if (mantenimientoProgramado && mantenimientoProgramado.nombre_personalizado) {
        nombrePersonalizado = mantenimientoProgramado.nombre_personalizado;
      }
    }

    const mantenimientoData = {
      id_equipo: currentEquipo.id,
      id_tipo: tipoMantenimiento.id,
      fecha_realizado: fechaRealizado,
      descripcion: descripcion,
      realizado_por: realizadoPor,
      observaciones: observaciones,
      estado: 'realizado',
      nombre_personalizado: nombrePersonalizado || tipoMantenimiento.nombre
    };

    if (tipo !== 'correctivo' && idMantenimientoProgramado) {
      const fechaProgramada = document.getElementById('fecha-programada')?.value;
      mantenimientoData.fecha_programada = fechaProgramada || fechaRealizado;
      mantenimientoData.id_mantenimiento_programado = parseInt(idMantenimientoProgramado);
    }

    const archivoDocumento = document.getElementById('documento-mantenimiento')?.files[0];

    if (archivoDocumento) {
      mostrarMensaje('📤 Subiendo documento...');

      try {
        if (archivoDocumento.type !== 'application/pdf') {
          throw new Error('Solo se permiten archivos PDF');
        }

        // ✅ USA SISTEMA HÍBRIDO (Google Drive + Respaldo local)
        const documentoSubido = await subirArchivoConRespaldo(archivoDocumento, 'pdf', currentEquipo.id);

        mantenimientoData.documento_url = documentoSubido.url;
        mantenimientoData.documento_view_url = documentoSubido.viewUrl;
        mantenimientoData.documento_id = documentoSubido.id;
        mantenimientoData.documento_storage = documentoSubido.storage;

        if (documentoSubido.storage === 'local') {
          mostrarMensaje('✅ Documento guardado localmente (Google Drive no disponible)');
        } else {
          mostrarMensaje('✅ Documento subido a Google Drive correctamente');
        }

      } catch (error) {
        console.error('Error subiendo documento:', error);
        mostrarMensaje(`❌ Error al subir documento: ${error.message}`, true);
        return;
      }
    }

    console.log('📤 Enviando datos al servidor:', mantenimientoData);

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
    console.log('✅ Respuesta del servidor:', result);

    const esValidacion = tipo !== 'correctivo';
    mostrarMensaje(esValidacion ? '✅ Mantenimiento validado correctamente' : '✅ Correctivo agregado correctamente');
    cerrarModalMantenimiento();

    await cargarMantenimientosRealizados(currentEquipo.id);
    await cargarMantenimientosProgramados(currentEquipo.id);

  } catch (error) {
    console.error('❌ Error guardando mantenimiento:', error);
    mostrarMensaje('❌ Error al guardar mantenimiento: ' + error.message, true);
  }
}

// ✅ FUNCIÓN ACTUALIZADA: Actualizar mantenimiento con Google Drive
async function actualizarMantenimiento() {
  const id = document.getElementById('mantenimiento-id')?.value;
  const fechaRealizado = document.getElementById('fecha-realizado')?.value;
  const descripcion = document.getElementById('descripcion-mantenimiento')?.value;
  const realizadoPor = document.getElementById('realizado-por')?.value;
  const observaciones = document.getElementById('observaciones-mantenimiento')?.value;
  const archivoDocumento = document.getElementById('documento-mantenimiento')?.files[0];

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

    if (archivoDocumento) {
      mostrarMensaje('📤 Subiendo nuevo documento a Google Drive...');

      try {
        if (archivoDocumento.type !== 'application/pdf') {
          throw new Error('Solo se permiten archivos PDF');
        }

        const documentoSubido = await subirArchivoGoogleDrive(archivoDocumento, 'pdf', currentEquipo.id);

        mantenimientoData.documento_url = documentoSubido.url;
        mantenimientoData.documento_view_url = documentoSubido.viewUrl;
        mantenimientoData.documento_id = documentoSubido.id;
        mantenimientoData.documento_storage = 'google_drive';

        mostrarMensaje('✅ Documento actualizado en Google Drive');
      } catch (error) {
        mostrarMensaje(`❌ Error al subir documento: ${error.message}`, true);
        return;
      }
    }

    const response = await fetch(`${API_MANTENIMIENTOS}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mantenimientoData)
    });

    if (!response.ok) throw new Error('Error al actualizar mantenimiento');

    mostrarMensaje('✅ Mantenimiento actualizado correctamente');
    cerrarModalMantenimiento();

    await cargarMantenimientosRealizados(currentEquipo.id);

  } catch (error) {
    console.error('Error actualizando mantenimiento:', error);
    mostrarMensaje('❌ Error al actualizar mantenimiento', true);
  }
}

// ✅ INICIALIZACIÓN MEJORADA CON MANEJO DE ERRORES
document.addEventListener("DOMContentLoaded", async () => {
  const equipoId = getEquipoIdFromUrl();
  if (!equipoId) {
    mostrarMensaje("❌ No se proporcionó un ID de equipo", true);
    return;
  }

  try {
    console.log('🔄 Iniciando aplicación...');
    
    // Intentar inicializar Google Drive (pero no es crítico)
    try {
      await initializeGoogleDrive();
      console.log('✅ Google Drive configurado correctamente');
    } catch (error) {
      console.warn('⚠️ Google Drive no disponible:', error.message);
      // No mostramos mensaje de error aquí, continuamos silenciosamente
    }

    // Cargar datos esenciales (esto SI es crítico)
    await cargarTiposMantenimiento();
    await cargarDatosEquipo(equipoId);
    await cargarMantenimientosProgramados(equipoId);
    await cargarMantenimientosRealizados(equipoId);
    configurarEventos();
    configurarTabs();
    
    console.log('✅ Aplicación cargada correctamente');
    mostrarMensaje('✅ Sistema cargado correctamente');
    
  } catch (error) {
    console.error('❌ Error crítico cargando la aplicación:', error);
    mostrarMensaje('❌ Error al cargar los datos del equipo', true);
  }
});

// ====================================================================
// 🎯 EL RESTO DE TUS FUNCIONES PERMANECEN IGUALES
// ====================================================================

// ✅ FUNCIÓN ÚNICA Y CORREGIDA: Generar QR con GitHub Pages
async function generarQR() {
  if (!currentEquipo) {
    mostrarMensaje('❌ No hay información del equipo', true);
    return;
  }

  const modal = document.getElementById('modal-qr');
  const qrContainer = document.getElementById('qr-code');
  const linkContainer = document.getElementById('github-link-container');

  if (!modal || !qrContainer || !linkContainer) {
    console.error('❌ No se encontró el modal QR o los contenedores');
    return;
  }

  try {
    mostrarMensaje('🔳 Generando código QR con GitHub Pages...');

    // Limpiar contenedores previos
    qrContainer.innerHTML = '<div class="text-gray-500">Generando QR...</div>';
    linkContainer.innerHTML = '';

    // ✅ OBTENER URL DE GITHUB PAGES
    const githubPagesUrl = obtenerUrlGitHubPages();

    if (!githubPagesUrl) {
      throw new Error('No se pudo generar la URL de GitHub Pages');
    }

    // Actualizar información del equipo en el modal
    document.getElementById('qr-codigo').textContent = currentEquipo.codigo_interno || '-';
    document.getElementById('qr-nombre').textContent = currentEquipo.nombre || '-';
    document.getElementById('qr-responsable').textContent = currentEquipo.responsable_nombre || 'No asignado';
    document.getElementById('qr-ubicacion').textContent = construirUbicacionCompleta(currentEquipo);

    // ✅ AGREGAR LINK DE GITHUB PAGES AL CONTENEDOR CORRECTO
    linkContainer.innerHTML = `
      <a href="${githubPagesUrl}" target="_blank" 
         class="text-xs text-green-600 hover:text-green-800 break-all hover:underline block bg-white p-2 rounded border">
        ${githubPagesUrl}
      </a>
    `;

    // Generar QR con la URL de GitHub Pages
    if (isQRCodeAvailable()) {
      generarQRConLibreria(githubPagesUrl, qrContainer, modal);
    } else {
      generarQRConAPI(githubPagesUrl, qrContainer, modal);
    }

  } catch (error) {
    console.error('Error generando QR con GitHub Pages:', error);
    mostrarMensaje('❌ Error al generar QR: ' + error.message, true);
    qrContainer.innerHTML = '<div class="text-red-500">Error generando QR</div>';
  }
}

// ✅ FUNCIÓN: Obtener URL de GitHub Pages
function obtenerUrlGitHubPages() {
  try {
    const usuarioGitHub = "Lullan11";
    const nombreRepositorio = "Appinventario";
    const baseUrl = `https://${usuarioGitHub}.github.io/${nombreRepositorio}`;
    return `${baseUrl}/views/ver-equipo-publico.html?id=${currentEquipo.id}`;
  } catch (error) {
    console.warn('Error obteniendo URL GitHub Pages:', error);
    return null;
  }
}

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

// ✅ FUNCIÓN MEJORADA CON DEBUGGING: Descargar QR
function descargarQR() {
  console.log('🔍 Iniciando descarga de QR...');

  if (!currentEquipo) {
    mostrarMensaje('❌ No hay equipo seleccionado', true);
    return;
  }

  const qrContainer = document.getElementById('qr-code');
  const canvas = qrContainer?.querySelector('canvas');
  const img = qrContainer?.querySelector('img');

  if (!canvas && !img) {
    mostrarMensaje('❌ No hay QR para descargar. Primero genera el QR.', true);
    return;
  }

  const fecha = new Date().toISOString().split('T')[0];
  const nombreArchivo = `QR_${currentEquipo.codigo_interno || 'equipo'}_${fecha}.png`;

  if (canvas) {
    try {
      const link = document.createElement('a');
      link.download = nombreArchivo;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      mostrarMensaje('✅ QR descargado correctamente');
    } catch (error) {
      console.error('Error con canvas:', error);
      mostrarMensaje('❌ Error al descargar QR', true);
    }
  } else if (img) {
    descargarImagenConFetch(img.src, nombreArchivo);
  }
}

// ✅ FUNCIÓN PARA DESCARGAR IMÁGENES CON CORS
async function descargarImagenConFetch(url, nombreArchivo) {
  try {
    mostrarMensaje('⏳ Preparando descarga...');

    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = nombreArchivo;
    link.href = blobUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    mostrarMensaje('✅ QR descargado correctamente');
  } catch (error) {
    console.error('Error con fetch:', error);
    const link = document.createElement('a');
    link.download = nombreArchivo;
    link.href = url;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarMensaje('✅ QR descargado (abre en nueva pestaña)');
  }
}

// ✅ FUNCIÓN MEJORADA: Generar QR con mejor manejo
function generarQRConLibreria(qrData, qrContainer, modal) {
  const tamaño = 250;

  console.log('🎨 Generando QR con librería...');

  QRCode.toCanvas(qrData, {
    width: tamaño,
    height: tamaño,
    margin: 2,
    colorDark: '#000000',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.Q
  }, function (err, canvas) {
    if (err) {
      console.error('❌ Error con librería QR:', err);
      generarQRConAPI(qrData, qrContainer, modal);
      return;
    }

    console.log('✅ QR generado correctamente con canvas');
    canvas.classList.add('mx-auto', 'shadow-sm', 'rounded');
    qrContainer.innerHTML = '';
    qrContainer.appendChild(canvas);
    modal.classList.remove('hidden');
    mostrarMensaje('✅ QR generado correctamente');
  });
}

// ✅ FUNCIÓN MEJORADA: API externa
function generarQRConAPI(qrData, qrContainer, modal) {
  const encodedData = encodeURIComponent(qrData);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&format=png&data=${encodedData}&charset-source=UTF-8`;

  console.log('🌐 Generando QR con API externa...');

  const img = document.createElement('img');
  img.crossOrigin = 'anonymous';
  img.src = qrUrl;
  img.alt = 'Código QR del equipo';
  img.className = 'mx-auto rounded shadow-sm';

  img.onload = () => {
    console.log('✅ QR generado correctamente con imagen');
    qrContainer.innerHTML = '';
    qrContainer.appendChild(img);
    modal.classList.remove('hidden');
    mostrarMensaje('✅ QR generado correctamente');
  };

  img.onerror = () => {
    console.error('❌ Error cargando imagen QR');
    generarQRConLibreria(qrData, qrContainer, modal);
  };
}

// ✅ FUNCIÓN: Cerrar modal QR
function cerrarModalQR() {
  const modal = document.getElementById('modal-qr');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Obtener ID de equipo desde la URL
function getEquipoIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// ✅ FUNCIÓN MEJORADA: Formatear fecha
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

// ✅ Obtener fecha actual
function getCurrentDate() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ✅ Verificar estado del mantenimiento
function getEstadoMantenimiento(fechaProgramada) {
  if (!fechaProgramada) return { estado: 'sin-fecha', texto: '', clase: '' };

  const hoy = new Date();
  const fechaMantenimiento = new Date(fechaProgramada);
  const diferencia = fechaMantenimiento - hoy;
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

  if (dias < 0) {
    return {
      estado: 'vencido',
      texto: '<span class="estado-vencido">VENCIDO</span>',
      clase: 'mantenimiento-vencido'
    };
  } else if (dias <= 30) {
    return {
      estado: 'proximo',
      texto: `<span class="estado-proximo">PRÓXIMO (${dias} días)</span>`,
      clase: 'mantenimiento-proximo'
    };
  } else {
    return {
      estado: 'al-dia',
      texto: '<span class="estado-al-dia">AL DÍA</span>',
      clase: 'mantenimiento-al-dia'
    };
  }
}

// Configurar tabs
function configurarTabs() {
  const tabs = document.querySelectorAll('.tab-button');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('tab-active'));
      tab.classList.add('tab-active');

      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
      });

      const tabId = tab.getAttribute('data-tab');
      document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    });
  });
}

// Cargar tipos de mantenimiento
async function cargarTiposMantenimiento() {
  try {
    const res = await fetch(`${API_TIPOS_MANTENIMIENTO}/todos`);
    if (res.ok) {
      tiposMantenimiento = await res.json();
      console.log("✅ Tipos de mantenimiento cargados:", tiposMantenimiento);
    } else {
      throw new Error(`Error HTTP: ${res.status}`);
    }
  } catch (err) {
    console.error("❌ No se pudo cargar tipos de mantenimiento:", err);
    tiposMantenimiento = [
      { id: 1, nombre: "Preventivo" },
      { id: 2, nombre: "Correctivo" },
      { id: 3, nombre: "Calibración" }
    ];
  }
}

// Cargar datos del equipo
async function cargarDatosEquipo(equipoId) {
  try {
    const res = await fetch(`${API_EQUIPOS}/${equipoId}/completo`);
    if (!res.ok) throw new Error("No se pudo cargar el equipo");

    const equipo = await res.json();
    currentEquipo = equipo;

    try {
      const resTipos = await fetch(API_TIPOS_EQUIPO);
      if (resTipos.ok) {
        const tipos = await resTipos.json();
        const tipo = tipos.find(t => t.id == equipo.id_tipo_equipo);
        if (tipo) {
          equipo.tipo_nombre = tipo.nombre;
          equipo.tipo_campos = tipo.campos || [];
        }
      }
    } catch (err) {
      console.warn("No se pudo cargar tipos de equipo:", err);
    }

    renderInfoEquipo(equipo);

  } catch (err) {
    console.error("Error al cargar equipo:", err);
    mostrarMensaje("❌ Error al cargar los detalles del equipo", true);
  }
}

// Cargar mantenimientos programados
async function cargarMantenimientosProgramados(equipoId) {
  try {
    const res = await fetch(`${API_EQUIPOS}/${equipoId}/mantenimientos`);
    if (res.ok) {
      mantenimientosProgramados = await res.json();
      console.log("✅ Mantenimientos programados cargados:", mantenimientosProgramados);
      actualizarProximosMantenimientos();
    } else {
      console.warn("No hay mantenimientos programados o error al cargar");
      mantenimientosProgramados = [];
    }
  } catch (err) {
    console.error("No se pudieron cargar mantenimientos programados:", err);
    mantenimientosProgramados = [];
  }
}

// Cargar mantenimientos realizados
async function cargarMantenimientosRealizados(equipoId) {
  try {
    const res = await fetch(`${API_MANTENIMIENTOS}/equipo/${equipoId}`);
    if (!res.ok) throw new Error("No se pudieron cargar los mantenimientos");

    mantenimientosRealizados = await res.json();
    console.log("✅ Mantenimientos realizados cargados:", mantenimientosRealizados);
    renderMantenimientos();
    actualizarContadores();

  } catch (err) {
    console.error("Error cargando mantenimientos:", err);
    mostrarMensaje("❌ Error cargando mantenimientos", true);
  }
}

// Renderizar información del equipo
function renderInfoEquipo(equipo) {
  const contenedor = document.getElementById("info-equipo");
  if (!contenedor) return;

  const ubicacionTexto = construirUbicacionCompleta(equipo);
  const tipoNombre = equipo.tipo_nombre || (equipo.id_tipo_equipo ? `ID ${equipo.id_tipo_equipo}` : "-");

  contenedor.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <p><strong>Código:</strong> ${equipo.codigo_interno || "-"}</p>
        <p><strong>Nombre:</strong> ${equipo.nombre || "-"}</p>
        <p><strong>Descripción:</strong> ${equipo.descripcion || "-"}</p>
        <p><strong>Responsable:</strong> ${equipo.responsable_nombre || "-"} ${equipo.responsable_documento ? `(${equipo.responsable_documento})` : ""}</p>
        <p><strong>Ubicación:</strong> ${ubicacionTexto}</p>
      </div>
      <div class="space-y-2">
        <p><strong>Tipo de equipo:</strong> ${tipoNombre}</p>
        <p><strong>Estado:</strong> <span class="${equipo.estado === 'activo' ? 'text-green-600' : 'text-red-600'} font-semibold">${equipo.estado?.toUpperCase() || "-"}</span></p>
        ${equipo.imagen_url ? `
          <div class="mt-2">
            <strong>Imagen:</strong><br>
            <img src="${equipo.imagen_url}" alt="Imagen del equipo" class="preview-imagen mt-1">
          </div>
        ` : ''}
      </div>
    </div>
  `;

  const camposDiv = document.createElement("div");
  camposDiv.className = "mt-4 border-t pt-4";
  camposDiv.innerHTML = `<h3 class="font-semibold text-lg mb-2">📋 Especificaciones</h3>`;

  const camposPersonalizados = equipo.campos_personalizados || {};

  if (Object.keys(camposPersonalizados).length > 0) {
    Object.entries(camposPersonalizados).forEach(([clave, valor]) => {
      if (valor) {
        const p = document.createElement("p");
        p.innerHTML = `<strong>${clave}:</strong> ${valor}`;
        camposDiv.appendChild(p);
      }
    });
  } else {
    camposDiv.innerHTML += "<p class='text-gray-500'>No hay especificaciones técnicas registradas</p>";
  }

  contenedor.appendChild(camposDiv);

  const editarBtn = document.getElementById("editar-btn");
  if (editarBtn) {
    editarBtn.onclick = () => window.location.href = `editarEquipo.html?id=${equipo.id}`;
  }
}

// Renderizar mantenimientos realizados
function renderMantenimientos() {
  renderMantenimientosPorTipo('preventivo', 'tabla-preventivos');
  renderMantenimientosPorTipo('calibracion', 'tabla-calibraciones');
  renderMantenimientosPorTipo('correctivo', 'tabla-correctivos');
}

// ✅ ACTUALIZADO: Renderizar mantenimientos por tipo con soporte local
function renderMantenimientosPorTipo(tipo, tablaId) {
  const tbody = document.getElementById(tablaId);
  if (!tbody) return;

  const mantenimientosFiltrados = mantenimientosRealizados.filter(m => {
    const tipoMantenimiento = tiposMantenimiento.find(t => t.id === m.id_tipo);
    if (!tipoMantenimiento) return false;

    const tipoNombre = tipoMantenimiento.nombre.toLowerCase();
    const tipoBuscado = tipo.toLowerCase();

    return (tipoBuscado === 'preventivo' && tipoNombre.includes('preventivo')) ||
      (tipoBuscado === 'calibracion' && (tipoNombre.includes('calibración') || tipoNombre.includes('calibracion'))) ||
      (tipoBuscado === 'correctivo' && tipoNombre.includes('correctivo'));
  }).sort((a, b) => new Date(b.fecha_realizado) - new Date(a.fecha_realizado));

  if (mantenimientosFiltrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-gray-500">
          No hay mantenimientos ${tipo === 'preventivo' ? 'preventivos' : tipo === 'calibracion' ? 'de calibración' : 'correctivos'} registrados
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = mantenimientosFiltrados.map(mant => {
    const fechaRealizado = mant.fecha_realizado ? formatDateToDDMMYYYY(mant.fecha_realizado) : '-';
    const tieneDocumento = !!mant.documento_url;
    const storageType = mant.documento_storage || 'google_drive';

    let nombreMantenimiento = mant.nombre_personalizado;

    if (!nombreMantenimiento) {
      if (mant.id_mantenimiento_programado) {
        const mantenimientoProgramado = mantenimientosProgramados.find(mp => mp.id === mant.id_mantenimiento_programado);
        if (mantenimientoProgramado && mantenimientoProgramado.nombre_personalizado) {
          nombreMantenimiento = mantenimientoProgramado.nombre_personalizado;
        }
      }
    }

    if (!nombreMantenimiento) {
      const tipoMant = tiposMantenimiento.find(t => t.id === mant.id_tipo);
      nombreMantenimiento = tipoMant ? tipoMant.nombre : 'Mantenimiento';
    }

    const botonDocumento = tieneDocumento ? `
      <button onclick="descargarDocumento('${mant.documento_url}', '${nombreMantenimiento.replace(/\s+/g, '_')}_${currentEquipo.codigo_interno}_${fechaRealizado.replace(/\//g, '-')}.pdf', '${storageType}')" 
              class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              title="${storageType === 'local' ? 'Descargar documento local' : 'Descargar documento de Google Drive'}">
        <i class="fas fa-download"></i> PDF
        ${storageType === 'local' ? '<i class="fas fa-laptop text-xs" title="Almacenado localmente"></i>' : ''}
      </button>
    ` : '<span class="text-gray-400 text-sm">Sin documento</span>';

    const botonesAcciones = `
      <div class="flex gap-2 justify-center">
        ${botonDocumento}
        <button onclick="editarMantenimiento(${mant.id})" 
                class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                title="Editar mantenimiento">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    `;

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 border text-center">${nombreMantenimiento}</td>
        <td class="px-4 py-3 border text-center">${fechaRealizado}</td>
        <td class="px-4 py-3 border">${mant.descripcion || '-'}</td>
        <td class="px-4 py-3 border text-center">${mant.realizado_por || '-'}</td>
        <td class="px-4 py-3 border">${mant.observaciones || '-'}</td>
        <td class="px-4 py-3 border text-center">${botonesAcciones}</td>
      </tr>
    `;
  }).join('');
}

// Actualizar contadores
function actualizarContadores() {
  const preventivos = mantenimientosRealizados.filter(m => {
    const tipoMantenimiento = tiposMantenimiento.find(t => t.id === m.id_tipo);
    return tipoMantenimiento?.nombre?.toLowerCase().includes('preventivo');
  }).length;

  const calibraciones = mantenimientosRealizados.filter(m => {
    const tipoMantenimiento = tiposMantenimiento.find(t => t.id === m.id_tipo);
    const tipoNombre = tipoMantenimiento?.nombre?.toLowerCase();
    return tipoNombre?.includes('calibración') || tipoNombre?.includes('calibracion');
  }).length;

  const correctivos = mantenimientosRealizados.filter(m => {
    const tipoMantenimiento = tiposMantenimiento.find(t => t.id === m.id_tipo);
    return tipoMantenimiento?.nombre?.toLowerCase().includes('correctivo');
  }).length;

  const total = preventivos + calibraciones + correctivos;

  const contadorPreventivos = document.getElementById('contador-preventivos');
  const contadorCalibraciones = document.getElementById('contador-calibraciones');
  const contadorCorrectivos = document.getElementById('contador-correctivos');
  const contadorTotal = document.getElementById('contador-total');

  if (contadorPreventivos) contadorPreventivos.textContent = preventivos;
  if (contadorCalibraciones) contadorCalibraciones.textContent = calibraciones;
  if (contadorCorrectivos) contadorCorrectivos.textContent = correctivos;
  if (contadorTotal) contadorTotal.textContent = total;
}

// Actualizar próximos mantenimientos
function actualizarProximosMantenimientos() {
  console.log('🔍 Buscando próximos mantenimientos...', mantenimientosProgramados);

  const preventivosProgramados = mantenimientosProgramados.filter(m => {
    const tipoMantenimiento = tiposMantenimiento.find(t => t.id === m.id_tipo_mantenimiento);
    return tipoMantenimiento?.nombre?.toLowerCase().includes('preventivo');
  });

  const calibracionesProgramadas = mantenimientosProgramados.filter(m => {
    const tipoMantenimiento = tiposMantenimiento.find(t => t.id === m.id_tipo_mantenimiento);
    const tipoNombre = tipoMantenimiento?.nombre?.toLowerCase();
    return tipoNombre?.includes('calibración') || tipoNombre?.includes('calibracion');
  });

  actualizarListaPreventivos(preventivosProgramados);
  actualizarListaCalibraciones(calibracionesProgramadas);
}

// Función para actualizar la lista de preventivos
function actualizarListaPreventivos(preventivos) {
  const container = document.getElementById('proximo-preventivo-detalle');
  if (!container) return;

  if (preventivos.length === 0) {
    container.innerHTML = '<p class="text-gray-500">No hay preventivos programados</p>';
    return;
  }

  const preventivosOrdenados = [...preventivos].sort((a, b) =>
    new Date(a.proxima_fecha) - new Date(b.proxima_fecha)
  );

  container.innerHTML = preventivosOrdenados.map(preventivo => {
    const estadoInfo = getEstadoMantenimiento(preventivo.proxima_fecha);

    return `
      <div class="mb-2 p-2 border rounded ${estadoInfo.clase}">
        <div class="flex justify-between items-start">
          <div>
            <strong>${preventivo.nombre_personalizado || 'Preventivo'}</strong>
            <div class="text-sm text-gray-600">
              Próximo: ${formatDateToDDMMYYYY(preventivo.proxima_fecha)} ${estadoInfo.texto}
            </div>
            ${preventivo.intervalo_dias ?
        `<div class="text-xs text-gray-500">Cada ${preventivo.intervalo_dias} días</div>` : ''
      }
          </div>
          <button 
            onclick="validarPreventivoEspecifico(${preventivo.id})"
            class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
          >
            Validar
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Función para actualizar la lista de calibraciones
function actualizarListaCalibraciones(calibraciones) {
  const container = document.getElementById('proxima-calibracion-detalle');
  if (!container) return;

  if (calibraciones.length === 0) {
    container.innerHTML = '<p class="text-gray-500">No hay calibraciones programadas</p>';
    return;
  }

  const calibracionesOrdenadas = [...calibraciones].sort((a, b) =>
    new Date(a.proxima_fecha) - new Date(b.proxima_fecha)
  );

  container.innerHTML = calibracionesOrdenadas.map(calibracion => {
    const estadoInfo = getEstadoMantenimiento(calibracion.proxima_fecha);

    return `
      <div class="mb-2 p-2 border rounded ${estadoInfo.clase}">
        <div class="flex justify-between items-start">
          <div>
            <strong>${calibracion.nombre_personalizado || 'Calibración'}</strong>
            <div class="text-sm text-gray-600">
              Próxima: ${formatDateToDDMMYYYY(calibracion.proxima_fecha)} ${estadoInfo.texto}
            </div>
            ${calibracion.intervalo_dias ?
        `<div class="text-xs text-gray-500">Cada ${calibracion.intervalo_dias} días</div>` : ''
      }
          </div>
          <button 
            onclick="validarCalibracionEspecifica(${calibracion.id})"
            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            Validar
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Validar un preventivo específico
async function validarPreventivoEspecifico(idMantenimientoProgramado) {
  const mantenimientoProgramado = mantenimientosProgramados.find(m => m.id === idMantenimientoProgramado);
  if (!mantenimientoProgramado) {
    mostrarMensaje('❌ No se encontró el mantenimiento programado', true);
    return;
  }

  await mostrarModalMantenimientoEspecifico('preventivo', mantenimientoProgramado);
}

// Validar una calibración específica
async function validarCalibracionEspecifica(idMantenimientoProgramado) {
  const mantenimientoProgramado = mantenimientosProgramados.find(m => m.id === idMantenimientoProgramado);
  if (!mantenimientoProgramado) {
    mostrarMensaje('❌ No se encontró la calibración programada', true);
    return;
  }

  await mostrarModalMantenimientoEspecifico('calibracion', mantenimientoProgramado);
}

// Mostrar modal para mantenimiento específico
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
  if (tipoMantenimientoInput) tipoMantenimientoInput.value = nombreMantenimiento;
  if (mantenimientoTipoInput) mantenimientoTipoInput.value = tipo;
  if (idMantenimientoProgramadoInput) idMantenimientoProgramadoInput.value = mantenimientoProgramado.id;
  if (textoBotonGuardar) textoBotonGuardar.textContent = 'Validar';

  if (fechaRealizadoInput) {
    fechaRealizadoInput.value = mantenimientoProgramado.proxima_fecha || getCurrentDate();
    fechaRealizadoInput.readOnly = false;
  }

  if (realizadoPorInput) realizadoPorInput.value = localStorage.getItem('usuario') || 'Técnico';

  if (descripcionTextarea) {
    if (tipo === 'preventivo') {
      descripcionTextarea.value = `Mantenimiento preventivo "${nombreMantenimiento}" realizado según programa establecido. Verificación de funcionamiento, limpieza y ajustes necesarios.`;
    } else {
      descripcionTextarea.value = `Calibración "${nombreMantenimiento}" realizada según especificaciones del fabricante. Verificación de parámetros y ajustes de precisión.`;
    }
  }

  modal.classList.remove('hidden');
}

// Mostrar modal de mantenimiento genérico
function mostrarModalMantenimiento(tipo) {
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
  const fechaProgramadaContainer = document.getElementById('fecha-programada-container');
  const fechaProgramadaInput = document.getElementById('fecha-programada');
  const fechaRealizadoInput = document.getElementById('fecha-realizado');
  const realizadoPorInput = document.getElementById('realizado-por');
  const descripcionTextarea = document.getElementById('descripcion-mantenimiento');

  if (modalTitulo) modalTitulo.textContent = esValidacion ? `Validar ${tipoNombre}` : `Agregar ${tipoNombre}`;
  if (tipoMantenimientoInput) tipoMantenimientoInput.value = tipoNombre;
  if (mantenimientoTipoInput) mantenimientoTipoInput.value = tipo;
  if (textoBotonGuardar) textoBotonGuardar.textContent = esValidacion ? 'Validar' : 'Agregar';

  if (fechaProgramadaContainer) {
    fechaProgramadaContainer.classList.add('hidden');
  }

  if (fechaRealizadoInput) fechaRealizadoInput.value = getCurrentDate();
  if (realizadoPorInput) realizadoPorInput.value = localStorage.getItem('usuario') || 'Técnico';

  if (descripcionTextarea) {
    switch (tipo) {
      case 'preventivo':
        descripcionTextarea.value = 'Mantenimiento preventivo realizado según programa establecido. Verificación de funcionamiento, limpieza y ajustes necesarios.';
        break;
      case 'calibracion':
        descripcionTextarea.value = 'Calibración realizada según especificaciones del fabricante. Verificación de parámetros y ajustes de precisión.';
        break;
      case 'correctivo':
        descripcionTextarea.value = 'Reparación correctiva realizada. Identificación y solución de falla reportada.';
        break;
    }
  }

  modal.classList.remove('hidden');
}

function cerrarModalMantenimiento() {
  const modal = document.getElementById('modal-mantenimiento');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Editar mantenimiento existente
async function editarMantenimiento(idMantenimiento) {
  try {
    const response = await fetch(`${API_MANTENIMIENTOS}/${idMantenimiento}`);
    if (!response.ok) throw new Error('No se pudo cargar el mantenimiento');

    const mantenimiento = await response.json();
    await mostrarModalEditarMantenimiento(mantenimiento);
  } catch (error) {
    console.error('Error cargando mantenimiento:', error);
    mostrarMensaje('❌ Error al cargar mantenimiento para editar', true);
  }
}

// Mostrar modal para editar mantenimiento
async function mostrarModalEditarMantenimiento(mantenimiento) {
  const modal = document.getElementById('modal-mantenimiento');
  const form = document.getElementById('form-mantenimiento');

  if (!modal || !form) {
    console.error('❌ No se encontró el modal o el formulario');
    return;
  }

  form.reset();

  const tipoMantenimiento = tiposMantenimiento.find(t => t.id === mantenimiento.id_tipo);
  const tipoNombre = tipoMantenimiento?.nombre || 'Mantenimiento';

  const modalTitulo = document.getElementById('modal-titulo');
  const mantenimientoIdInput = document.getElementById('mantenimiento-id');
  const mantenimientoTipoInput = document.getElementById('mantenimiento-tipo');
  const textoBotonGuardar = document.getElementById('texto-boton-guardar');
  const fechaRealizadoInput = document.getElementById('fecha-realizado');
  const descripcionTextarea = document.getElementById('descripcion-mantenimiento');
  const realizadoPorInput = document.getElementById('realizado-por');
  const observacionesTextarea = document.getElementById('observaciones-mantenimiento');
  const fechaProgramadaContainer = document.getElementById('fecha-programada-container');
  const fechaProgramadaInput = document.getElementById('fecha-programada');
  const documentoInfo = document.getElementById('documento-actual-info');

  if (modalTitulo) modalTitulo.textContent = `Editar ${tipoNombre}`;
  if (mantenimientoIdInput) mantenimientoIdInput.value = mantenimiento.id;
  if (mantenimientoTipoInput) mantenimientoTipoInput.value = 'edicion';
  if (textoBotonGuardar) textoBotonGuardar.textContent = 'Actualizar';

  if (fechaRealizadoInput) fechaRealizadoInput.value = mantenimiento.fecha_realizado?.split('T')[0] || '';
  if (descripcionTextarea) descripcionTextarea.value = mantenimiento.descripcion || '';
  if (realizadoPorInput) realizadoPorInput.value = mantenimiento.realizado_por || '';
  if (observacionesTextarea) observacionesTextarea.value = mantenimiento.observaciones || '';

  if (fechaProgramadaContainer && fechaProgramadaInput) {
    if (mantenimiento.fecha_programada) {
      fechaProgramadaContainer.classList.remove('hidden');
      fechaProgramadaInput.value = mantenimiento.fecha_programada?.split('T')[0] || '';
      fechaProgramadaInput.readOnly = true;
    } else {
      fechaProgramadaContainer.classList.add('hidden');
    }
  }

  if (documentoInfo) {
    if (mantenimiento.documento_url) {
      documentoInfo.classList.remove('hidden');
      documentoInfo.innerHTML = `
        <div class="text-sm text-green-600">
          <i class="fas fa-file-pdf"></i> Documento actual: 
          <button onclick="descargarDocumento('${mantenimiento.documento_url}', 'mantenimiento_${currentEquipo.codigo_interno}_${mantenimiento.id}.pdf')" 
                  class="underline hover:text-green-800">
            Descargar documento
          </button>
        </div>
      `;
    } else {
      documentoInfo.classList.add('hidden');
    }
  }

  modal.classList.remove('hidden');
}

// Configurar eventos
function configurarEventos() {
  const btnHojaVida = document.getElementById('btn-hoja-vida');
  const btnGenerarQR = document.getElementById('btn-generar-qr');

  if (btnHojaVida) btnHojaVida.addEventListener('click', generarHojaVida);
  if (btnGenerarQR) btnGenerarQR.addEventListener('click', generarQR);
}

// Generar hoja de vida PDF
// ✅ FUNCIÓN MEJORADA: Generar hoja de vida PDF con diseño profesional
async function generarHojaVida() {
  try {
    mostrarMensaje('📄 Generando hoja de vida...');

    const ventanaPDF = window.open('', '_blank');
    if (!ventanaPDF) {
      mostrarMensaje('❌ Permite ventanas emergentes para generar el PDF', true);
      return;
    }

    // Obtener imagen del equipo
    const imagenEquipo = currentEquipo.imagen_url || currentEquipo.imagen || currentEquipo.url_imagen;

    // Contar mantenimientos por tipo
    const preventivosCount = mantenimientosRealizados.filter(m => {
      const tipo = tiposMantenimiento.find(t => t.id === m.id_tipo);
      return tipo?.nombre?.toLowerCase().includes('preventivo');
    }).length;

    const calibracionesCount = mantenimientosRealizados.filter(m => {
      const tipo = tiposMantenimiento.find(t => t.id === m.id_tipo);
      const tipoNombre = tipo?.nombre?.toLowerCase();
      return tipoNombre?.includes('calibración') || tipoNombre?.includes('calibracion');
    }).length;

    const correctivosCount = mantenimientosRealizados.filter(m => {
      const tipo = tiposMantenimiento.find(t => t.id === m.id_tipo);
      return tipo?.nombre?.toLowerCase().includes('correctivo');
    }).length;

    // Preparar mantenimientos para la tabla (máximo 15 para que quepa en una página)
    const mantenimientosParaTabla = mantenimientosRealizados
      .sort((a, b) => new Date(b.fecha_realizado) - new Date(a.fecha_realizado))
      .slice(0, 15);

    const contenidoHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Hoja de Vida - ${currentEquipo.codigo_interno}</title>
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
            font-size: 11px;
            line-height: 1.3;
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
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 3px;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            line-height: 1.2;
          }
          
          .title-container .subtitle {
            font-size: 11px;
            font-weight: 400;
            color: white !important;
            opacity: 0.95;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            line-height: 1.2;
          }
          
          /* CONTENEDOR PARA IMAGEN DEL EQUIPO - POSICIÓN MÁS ARRIBA */
          .equipo-imagen-container {
            position: absolute;
            top: 8px; /* SUBIDO DE 15px A 8px */
            right: 25px;
            z-index: 3;
            text-align: center;
          }
          
          .equipo-imagen {
            width: 75px; /* Reducido ligeramente para mejor ajuste */
            height: 75px;
            background: white;
            border-radius: 6px;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            overflow: hidden;
            margin-bottom: 4px;
          }
          
          .equipo-imagen img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .equipo-imagen-label {
            font-size: 7px;
            color: white;
            background: rgba(0, 0, 0, 0.3);
            padding: 1px 5px;
            border-radius: 8px;
            font-weight: 500;
          }
          
          .no-imagen {
            width: 75px;
            height: 75px;
            background: #f8fafc;
            border-radius: 6px;
            border: 2px dashed #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            margin-bottom: 4px;
          }
          
          .no-imagen i {
            font-size: 20px;
          }

          /* Contenido principal */
          .content {
            padding: 15px 20px;
            min-height: 230mm;
          }
          
          .two-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 15px;
          }
          
          .section {
            margin-bottom: 12px;
            background: white;
            border-radius: 6px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          
          .section-title {
            background: #639A33 !important;
            padding: 8px 12px;
            font-weight: 600;
            color: white !important;
            font-size: 11px;
            display: flex;
            align-items: center;
            gap: 6px;
            border-left: 4px solid #4a7a27;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .section-content {
            padding: 12px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 8px;
          }
          
          .info-item {
            display: flex;
            flex-direction: column;
            padding: 5px 0;
            border-bottom: 1px solid #f8fafc;
          }
          
          .info-item:last-child {
            border-bottom: none;
          }
          
          .label {
            font-weight: 600;
            color: #475569;
            font-size: 8px;
            margin-bottom: 1px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
          }
          
          .value {
            font-weight: 500;
            color: #1e293b;
            font-size: 9px;
            line-height: 1.2;
          }
          
          /* Estadísticas rápidas */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 10px;
          }
          
          .stat-item {
            text-align: center;
            padding: 8px;
            border-radius: 6px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          
          .stat-number {
            font-size: 16px;
            font-weight: 700;
            color: #639A33;
            margin-bottom: 2px;
          }
          
          .stat-label {
            font-size: 8px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
          }
          
          /* Tablas compactas */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 8px;
            border: 1px solid #e2e8f0;
          }
          
          th {
            background: #639A33 !important;
            color: white !important;
            padding: 5px 4px;
            text-align: left;
            font-weight: 600;
            font-size: 7px;
            text-transform: uppercase;
            border-right: 1px solid #4a7a27;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          th:last-child {
            border-right: none;
          }
          
          td {
            padding: 4px;
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
            color: #475569;
            vertical-align: top;
          }
          
          td:last-child {
            border-right: none;
          }
          
          tr:nth-child(even) {
            background: #f8fafc;
          }
          
          /* Especificaciones técnicas */
          .specs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 6px;
            margin-top: 8px;
          }
          
          .spec-item {
            padding: 4px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          
          .spec-label {
            font-weight: 600;
            color: #475569;
            font-size: 7px;
            text-transform: uppercase;
          }
          
          .spec-value {
            font-size: 8px;
            color: #1e293b;
          }
          
          /* Footer */
          .footer {
            margin-top: 20px;
            padding: 12px 20px;
            background: #f8fafc;
            border-top: 2px solid #639A33;
            text-align: center;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .footer-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 8px;
            margin-bottom: 8px;
          }
          
          .footer-item {
            text-align: center;
          }
          
          .footer-item .label {
            font-size: 7px;
            color: #64748b;
            margin-bottom: 1px;
          }
          
          .footer-item .value {
            font-size: 8px;
            color: #1e293b;
            font-weight: 600;
          }
          
          .copyright {
            font-size: 7px;
            color: #94a3b8;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
          }
          
          /* Control para evitar saltos de página */
          .no-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Badges de estado */
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 7px;
            font-weight: 600;
            text-transform: uppercase;
          }
          
          .badge-active {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
          }
          
          .badge-inactive {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
          }
          
          /* ESTILOS CRÍTICOS PARA IMPRESIÓN */
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
              height: 100%;
            }
            
            .page-container {
              box-shadow: none;
              min-height: 100vh;
              height: 297mm;
            }
            
            .header, .section-title, th {
              background: #639A33 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .title-container h1,
            .title-container .subtitle,
            .section-title {
              color: white !important;
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
                  <img src="../assets/LOGO-IPS-INCONTEC.png" alt="Logo IPS Progresando" />
                </div>
              </div>
              
              <div class="title-container">
                <h1>HOJA DE VIDA DEL EQUIPO</h1>
                <div class="subtitle">Sistema de Gestión de Inventarios - IPS Progresando</div>
              </div>
              
              <!-- IMAGEN DEL EQUIPO EN LA PARTE SUPERIOR DERECHA - MÁS ARRIBA -->
              <div class="equipo-imagen-container">
                ${imagenEquipo ? `
                  <div class="equipo-imagen">
                    <img src="${imagenEquipo}" alt="Imagen del equipo ${currentEquipo.codigo_interno}" 
                         onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'no-imagen\\'><i class=\\'fas fa-camera\\'></i></div><div class=\\'equipo-imagen-label\\'>Sin imagen</div>';" />
                  </div>
                  <div class="equipo-imagen-label">Equipo</div>
                ` : `
                  <div class="no-imagen">
                    <i class="fas fa-camera"></i>
                  </div>
                  <div class="equipo-imagen-label">Sin imagen</div>
                `}
              </div>
            </div>
          </div>
          
          <!-- Contenido principal -->
          <div class="content">
            <!-- Información general en dos columnas -->
            <div class="two-columns">
              <!-- Columna 1: Información básica -->
              <div class="section no-break">
                <div class="section-title">
                  <i class="fas fa-info-circle"></i>
                  INFORMACIÓN GENERAL
                </div>
                <div class="section-content">
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="label">Código</span>
                      <span class="value">${currentEquipo.codigo_interno || '-'}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Nombre</span>
                      <span class="value">${currentEquipo.nombre || '-'}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Tipo de equipo</span>
                      <span class="value">${currentEquipo.tipo_nombre || '-'}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Estado</span>
                      <span class="value">
                        <span class="badge ${currentEquipo.estado === 'activo' ? 'badge-active' : 'badge-inactive'}">
                          ${currentEquipo.estado?.toUpperCase() || 'N/A'}
                        </span>
                      </span>
                    </div>
                    <div class="info-item">
                      <span class="label">Responsable</span>
                      <span class="value">${currentEquipo.responsable_nombre || 'No asignado'}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Documento responsable</span>
                      <span class="value">${currentEquipo.responsable_documento || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Columna 2: Ubicación y descripción -->
              <div class="section no-break">
                <div class="section-title">
                  <i class="fas fa-map-marker-alt"></i>
                  UBICACIÓN Y DESCRIPCIÓN
                </div>
                <div class="section-content">
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="label">Ubicación</span>
                      <span class="value">${currentEquipo.ubicacion || '-'}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Sede</span>
                      <span class="value">${currentEquipo.sede_nombre || '-'}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">Área</span>
                      <span class="value">${currentEquipo.area_nombre || '-'}</span>
                    </div>
                    ${currentEquipo.ubicacion === 'puesto' ? `
                    <div class="info-item">
                      <span class="label">Puesto</span>
                      <span class="value">${currentEquipo.puesto_codigo || '-'}</span>
                    </div>
                    ` : ''}
                    <div class="info-item" style="grid-column: 1 / -1;">
                      <span class="label">Descripción</span>
                      <span class="value">${currentEquipo.descripcion || 'Sin descripción'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Especificaciones técnicas -->
            ${Object.keys(currentEquipo.campos_personalizados || {}).length > 0 ? `
            <div class="section no-break">
              <div class="section-title">
                <i class="fas fa-cogs"></i>
                ESPECIFICACIONES
              </div>
              <div class="section-content">
                <div class="specs-grid">
                  ${Object.entries(currentEquipo.campos_personalizados).slice(0, 12).map(([key, value]) => `
                    <div class="spec-item">
                      <div class="spec-label">${key}</div>
                      <div class="spec-value">${value || 'No especificado'}</div>
                    </div>
                  `).join('')}
                </div>
                ${Object.keys(currentEquipo.campos_personalizados).length > 12 ? `
                  <div style="margin-top: 6px; text-align: center;">
                    <span style="font-size: 7px; color: #64748b;">
                      + ${Object.keys(currentEquipo.campos_personalizados).length - 12} especificaciones adicionales
                    </span>
                  </div>
                ` : ''}
              </div>
            </div>
            ` : ''}
            
            <!-- Historial de mantenimientos -->
            <div class="section">
              <div class="section-title">
                <i class="fas fa-history"></i>
                HISTORIAL DE MANTENIMIENTOS (ÚLTIMOS ${mantenimientosParaTabla.length})
              </div>
              <div class="section-content">
                ${mantenimientosParaTabla.length > 0 ? `
                  <table>
                    <thead>
                      <tr>
                        <th style="width: 12%">Fecha</th>
                        <th style="width: 15%">Tipo</th>
                        <th style="width: 35%">Descripción</th>
                        <th style="width: 15%">Realizado por</th>
                        <th style="width: 23%">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${mantenimientosParaTabla.map(mant => {
      const tipoMant = tiposMantenimiento.find(t => t.id === mant.id_tipo);
      const tipoNombre = tipoMant?.nombre || 'Mantenimiento';
      const fecha = mant.fecha_realizado ? formatDateToDDMMYYYY(mant.fecha_realizado) : '-';

      return `
                          <tr>
                            <td>${fecha}</td>
                            <td>${tipoNombre}</td>
                            <td>${mant.descripcion || 'Sin descripción'}</td>
                            <td>${mant.realizado_por || 'No especificado'}</td>
                            <td>${mant.observaciones || '-'}</td>
                          </tr>
                        `;
    }).join('')}
                    </tbody>
                  </table>
                  ${mantenimientosRealizados.length > 15 ? `
                    <div style="margin-top: 6px; text-align: center;">
                      <span style="font-size: 7px; color: #64748b;">
                        + ${mantenimientosRealizados.length - 15} mantenimientos adicionales en el historial completo
                      </span>
                    </div>
                  ` : ''}
                ` : `
                  <div style="text-align: center; padding: 20px; color: #64748b;">
                    <i class="fas fa-clipboard-list" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <p style="font-size: 9px;">No hay mantenimientos registrados para este equipo</p>
                  </div>
                `}
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-content">
              <div class="footer-item">
                <div class="label">Equipo</div>
                <div class="value">${currentEquipo.codigo_interno}</div>
              </div>
              <div class="footer-item">
                <div class="label">Fecha de generación</div>
                <div class="value">${new Date().toLocaleDateString()}</div>
              </div>
              <div class="footer-item">
                <div class="label">Hora de generación</div>
                <div class="value">${new Date().toLocaleTimeString()}</div>
              </div>
              <div class="footer-item">
                <div class="label">Total mantenimientos</div>
                <div class="value">${mantenimientosRealizados.length}</div>
              </div>
            </div>
            <div class="copyright">
              © ${new Date().getFullYear()} IPS Progresando - Sistema de Gestión de Inventarios | Hoja de Vida generada automáticamente
            </div>
          </div>
        </div>

        <script>
          // Forzar colores al cargar
          document.addEventListener('DOMContentLoaded', function() {
            const greenElements = document.querySelectorAll('.header, .section-title, th');
            greenElements.forEach(el => {
              el.style.backgroundColor = '#639A33';
              el.style.color = 'white';
            });
          });
        </script>
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
      }
    }, 1000);

  } catch (error) {
    console.error('Error generando hoja de vida:', error);
    mostrarMensaje('❌ Error al generar hoja de vida', true);
  }
}

// Mensajes tipo toast
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-equipo");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-equipo";
    mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50";
    document.body.appendChild(mensaje);
  }

  mensaje.textContent = texto;
  mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${esError ? "bg-red-100 text-red-800 border-l-4 border-red-500" : "bg-green-100 text-green-800 border-l-4 border-green-500"
    }`;

  setTimeout(() => {
    mensaje.textContent = "";
    mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
  }, 4000);
}

// Hacer funciones globales
window.mostrarModalMantenimiento = mostrarModalMantenimiento;
window.cerrarModalMantenimiento = cerrarModalMantenimiento;
window.guardarMantenimiento = guardarMantenimiento;
window.descargarDocumento = descargarDocumento;
window.generarHojaVida = generarHojaVida;
window.generarQR = generarQR;
window.cerrarModalQR = cerrarModalQR;
window.descargarQR = descargarQR;
window.validarPreventivoEspecifico = validarPreventivoEspecifico;
window.validarCalibracionEspecifica = validarCalibracionEspecifica;
window.editarMantenimiento = editarMantenimiento;