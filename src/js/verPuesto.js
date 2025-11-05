// ✅ CONFIGURACIÓN API PARA PUESTOS
const API_PUESTOS = "https://inventario-api-gw73.onrender.com/puestos";
const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";

// Variables globales para el puesto
let currentPuesto = null;
let equiposDelPuesto = [];

// Función para obtener ID del puesto desde URL
function getPuestoIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

// ✅ FUNCIONES AUXILIARES PARA QR
function isQRCodeAvailable() {
    return typeof QRCode !== 'undefined';
}

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

function generarQRConAPI(qrData, qrContainer, modal) {
    const encodedData = encodeURIComponent(qrData);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&format=png&data=${encodedData}&charset-source=UTF-8`;

    console.log('🌐 Generando QR con API externa...');

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = qrUrl;
    img.alt = 'Código QR del puesto';
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

// ✅ FUNCIONES PARA QR DEL PUESTO

// Función para generar QR del puesto
async function generarQRPuesto() {
    if (!currentPuesto) {
        mostrarMensaje('❌ No hay información del puesto', true);
        return;
    }

    const modal = document.getElementById('modal-qr-puesto');
    const qrContainer = document.getElementById('qr-code-puesto');
    const linkContainer = document.getElementById('github-link-container-puesto');

    if (!modal || !qrContainer || !linkContainer) {
        console.error('❌ No se encontró el modal QR del puesto');
        return;
    }

    try {
        mostrarMensaje('🔳 Generando código QR del puesto...');

        qrContainer.innerHTML = '<div class="text-gray-500 text-center py-8">Generando QR...</div>';
        linkContainer.innerHTML = '';

        // Cargar equipos del puesto si no están cargados
        if (equiposDelPuesto.length === 0) {
            await cargarEquiposDelPuesto(currentPuesto.id);
        }

        // Actualizar información en el modal
        document.getElementById('qr-puesto-codigo').textContent = currentPuesto.codigo || '-';
        document.getElementById('qr-puesto-area').textContent = currentPuesto.area_nombre || '-';
        document.getElementById('qr-puesto-sede').textContent = currentPuesto.sede_nombre || '-';
        document.getElementById('qr-puesto-responsable').textContent = currentPuesto.responsable_nombre || 'No asignado';
        document.getElementById('qr-puesto-equipos').textContent = equiposDelPuesto.length;

        const urlPublica = obtenerUrlPublicaPuesto();

        if (!urlPublica) {
            throw new Error('No se pudo generar la URL pública del puesto');
        }

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

        modal.classList.remove('hidden');

    } catch (error) {
        console.error('Error generando QR del puesto:', error);
        mostrarMensaje('❌ Error al generar QR: ' + error.message, true);
        qrContainer.innerHTML = '<div class="text-red-500 text-center py-8">Error generando QR</div>';
    }
}

// Función para obtener URL pública del puesto
function obtenerUrlPublicaPuesto() {
    try {
        const baseUrl = window.location.origin;
        return `${baseUrl}/Appinventario/src/views/ver-puesto-publico.html?id=${currentPuesto.id}`;
    } catch (error) {
        console.warn('Error obteniendo URL pública del puesto:', error);
        return null;
    }
}

// Función para cargar equipos del puesto
async function cargarEquiposDelPuesto(puestoId) {
    try {
        const response = await fetch(`${API_EQUIPOS}?puesto_id=${puestoId}`);
        if (response.ok) {
            equiposDelPuesto = await response.json();
            console.log(`✅ Equipos del puesto cargados: ${equiposDelPuesto.length}`);
        } else {
            console.warn('No se pudieron cargar los equipos del puesto');
            equiposDelPuesto = [];
        }
    } catch (error) {
        console.warn('Error cargando equipos del puesto:', error);
        equiposDelPuesto = [];
    }
}

// Función para descargar QR del puesto
function descargarQRPuesto() {
    console.log('🔍 Iniciando descarga de QR del puesto...');

    if (!currentPuesto) {
        mostrarMensaje('❌ No hay puesto seleccionado', true);
        return;
    }

    const qrContainer = document.getElementById('qr-code-puesto');
    const canvas = qrContainer?.querySelector('canvas');
    const img = qrContainer?.querySelector('img');

    if (!canvas && !img) {
        mostrarMensaje('❌ No hay QR para descargar. Primero genera el QR.', true);
        return;
    }

    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `QR_Puesto_${currentPuesto.codigo || 'puesto'}_${fecha}.png`;

    if (canvas) {
        try {
            const link = document.createElement('a');
            link.download = nombreArchivo;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            mostrarMensaje('✅ QR del puesto descargado correctamente');
        } catch (error) {
            console.error('Error con canvas:', error);
            mostrarMensaje('❌ Error al descargar QR', true);
        }
    } else if (img) {
        descargarImagenConFetch(img.src, nombreArchivo);
    }
}

// Función para cerrar modal QR del puesto
function cerrarModalQRPuesto() {
    const modal = document.getElementById('modal-qr-puesto');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 🔹 Mensajes flotantes
function mostrarMensaje(texto, esError = false) {
    let mensaje = document.getElementById("mensaje-puesto");
    if (!mensaje) {
        mensaje = document.createElement("div");
        mensaje.id = "mensaje-puesto";
        mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50";
        document.body.appendChild(mensaje);
    }

    mensaje.textContent = texto;
    mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${
        esError
            ? "bg-red-100 text-red-800 border-l-4 border-red-500"
            : "bg-green-100 text-green-800 border-l-4 border-green-500"
    }`;

    setTimeout(() => {
        mensaje.textContent = "";
        mensaje.className =
            "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
    }, 3000);
}

