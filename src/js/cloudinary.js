// js/cloudinary.js - VERSIÓN CORREGIDA Y OPTIMIZADA
const CLOUDINARY_CONFIG = {
    cloudName: 'dzkccjhn9',
    uploadPreset: 'inventario'
};

// Función para comprimir imagen antes de subir - CORREGIDA
function comprimirImagen(archivo, calidad = 0.8, maxAncho = 1920) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            try {
                // Calcular nuevo tamaño manteniendo proporción
                let ancho = img.width;
                let alto = img.height;
                
                if (ancho > maxAncho) {
                    alto = Math.round((alto * maxAncho) / ancho);
                    ancho = maxAncho;
                }
                
                canvas.width = ancho;
                canvas.height = alto;
                
                // Configurar calidad de renderizado
                ctx.imageSmoothingQuality = 'high';
                
                // Dibujar imagen comprimida
                ctx.drawImage(img, 0, 0, ancho, alto);
                
                // Convertir a Blob comprimido
                canvas.toBlob(
                    blob => {
                        if (!blob) {
                            reject(new Error('No se pudo comprimir la imagen'));
                            return;
                        }
                        
                        // ✅ LIMPIAR URL del objeto para evitar memory leaks
                        URL.revokeObjectURL(img.src);
                        resolve(blob);
                    },
                    'image/jpeg', // Siempre convertir a JPEG (más compresión)
                    calidad
                );
            } catch (error) {
                URL.revokeObjectURL(img.src);
                reject(error);
            }
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Error al cargar la imagen para compresión'));
        };
        
        img.src = URL.createObjectURL(archivo);
    });
}

// Función para subir archivos - CORREGIDA Y MEJORADA
async function subirArchivoCloudinary(archivo, tipo = 'auto') {
    try {
        console.log('📤 Iniciando subida a Cloudinary...', {
            nombre: archivo.name,
            tipo: archivo.type,
            tamañoOriginal: `${(archivo.size / 1024 / 1024).toFixed(2)} MB`
        });

        let archivoParaSubir = archivo;
        
        // ✅ COMPRIMIR SI ES IMAGEN Y ES MUY GRANDE - LÍMITE AJUSTADO
        if (archivo.type.startsWith('image/') && archivo.size > 2 * 1024 * 1024) {
            console.log('🔄 Comprimiendo imagen...');
            mostrarMensajeTemporal('🔄 Optimizando imagen...');
            
            try {
                // Ajustar calidad según tamaño
                let calidad = 0.8;
                if (archivo.size > 5 * 1024 * 1024) calidad = 0.6;
                if (archivo.size > 8 * 1024 * 1024) calidad = 0.5;
                
                archivoParaSubir = await comprimirImagen(archivo, calidad, 1600);
                console.log('✅ Imagen comprimida:', {
                    tamañoOriginal: `${(archivo.size / 1024 / 1024).toFixed(2)} MB`,
                    tamañoComprimido: `${(archivoParaSubir.size / 1024 / 1024).toFixed(2)} MB`,
                    reducción: `${((1 - archivoParaSubir.size / archivo.size) * 100).toFixed(1)}%`
                });
            } catch (compressionError) {
                console.warn('⚠️ No se pudo comprimir, subiendo original:', compressionError);
                // Continuar con el archivo original
                archivoParaSubir = archivo;
            }
        }

        const formData = new FormData();
        formData.append('file', archivoParaSubir);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('timestamp', Date.now().toString());
        
        // ✅ DETERMINAR RESOURCE_TYPE CORRECTAMENTE
        let resourceType = 'auto';
        if (archivo.type === 'application/pdf') {
            resourceType = 'raw';
        } else if (archivo.type.startsWith('image/')) {
            resourceType = 'image';
        }
        
        formData.append('resource_type', resourceType);

        console.log('🔄 Enviando a Cloudinary...', {
            resourceType,
            tamaño: `${(archivoParaSubir.size / 1024 / 1024).toFixed(2)} MB`
        });

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error respuesta Cloudinary:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            
            // ✅ MEJORES MENSAJES DE ERROR
            if (errorText.includes('File size too large')) {
                throw new Error(`La imagen es demasiado grande (${(archivo.size / 1024 / 1024).toFixed(1)}MB). Máximo permitido: 10MB.`);
            } else if (errorText.includes('Upload preset')) {
                throw new Error('Error de configuración en Cloudinary.');
            } else {
                throw new Error(`Error ${response.status}: No se pudo subir el archivo`);
            }
        }

        const data = await response.json();
        
        // ✅ VERIFICACIÓN ROBUSTA DE LA RESPUESTA
        if (!data.secure_url) {
            throw new Error('Cloudinary no devolvió una URL válida');
        }

        console.log('✅ Archivo subido exitosamente:', {
            url: data.secure_url,
            public_id: data.public_id,
            resource_type: data.resource_type,
            bytes: data.bytes ? `${(data.bytes / 1024 / 1024).toFixed(2)} MB` : 'N/A',
            formato: data.format,
            ancho: data.width,
            alto: data.height
        });
        
        return {
            url: data.secure_url,
            public_id: data.public_id,
            resource_type: data.resource_type,
            bytes: data.bytes,
            width: data.width,
            height: data.height,
            format: data.format
        };

    } catch (error) {
        console.error('❌ Error en subirArchivoCloudinary:', error);
        throw new Error(`Error subiendo archivo: ${error.message}`);
    }
}

