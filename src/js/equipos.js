// ../js/equipos.js
const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";

// Al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(API_EQUIPOS);
    if (!res.ok) throw new Error("Error al obtener equipos");

    const equipos = await res.json();
    const tbody = document.getElementById("tablaEquipos");
    tbody.innerHTML = "";

    if (equipos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-gray-500">
            No hay equipos registrados
          </td>
        </tr>
      `;
    } else {
      equipos.forEach(eq => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-100 transition";
        tr.innerHTML = `
          <td class="px-4 py-2 border border-[#0F172A]">${eq.codigo_interno}</td>
          <td class="px-4 py-2 border border-[#0F172A] font-medium">${eq.nombre}</td>
          <td class="px-4 py-2 border border-[#0F172A]">
            ${eq.ubicacion === "puesto"
                  ? `Puesto: ${eq.puesto_codigo || "-"}`
                  : `Área: ${eq.area_nombre || "-"}`
                }
          </td>
          <td class="px-4 py-2 border border-[#0F172A]">
            ${eq.ubicacion === "puesto"
                  ? (eq.puesto_responsable || "-")
                  : (eq.responsable_nombre ? `${eq.responsable_nombre} (${eq.responsable_documento || "-"})` : "-")
                }
          </td>
          <td class="px-4 py-2 border border-[#0F172A]">
            ${eq.proximo_mantenimiento
                  ? eq.proximo_mantenimiento.substring(0, 10).split("-").reverse().join("/")
                  : "-"
                }
          </td>
          <td class="px-4 py-2 border border-[#0F172A] text-center">
            <div class="flex justify-center gap-2">
              <button onclick="window.location.href='verEquipo.html?id=${eq.id}'"
                class="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-600">Ver</button>
              <button onclick="window.location.href='editarEquipo.html?id=${eq.id}'"
                class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Editar</button>
              <div id="delete-controls-${eq.id}">
                <button onclick="mostrarConfirmacion(${eq.id})"
                  class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Eliminar</button>
              </div>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

    }
  } catch (err) {
    console.error("Error cargando equipos:", err);
    mostrarMensaje("❌ Error al cargar los equipos", true);
  }
});

// Función para mostrar confirmación de eliminación
function mostrarConfirmacion(id) {
  const container = document.getElementById(`delete-controls-${id}`);
  container.innerHTML = `
    <div class="flex gap-1">
      <button onclick="eliminarEquipo(${id})" class="bg-red-700 text-white px-2 py-1 rounded">Sí</button>
      <button onclick="cancelarEliminacion(${id})" class="bg-gray-400 text-white px-2 py-1 rounded">No</button>
    </div>
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

// Reemplazar la función de confirmación para usar el nuevo modal
function mostrarConfirmacion(id) {
  const container = document.getElementById(`delete-controls-${id}`);
  container.innerHTML = `
    <div class="flex gap-1">
      <button onclick="mostrarModalInactivar(${id})" class="bg-red-700 text-white px-2 py-1 rounded">Inactivar</button>
      <button onclick="cancelarEliminacion(${id})" class="bg-gray-400 text-white px-2 py-1 rounded">Cancelar</button>
    </div>
  `;
}






// Función para mostrar mensajes (mismo diseño que en puestos)
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
  }, 3000);
}


