// ✅ CONFIGURACIÓN CLOUDINARY
if (typeof CLOUDINARY_CONFIG === 'undefined') {
  const CLOUDINARY_CONFIG = {
    cloudName: 'dzkccjhn9',
    uploadPreset: 'inventario'
  };
}

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}`;
const CLOUDINARY_RAW_UPLOAD = `${CLOUDINARY_UPLOAD_URL}/raw/upload`;

// ✅ CONFIGURACIÓN API
const API_URL = "https://inventario-api-gw73.onrender.com";
const API_EQUIPOS = `${API_URL}/equipos`;
const API_MANTENIMIENTOS = `${API_URL}/mantenimientos`;
const API_TIPOS_EQUIPO = `${API_URL}/tipos-equipo`;
const API_TIPOS_MANTENIMIENTO = `${API_URL}/tipos-mantenimiento`;

// Variables globales
let currentEquipo = null;
let tiposMantenimiento = [];
let mantenimientosProgramados = [];
let mantenimientosRealizados = [];

// ✅ FUNCIÓN NUEVA: Crear y configurar modal de firma digital
function mostrarModalFirmaDigital(mantenimientoData) {
    // Guardar datos del mantenimiento para usar después
    window.datosMantenimientoParaGuardar = mantenimientoData;
    
    // Crear modal para firma
    const modalHTML = `
        <div id="modal-firma" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
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
    
    // Agregar modal al DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    // Inicializar canvas de firma
    setTimeout(() => {
        const canvas = document.getElementById('signature-pad');
        if (canvas) {
            const signaturePad = new SignaturePad(canvas, {
                backgroundColor: 'rgb(255, 255, 255)',
                penColor: 'rgb(0, 0, 0)',
                minWidth: 1,
                maxWidth: 3
            });
            
            // Habilitar/deshabilitar botón según si hay firma
            signaturePad.addEventListener('endStroke', () => {
                const btn = document.getElementById('btn-confirmar-firma');
                if (btn) btn.disabled = signaturePad.isEmpty();
            });
            
            // Guardar referencia global
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

// ✅ FUNCIÓN NUEVA: Procesar firma y guardar mantenimiento
async function procesarFirmaYGuardar() {
    console.log('🔄 Iniciando proceso de guardado con firma...');
    
    if (!window.signaturePad || window.signaturePad.isEmpty()) {
        mostrarMensaje('❌ Por favor, dibuje su firma primero', true);
        return;
    }
    
    try {
        mostrarMensaje('🔄 Procesando firma y generando documento...');
        
        // Obtener firma como imagen base64
        const firmaDataURL = window.signaturePad.toDataURL('image/png');
        console.log('✅ Firma obtenida:', firmaDataURL.substring(0, 50) + '...');
        
        // Obtener datos del mantenimiento
        const mantenimientoData = window.datosMantenimientoParaGuardar;
        
        if (!mantenimientoData) {
            mostrarMensaje('❌ Error: No hay datos del mantenimiento', true);
            cerrarModalFirma();
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
            datosParaEnviar.fecha_programada = mantenimientoData.fecha_programada;
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
        
        // Recargar datos
        await cargarMantenimientosRealizados(currentEquipo.id);
        if (mantenimientoData.tipo && mantenimientoData.tipo !== 'correctivo') {
            await cargarMantenimientosProgramados(currentEquipo.id);
        }
        
        // Limpiar variable temporal
        delete window.datosMantenimientoParaGuardar;
        
    } catch (error) {
        console.error('❌ Error procesando firma y guardando:', error);
        mostrarMensaje('❌ Error: ' + error.message, true);
        cerrarModalFirma();
    }
}

// ✅ FUNCIÓN MEJORADA: Generar PDF con firma automáticamente
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
                    Código: ${currentEquipo.codigo_interno || 'N/A'}
                    Nombre: ${currentEquipo.nombre || 'N/A'}
                    Ubicación: ${construirUbicacionCompleta(currentEquipo)}
                    
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
                const codigo = currentEquipo.codigo_interno || 'equipo';
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
            doc.text(`Código: ${currentEquipo.codigo_interno || '-'}`, margin, y);
            doc.text(`Nombre: ${currentEquipo.nombre || '-'}`, 105, y);
            y += 6;
            
            doc.text(`Ubicación: ${construirUbicacionCompleta(currentEquipo)}`, margin, y);
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
            const codigo = currentEquipo.codigo_interno || 'equipo';
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

// ✅ FUNCIÓN MODIFICADA: `guardarMantenimiento` - MÁS SIMPLE Y DIRECTO
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
        
        // ✅ PREPARAR DATOS
        let nombrePersonalizado = tipoMantenimiento.nombre;
        
        if (tipo !== 'correctivo' && idMantenimientoProgramado) {
            const mantenimientoProgramado = mantenimientosProgramados.find(mp => mp.id == idMantenimientoProgramado);
            if (mantenimientoProgramado?.nombre_personalizado) {
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
            nombre_personalizado: nombrePersonalizado,
            tipo: tipo // Agregar tipo para saber si es validación
        };
        
        // Agregar datos de mantenimiento programado si aplica
        if (tipo !== 'correctivo' && idMantenimientoProgramado) {
            mantenimientoData.fecha_programada = document.getElementById('fecha-programada')?.value || fechaRealizado;
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

// ✅ FUNCIÓN SIMPLIFICADA: Cerrar modal mantenimiento
function cerrarModalMantenimiento() {
  const modal = document.getElementById('modal-mantenimiento');
  const form = document.getElementById('form-mantenimiento');

  if (form) {
    form.reset();
  }

  // Limpiar campos específicos
  const mantenimientoIdInput = document.getElementById('mantenimiento-id');
  const mantenimientoTipoInput = document.getElementById('mantenimiento-tipo');
  const idMantenimientoProgramadoInput = document.getElementById('id-mantenimiento-programado');

  if (mantenimientoIdInput) mantenimientoIdInput.value = '';
  if (mantenimientoTipoInput) mantenimientoTipoInput.value = '';
  if (idMantenimientoProgramadoInput) idMantenimientoProgramadoInput.value = '';

  if (modal) {
    modal.classList.add('hidden');
  }
  
  // Liberar bloqueo
  window.guardandoMantenimiento = false;
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
        await cargarMantenimientosRealizados(currentEquipo.id);
        
    } catch (error) {
        console.error('Error actualizando mantenimiento:', error);
        mostrarMensaje('❌ Error al actualizar mantenimiento', true);
    }
}

// ✅ FUNCIÓN CORREGIDA: Descargar desde Cloudinary
async function descargarDocumento(url, nombreArchivo) {
  if (!url) {
    mostrarMensaje('❌ No hay documento disponible', true);
    return false;
  }

  try {
    console.log('📥 Iniciando descarga...', { url, nombreArchivo });

    // ✅ ESTRATEGIA 1: Descarga directa usando fetch + blob (EVITA ERROR 400)
    try {
      console.log('🔄 Intentando descarga con fetch...');

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Verificar que el blob no esté vacío
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

      // ✅ ESTRATEGIA 2: Abrir en nueva pestaña (FUNCIONA CON CLOUDINARY)
      console.log('🔄 Abriendo en nueva pestaña...');
      window.open(url, '_blank');
      mostrarMensaje('📄 Documento abierto en nueva pestaña');
      return true;
    }

  } catch (error) {
    console.error('❌ Error en descarga:', error);

    // ✅ ESTRATEGIA 3: Último recurso - enlace directo
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

// ✅ FUNCIÓN MEJORADA: Renderizar mantenimientos con indicador de firma
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
                <td colspan="7" class="text-center py-4 text-gray-500">
                    No hay mantenimientos ${tipo === 'preventivo' ? 'preventivos' : tipo === 'calibracion' ? 'de calibración' : 'correctivos'} registrados
                </td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = mantenimientosFiltrados.map(mant => {
    const fechaRealizado = mant.fecha_realizado ? formatDateToDDMMYYYY(mant.fecha_realizado) : '-';
    const tieneDocumento = !!mant.documento_url;
    const tieneFirma = !!mant.firma_digital;

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

    const urlSegura = mant.documento_url ? mant.documento_url.replace(/'/g, "\\'") : '';
    const nombreArchivo = mant.documento_nombre || `mantenimiento_${currentEquipo.codigo_interno}_${fechaRealizado.replace(/\//g, '-')}.pdf`;

    // ✅ BOTONES SIMPLIFICADOS CON INDICADOR DE FIRMA
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

    const botonesAcciones = `
            <div class="flex flex-col gap-2 justify-center items-center">
                ${botonesDocumento}
                <button onclick="editarMantenimiento(${mant.id})" 
                        class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-all duration-200"
                        title="Editar mantenimiento">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </div>
        `;

    return `
            <tr class="hover:bg-gray-50 transition-colors duration-200">
                <td class="px-4 py-3 border text-center font-medium">${nombreMantenimiento}</td>
                <td class="px-4 py-3 border text-center">${fechaRealizado}</td>
                <td class="px-4 py-3 border text-sm">${mant.descripcion || '-'}</td>
                <td class="px-4 py-3 border text-center">${mant.realizado_por || '-'}</td>
                <td class="px-4 py-3 border text-sm">${mant.observaciones || '-'}</td>
                <td class="px-4 py-3 border text-center">${botonesAcciones}</td>
            </tr>
        `;
  }).join('');
}

// ✅ ACTUALIZAR MODAL DE EDICIÓN PARA MOSTRAR ESTADO DE FIRMA
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
  const tieneFirma = !!mantenimiento.firma_digital;

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

  if (modalTitulo) {
    modalTitulo.textContent = `Editar ${tipoNombre}`;
    if (tieneFirma) {
      modalTitulo.innerHTML += ` <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Firmado</span>`;
    }
  }
  
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
      const nombreArchivo = mantenimiento.documento_nombre || `mantenimiento_${currentEquipo.codigo_interno}_${mantenimiento.id}.pdf`;
      const firmaInfo = tieneFirma ? '<span class="ml-2 text-green-600"><i class="fas fa-signature"></i> Firmado</span>' : '';
      
      documentoInfo.innerHTML = `
                <div class="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    <div class="flex items-center justify-between">
                        <div>
                            <i class="fas fa-file-pdf text-red-500"></i> 
                            Documento actual: 
                            <span class="font-medium">${nombreArchivo}</span>
                            ${firmaInfo}
                        </div>
                        <button onclick="descargarDocumento('${mantenimiento.documento_url}', '${nombreArchivo}')" 
                                class="text-blue-600 hover:text-blue-800 text-sm underline ml-2">
                            Descargar
                        </button>
                    </div>
                </div>
            `;
    } else {
      documentoInfo.classList.add('hidden');
    }
  }

  modal.classList.remove('hidden');
}

// ✅ CONFIGURACIÓN INICIAL MEJORADA
document.addEventListener("DOMContentLoaded", async () => {
  const equipoId = getEquipoIdFromUrl();
  if (!equipoId) {
    mostrarMensaje("❌ No se proporcionó un ID de equipo", true);
    return;
  }

  try {
    console.log('🔄 Iniciando aplicación con FIRMA DIGITAL...');
    mostrarMensaje('🔄 Cargando datos del equipo...');

    await cargarTiposMantenimiento();
    await cargarDatosEquipo(equipoId);

    await Promise.allSettled([
      cargarMantenimientosProgramados(equipoId),
      cargarMantenimientosRealizados(equipoId)
    ]);

    configurarEventos();
    configurarTabs();

    console.log('✅ Aplicación cargada correctamente (CON FIRMA DIGITAL)');
    mostrarMensaje('✅ Sistema cargado correctamente');

  } catch (error) {
    console.error('❌ Error crítico cargando la aplicación:', error);
    mostrarMensaje('❌ Error al cargar los datos. Algunas funciones pueden no estar disponibles.', true);
  }
});

// ====================================================================
// 🎯 FUNCIONES EXISTENTES (MANTENIDAS)
// ====================================================================

// ✅ FUNCIÓN MEJORADA: Generar QR
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
    mostrarMensaje('🔳 Generando código QR...');

    qrContainer.innerHTML = '<div class="text-gray-500">Generando QR...</div>';
    linkContainer.innerHTML = '';

    const urlPublica = obtenerUrlPublica();

    if (!urlPublica) {
      throw new Error('No se pudo generar la URL pública');
    }

    document.getElementById('qr-codigo').textContent = currentEquipo.codigo_interno || '-';
    document.getElementById('qr-nombre').textContent = currentEquipo.nombre || '-';
    document.getElementById('qr-responsable').textContent = currentEquipo.responsable_nombre || 'No asignado';
    document.getElementById('qr-ubicacion').textContent = construirUbicacionCompleta(currentEquipo);

    linkContainer.innerHTML = `
            <a href="${urlPublica}" target="_blank" 
            class="text-xs text-green-600 hover:text-green-800 break-all hover:underline block bg-white p-2 rounded border">
                ${urlPublica}
            </a>
        `;

    if (isQRCodeAvailable()) {
      generarQRConLibreria(urlPublica, qrContainer, modal);
    } else {
      generarQRConAPI(urlPublica, qrContainer, modal);
    }

  } catch (error) {
    console.error('Error generando QR:', error);
    mostrarMensaje('❌ Error al generar QR: ' + error.message, true);
    qrContainer.innerHTML = '<div class="text-red-500">Error generando QR</div>';
  }
}

// ✅ FUNCIÓN: Obtener URL pública
function obtenerUrlPublica() {
  try {
    const baseUrl = window.location.origin;
    return `${baseUrl}/Appinventario/src/views/ver-equipo-publico.html?id=${currentEquipo.id}`;
  } catch (error) {
    console.warn('Error obteniendo URL pública:', error);
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

// ✅ FUNCIÓN MEJORADA: Cargar datos del equipo
async function cargarDatosEquipo(equipoId) {
  try {
    const equipo = await apiFetch(`${API_EQUIPOS}/${equipoId}/completo`);
    currentEquipo = equipo;

    try {
      const tipos = await apiFetch(API_TIPOS_EQUIPO);
      const tipo = tipos.find(t => t.id == equipo.id_tipo_equipo);
      if (tipo) {
        equipo.tipo_nombre = tipo.nombre;
        equipo.tipo_campos = tipo.campos || [];
      }
    } catch (err) {
      console.warn("No se pudo cargar tipos de equipo:", err);
    }

    renderInfoEquipo(equipo);
    return equipo;

  } catch (err) {
    console.error("Error al cargar equipo:", err);
    mostrarMensaje("❌ Error al cargar los detalles del equipo", true);
    throw err;
  }
}

// ✅ FUNCIÓN MEJORADA: Cargar mantenimientos programados
async function cargarMantenimientosProgramados(equipoId) {
  try {
    const mantenimientos = await apiFetch(`${API_EQUIPOS}/${equipoId}/mantenimientos`);

    mantenimientosProgramados = mantenimientos;
    console.log("✅ Mantenimientos programados cargados:", mantenimientosProgramados.length);

    actualizarProximosMantenimientos();
    return mantenimientos;

  } catch (err) {
    console.warn("No hay mantenimientos programados o error al cargar:", err);
    mantenimientosProgramados = [];
    actualizarProximosMantenimientos();
    return [];
  }
}

// ✅ FUNCIÓN MEJORADA: Cargar mantenimientos realizados con manejo de errores
async function cargarMantenimientosRealizados(equipoId) {
  try {
    console.log(`🔄 Cargando mantenimientos para equipo ${equipoId}...`);

    const mantenimientos = await apiFetch(`${API_MANTENIMIENTOS}/equipo/${equipoId}`);

    mantenimientosRealizados = mantenimientos;
    console.log("✅ Mantenimientos realizados cargados:", mantenimientosRealizados.length);

    renderMantenimientos();
    actualizarContadores();

    return mantenimientos;

  } catch (err) {
    console.error("❌ Error cargando mantenimientos:", err);

    if (err.message.includes('servidor no está disponible') || err.message.includes('CORS')) {
      mostrarMensaje('⚠️ Servidor temporalmente no disponible. Usando datos locales.', true);
    } else {
      mostrarMensaje("❌ Error cargando mantenimientos: " + err.message, true);
    }

    mantenimientosRealizados = [];
    renderMantenimientos();
    actualizarContadores();

    return [];
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

// Configurar eventos
function configurarEventos() {
  const btnHojaVida = document.getElementById('btn-hoja-vida');
  const btnGenerarQR = document.getElementById('btn-generar-qr');

  if (btnHojaVida) btnHojaVida.addEventListener('click', generarHojaVida);
  if (btnGenerarQR) btnGenerarQR.addEventListener('click', generarQR);
}

// Generar hoja de vida PDF (mantenida igual)
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
                    
                    .main-content {
                        display: grid;
                        grid-template-columns: 1fr 1.2fr 1.3fr;
                        gap: 10px;
                        padding: 12px 20px;
                        align-items: start;
                    }
                    
                    .left-column {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    
                    .center-column {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    
                    .right-column {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 6px;
                        margin-top: -5px;
                    }
                    
                    .equipo-imagen-grande {
                        width: 100%;
                        max-width: 220px;
                        text-align: center;
                    }
                    
                    .equipo-imagen-container {
                        background: white;
                        border-radius: 8px;
                        padding: 12px;
                        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.18);
                        border: 2px solid #e2e8f0;
                    }
                    
                    .equipo-imagen {
                        width: 200px;
                        height: 200px;
                        background: white;
                        border-radius: 6px;
                        border: 3px solid #f8fafc;
                        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
                        overflow: hidden;
                        margin: 0 auto;
                    }
                    
                    .equipo-imagen img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    
                    .equipo-imagen-label {
                        font-size: 12px;
                        color: #1e293b;
                        background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                        padding: 6px 12px;
                        border-radius: 14px;
                        font-weight: 700;
                        margin-top: 8px;
                        border: 1px solid #cbd5e1;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .no-imagen {
                        width: 200px;
                        height: 200px;
                        background: #f8fafc;
                        border-radius: 6px;
                        border: 3px dashed #cbd5e1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #94a3b8;
                        margin: 0 auto;
                    }
                    
                    .no-imagen i {
                        font-size: 40px;
                    }

                    .content {
                        padding: 0 20px 15px 20px;
                        min-height: 230mm;
                    }
                    
                    .section {
                        margin-bottom: 10px;
                        background: white;
                        border-radius: 6px;
                        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                        border: 1px solid #e2e8f0;
                    }
                    
                    .section-compact .section-content {
                        padding: 8px 10px !important;
                    }
                    
                    .section-compact .info-item {
                        padding: 3px 0 !important;
                        margin-bottom: 0 !important;
                    }
                    
                    .section-title {
                        background: #639A33 !important;
                        padding: 8px 12px;
                        font-weight: 600;
                        color: white !important;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        border-left: 4px solid #4a7a27;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .section-content {
                        padding: 10px;
                    }
                    
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                        gap: 6px;
                    }
                    
                    .info-item {
                        display: flex;
                        flex-direction: column;
                        padding: 4px 0;
                        border-bottom: 1px solid #f8fafc;
                        margin-bottom: 2px;
                    }
                    
                    .info-item:last-child {
                        border-bottom: none;
                    }
                    
                    .label {
                        font-weight: 600;
                        color: #475569;
                        font-size: 9px;
                        margin-bottom: 1px;
                        text-transform: uppercase;
                        letter-spacing: 0.2px;
                    }
                    
                    .value {
                        font-weight: 500;
                        color: #1e293b;
                        font-size: 10px;
                        line-height: 1.2;
                    }
                    
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 6px;
                        margin-bottom: 8px;
                    }
                    
                    .stat-item {
                        text-align: center;
                        padding: 6px;
                        border-radius: 5px;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                    }
                    
                    .stat-number {
                        font-size: 16px;
                        font-weight: 700;
                        color: #639A33;
                        margin-bottom: 1px;
                    }
                    
                    .stat-label {
                        font-size: 9px;
                        color: #64748b;
                        text-transform: uppercase;
                        font-weight: 600;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 5px;
                        font-size: 9px;
                        border: 1px solid #e2e8f0;
                    }
                    
                    th {
                        background: #639A33 !important;
                        color: white !important;
                        padding: 4px 3px;
                        text-align: left;
                        font-weight: 600;
                        font-size: 8px;
                        text-transform: uppercase;
                        border-right: 1px solid #4a7a27;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    th:last-child {
                        border-right: none;
                    }
                    
                    td {
                        padding: 3px;
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
                    
                    .specs-container {
                        max-height: 300px;
                        overflow-y: auto;
                        margin-top: 6px;
                        border: 1px solid #e2e8f0;
                        border-radius: 4px;
                        padding: 5px;
                    }
                    
                    .specs-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                        gap: 5px;
                    }
                    
                    .spec-item {
                        padding: 3px 0;
                        border-bottom: 1px solid #f1f5f9;
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    
                    .spec-label {
                        font-weight: 600;
                        color: #475569;
                        font-size: 8px;
                        text-transform: uppercase;
                    }
                    
                    .spec-value {
                        font-size: 9px;
                        color: #1e293b;
                    }
                    
                    .footer {
                        margin-top: 15px;
                        padding: 10px 20px;
                        background: #f8fafc;
                        border-top: 2px solid #639A33;
                        text-align: center;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    .footer-content {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                        gap: 6px;
                        margin-bottom: 6px;
                    }
                    
                    .footer-item {
                        text-align: center;
                    }
                    
                    .footer-item .label {
                        font-size: 8px;
                        color: #64748b;
                        margin-bottom: 1px;
                    }
                    
                    .footer-item .value {
                        font-size: 9px;
                        color: #1e293b;
                        font-weight: 600;
                    }
                    
                    .copyright {
                        font-size: 8px;
                        color: #94a3b8;
                        margin-top: 6px;
                        padding-top: 6px;
                        border-top: 1px solid #e2e8f0;
                    }
                    
                    .no-break {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    
                    .badge {
                        display: inline-block;
                        padding: 1px 5px;
                        border-radius: 8px;
                        font-size: 8px;
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
                        
                        .specs-container {
                            max-height: none !important;
                            overflow: visible !important;
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
                        </div>
                    </div>
                    
                    <!-- NUEVA ESTRUCTURA CON TRES COLUMNAS -->
                    <div class="main-content">
                        <!-- Columna izquierda: Información general -->
                        <div class="left-column">
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
                        </div>
                        
                        <!-- Columna central: Ubicación y descripción - MÁS COMPACTA -->
                        <div class="center-column">
                            <div class="section section-compact no-break">
                                <div class="section-title">
                                    <i class="fas fa-map-marker-alt"></i>
                                    UBICACIÓN
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
                                        <div class="info-item">
                                            <span class="label">Descripción</span>
                                            <span class="value" style="font-size: 9px; line-height: 1.1;">${currentEquipo.descripcion || 'Sin descripción'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Columna derecha: Imagen del equipo MÁS GRANDE -->
                        <div class="right-column">
                            <div class="equipo-imagen-grande">
                                <div class="equipo-imagen-container">
                                    ${imagenEquipo ? `
                                        <div class="equipo-imagen">
                                            <img src="${imagenEquipo}" alt="Imagen del equipo ${currentEquipo.codigo_interno}" 
                                                onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'no-imagen\\'><i class=\\'fas fa-camera\\'></i></div>';" />
                                        </div>
                                        <div class="equipo-imagen-label">EQUIPO</div>
                                    ` : `
                                        <div class="no-imagen">
                                            <i class="fas fa-camera"></i>
                                        </div>
                                        <div class="equipo-imagen-label">SIN IMAGEN</div>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Contenido adicional (especificaciones y mantenimientos) -->
                    <div class="content">
                        <!-- Especificaciones técnicas -->
                        ${Object.keys(currentEquipo.campos_personalizados || {}).length > 0 ? `
                        <div class="section no-break">
                            <div class="section-title">
                                <i class="fas fa-cogs"></i>
                                ESPECIFICACIONES (${Object.keys(currentEquipo.campos_personalizados).length} campos)
                            </div>
                            <div class="section-content">
                                <div class="specs-container">
                                    <div class="specs-grid">
                                        ${Object.entries(currentEquipo.campos_personalizados).map(([key, value]) => `
                                            <div class="spec-item">
                                                <div class="spec-label">${key}</div>
                                                <div class="spec-value">${value || 'No especificado'}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        ` : `
                        <div class="section no-break">
                            <div class="section-title">
                                <i class="fas fa-cogs"></i>
                                ESPECIFICACIONES TÉCNICAS
                            </div>
                            <div class="section-content">
                                <div style="text-align: center; padding: 15px; color: #64748b;">
                                    <i class="fas fa-sliders-h" style="font-size: 24px; margin-bottom: 8px;"></i>
                                    <p style="font-size: 11px;">No hay especificaciones técnicas registradas</p>
                                </div>
                            </div>
                        </div>
                        `}
                        
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
                                            <span style="font-size: 9px; color: #64748b;">
                                                + ${mantenimientosRealizados.length - 15} mantenimientos adicionales en el historial completo
                                            </span>
                                        </div>
                                    ` : ''}
                                ` : `
                                    <div style="text-align: center; padding: 20px; color: #64748b;">
                                        <i class="fas fa-clipboard-list" style="font-size: 24px; margin-bottom: 8px;"></i>
                                        <p style="font-size: 11px;">No hay mantenimientos registrados para este equipo</p>
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
  mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${esError ? "bg-red-100 text-red-800 border-l-4 border-red-500" : "bg-green-100 text-green-800 border-l-4 border-green-500"}`;

  setTimeout(() => {
    mensaje.textContent = "";
    mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
  }, 4000);
}

// ✅ FUNCIONES AUXILIARES FALTANTES
function isQRCodeAvailable() {
  return typeof QRCode !== 'undefined';
}

async function apiFetch(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

// ✅ EXPORTAR FUNCIONES AL SCOPE GLOBAL
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
window.previsualizarPDF = previsualizarPDF;
window.mostrarModalFirmaDigital = mostrarModalFirmaDigital;
window.limpiarFirma = limpiarFirma;
window.cerrarModalFirma = cerrarModalFirma;
window.procesarFirmaYGuardar = procesarFirmaYGuardar;