// Función para mostrar mensajes temporales - MEJORADA
function mostrarMensajeTemporal(mensaje, tipo = 'info') {
    // Eliminar mensajes existentes
    const mensajesExistentes = document.querySelectorAll('.mensaje-temporal');
    mensajesExistentes.forEach(msg => msg.remove());
    
    const mensajeTemp = document.createElement('div');
    mensajeTemp.textContent = mensaje;
    mensajeTemp.className = 'mensaje-temporal';
    
    const colores = {
        info: '#6366f1',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
    };
    
    mensajeTemp.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colores[tipo] || colores.info};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 90%;
        text-align: center;
    `;
    
    document.body.appendChild(mensajeTemp);
    
    setTimeout(() => {
        if (document.body.contains(mensajeTemp)) {
            document.body.removeChild(mensajeTemp);
        }
    }, 3000);
}

// ✅ FUNCIONES AUXILIARES MEJORADAS
function generarUrlDescarga(urlOriginal) {
    if (!urlOriginal) return '';
    
    if (urlOriginal.includes('/image/upload/')) {
        return urlOriginal.replace('/image/upload/', '/image/upload/fl_attachment/');
    }
    if (urlOriginal.includes('/raw/upload/')) {
        return urlOriginal.replace('/raw/upload/', '/raw/upload/fl_attachment/');
    }
    return urlOriginal;
}

function generarUrlMiniatura(urlOriginal, ancho = 300, alto = 200) {
    if (!urlOriginal || !urlOriginal.includes('/upload/')) return urlOriginal;
    
    if (urlOriginal.includes('/image/upload/')) {
        return urlOriginal.replace('/upload/', `/upload/w_${ancho},h_${alto},c_fill/`);
    }
    return urlOriginal;
}

function mostrarPreviewImagen(inputElement, previewElement) {
    const archivo = inputElement.files[0];
    if (archivo && archivo.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewElement.src = e.target.result;
            previewElement.classList.remove('hidden');
        };
        reader.readAsDataURL(archivo);
    } else {
        previewElement.classList.add('hidden');
    }
}

function validarArchivo(archivo, tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']) {
    if (!archivo) {
        throw new Error('No se seleccionó ningún archivo');
    }
    
    if (!tiposPermitidos.includes(archivo.type)) {
        throw new Error(`Tipo de archivo no permitido: ${archivo.type}. Formatos aceptados: JPEG, PNG, JPG, PDF`);
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (archivo.size > maxSize) {
        throw new Error(`El archivo es demasiado grande: ${(archivo.size / 1024 / 1024).toFixed(2)}MB. Máximo: 10MB`);
    }
    
    return true;
}

// ✅ EXPORTAR FUNCIONES PARA USO GLOBAL
if (typeof window !== 'undefined') {
    window.CLOUDINARY_CONFIG = CLOUDINARY_CONFIG;
    window.comprimirImagen = comprimirImagen;
    window.subirArchivoCloudinary = subirArchivoCloudinary;
    window.mostrarMensajeTemporal = mostrarMensajeTemporal;
    window.generarUrlDescarga = generarUrlDescarga;
    window.generarUrlMiniatura = generarUrlMiniatura;
    window.mostrarPreviewImagen = mostrarPreviewImagen;
    window.validarArchivo = validarArchivo;
}