// ✅ CARGA INICIAL DEL PUESTO
document.addEventListener("DOMContentLoaded", async () => {
    const puestoId = getPuestoIdFromUrl();
    if (!puestoId) {
        mostrarMensaje("❌ No se proporcionó un ID de puesto", true);
        return;
    }

    try {
        // 🔹 Obtener datos del puesto
        const resPuesto = await fetch(`${API_PUESTOS}/${puestoId}`);
        if (!resPuesto.ok) throw new Error("No se pudo cargar el puesto");

        currentPuesto = await resPuesto.json();

        // Insertar datos en el HTML
        document.querySelector("#detalle-codigo").textContent = currentPuesto.codigo;
        document.querySelector("#detalle-area").textContent = currentPuesto.area_nombre;
        document.querySelector("#detalle-sede").textContent = currentPuesto.sede_nombre;
        document.querySelector("#detalle-responsable").textContent = currentPuesto.responsable_nombre;
        document.querySelector("#detalle-documento").textContent = currentPuesto.responsable_documento;

        // Configurar botones
        document.getElementById("btn-editar").onclick = () => {
            window.location.href = `editarPuesto.html?id=${puestoId}`;
        };

        // 🔹 Configurar botón de QR del puesto
        const btnGenerarQRPuesto = document.getElementById("btn-generar-qr-puesto");
        if (btnGenerarQRPuesto) {
            btnGenerarQRPuesto.onclick = generarQRPuesto;
        }

    } catch (err) {
        console.error("Error en puesto:", err);
        mostrarMensaje("❌ Error al cargar los detalles del puesto", true);
        return;
    }

    // 🔹 Cargar equipos del puesto
    try {
        await cargarEquiposDelPuesto(puestoId);
        const tbody = document.querySelector("#tabla-equipos tbody");
        tbody.innerHTML = "";

        if (equiposDelPuesto.length === 0) {
            tbody.innerHTML = `<tr>
                <td colspan="3" class="text-center py-4 text-gray-500">No hay equipos asignados</td>
            </tr>`;
        } else {
            equiposDelPuesto.forEach((eq) => {
                const row = document.createElement("tr");
                row.className = "hover:bg-gray-100 transition";
                row.innerHTML = `
                    <td class="px-4 py-2 border">${eq.codigo_interno}</td>
                    <td class="px-4 py-2 border">${eq.nombre}</td>
                    <td class="px-4 py-2 border text-center">
                        <button onclick="window.location.href='verEquipo.html?id=${eq.id}'" 
                            class="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-600">
                            Ver
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

    } catch (err) {
        console.warn("Equipos no disponibles:", err);
        const tbody = document.querySelector("#tabla-equipos tbody");
        tbody.innerHTML = `<tr>
            <td colspan="3" class="text-center py-4 text-gray-400 italic">No se pudieron cargar los equipos</td>
        </tr>`;
    }
});

// ✅ EXPORTAR FUNCIONES AL SCOPE GLOBAL
window.generarQRPuesto = generarQRPuesto;
window.descargarQRPuesto = descargarQRPuesto;
window.cerrarModalQRPuesto = cerrarModalQRPuesto;