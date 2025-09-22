// ✅ verEquipo.js (revisado)
// API
const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";
const API_TIPOS = "https://inventario-api-gw73.onrender.com/tipos-equipo";
const API_PREVENTIVOS = "https://inventario-api-gw73.onrender.com/mantenimientos/preventivos";
const API_CORRECTIVOS = "https://inventario-api-gw73.onrender.com/mantenimientos/correctivos";

// Usuario en sesión (puedes reemplazar por tu sistema de auth)
const usuario = localStorage.getItem("usuario") || "Administrador";

// Equipo cargado actualmente (variable global para usar en otras funciones)
let currentEquipo = null;

// Obtener ID de equipo desde la URL
function getEquipoIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// Formatea una fecha tipo "2025-09-06T00:00:00.000Z" o "2025-09-06" a "dd/mm/yyyy"
// Evita crear new Date(...) sobre la cadena completa para prevenir el desplazamiento por zona horaria.
function formatDateToDDMMYYYY(dateStr) {
  if (!dateStr) return "-";
  // si viene con T, tomar la parte antes de la T
  const match = dateStr.toString().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) {
    try {
      // fallback: intentar construir Date y obtener ISO
      const d = new Date(dateStr);
      if (isNaN(d)) return "-";
      const iso = d.toISOString().split("T")[0];
      const [y, m, day] = iso.split("-");
      return `${day}/${m}/${y}`;
    } catch (e) {
      return "-";
    }
  }
  const ymd = match[1]; // YYYY-MM-DD
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

// Inicia todo al cargar DOM
document.addEventListener("DOMContentLoaded", async () => {
  const equipoId = getEquipoIdFromUrl();
  if (!equipoId) {
    mostrarMensaje("❌ No se proporcionó un ID de equipo", true);
    return;
  }

  // Cargar datos del equipo
  try {
    const resEquipo = await fetch(`${API_EQUIPOS}/${equipoId}`);
    if (!resEquipo.ok) throw new Error("No se pudo cargar el equipo");
    const equipo = await resEquipo.json();
    currentEquipo = equipo; // guardar globalmente

    // Traer información del tipo de equipo (nombre y campos) para poder mostrar
    try {
      const resTipos = await fetch(API_TIPOS);
      if (resTipos.ok) {
        const tipos = await resTipos.json();
        const tipo = tipos.find(t => t.id == equipo.id_tipo_equipo);
        if (tipo) {
          equipo.tipo_nombre = tipo.nombre;
          equipo.tipo_campos = tipo.campos || []; // array de campos definidos
        } else {
          equipo.tipo_nombre = equipo.tipo_nombre || "-";
          equipo.tipo_campos = [];
        }
      } else {
        equipo.tipo_nombre = equipo.tipo_nombre || "-";
        equipo.tipo_campos = [];
      }
    } catch (err) {
      // no romper si falla la petición de tipos
      equipo.tipo_nombre = equipo.tipo_nombre || "-";
      equipo.tipo_campos = [];
      console.warn("No se pudo cargar tipos-equipo:", err);
    }

    renderInfoEquipo(equipo);

    // Botón editar
    const editarBtn = document.getElementById("editar-btn");
    if (editarBtn) editarBtn.onclick = () => window.location.href = `editarEquipo.html?id=${equipoId}`;
  } catch (err) {
    console.error("Error al cargar equipo:", err);
    mostrarMensaje("❌ Error al cargar los detalles del equipo", true);
    return;
  }

  // Cargar mantenimientos
  cargarPreventivos(equipoId);
  cargarCorrectivos(equipoId);

  // Validar preventivo (botón)
  const btnValidar = document.getElementById("btn-validar-preventivo");
  if (btnValidar) {
    btnValidar.onclick = async () => {
      try {
        const hoy = new Date().toISOString().split("T")[0];
        const res = await fetch(API_PREVENTIVOS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_equipo: equipoId,
            fecha: hoy,
            realizado_por: usuario
          })
        });
        if (!res.ok) throw new Error("No se pudo registrar preventivo");
        mostrarMensaje("✅ Mantenimiento preventivo registrado");
        // recargar preventivos (y recalcular próximo)
        cargarPreventivos(equipoId);
        // también refrescamos la info del equipo (para mostrar proximo_mantenimiento actualizado si el backend lo actualizó)
        const refreshed = await fetch(`${API_EQUIPOS}/${equipoId}`);
        if (refreshed.ok) {
          currentEquipo = await refreshed.json();
          // intentar obtener tipo_nombre de nuevo si falta
          if (!currentEquipo.tipo_nombre) {
            try {
              const resTipos = await fetch(API_TIPOS);
              if (resTipos.ok) {
                const tipos = await resTipos.json();
                const tipo = tipos.find(t => t.id == currentEquipo.id_tipo_equipo);
                if (tipo) currentEquipo.tipo_nombre = tipo.nombre;
              }
            } catch {}
          }
          renderInfoEquipo(currentEquipo);
        }
      } catch (err) {
        console.error("Error guardando preventivo:", err);
        mostrarMensaje("❌ Error registrando preventivo", true);
      }
    };
  }

  // Agregar correctivo (botón)
  const btnAgregarCorrectivo = document.getElementById("btn-agregar-correctivo");
  if (btnAgregarCorrectivo) {
    btnAgregarCorrectivo.onclick = async () => {
      const descripcion = prompt("Descripción del correctivo:");
      if (!descripcion) return;
      const observaciones = prompt("Observaciones (opcional):");

      try {
        const hoy = new Date().toISOString().split("T")[0];
        const res = await fetch(API_CORRECTIVOS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_equipo: equipoId,
            fecha: hoy,
            descripcion,
            observaciones,
            realizado_por: usuario
          })
        });
        if (!res.ok) throw new Error("No se pudo registrar correctivo");
        mostrarMensaje("✅ Correctivo registrado");
        cargarCorrectivos(equipoId);
      } catch (err) {
        console.error("Error guardando correctivo:", err);
        mostrarMensaje("❌ Error registrando correctivo", true);
      }
    };
  }
});

// Renderiza la sección "Información General" con todos los campos pedidos
function renderInfoEquipo(equipo) {
  
  const contenedor = document.getElementById("info-equipo");
  if (!contenedor) return;

  // Ubicación: si está en puesto mostrar puesto, si no el área
  let ubicacionTexto = "-";
  if (equipo.ubicacion === "puesto") {
    // Preferimos puesto_codigo, si no mostrar id_puesto
    ubicacionTexto = equipo.puesto_codigo ? `Puesto: ${equipo.puesto_codigo}` : `Puesto ID: ${equipo.id_puesto || "-"}`;
  } else if (equipo.ubicacion === "area") {
    ubicacionTexto = equipo.area_nombre ? `Área: ${equipo.area_nombre}` : `Área ID: ${equipo.id_area || "-"}`;
  }

  // Formatear fechas sin ajuste por zona horaria
  const fechaInicioFmt = formatDateToDDMMYYYY(equipo.fecha_inicio_mantenimiento);
  const proximoFmt = formatDateToDDMMYYYY(equipo.proximo_mantenimiento);

  // Tipo de equipo
  const tipoNombre = equipo.tipo_nombre || (equipo.id_tipo_equipo ? `ID ${equipo.id_tipo_equipo}` : "-");

  // Intervalo
  const intervaloTxt = equipo.intervalo_dias ? `${equipo.intervalo_dias} días` : "-";

  contenedor.innerHTML = `
    <p><strong>Código:</strong> ${equipo.codigo_interno || "-"}</p>
    <p><strong>Nombre:</strong> ${equipo.nombre || "-"}</p>
    <p><strong>Descripción:</strong> ${equipo.descripcion || "-"}</p>
    <p><strong>Responsable:</strong> ${equipo.responsable_nombre || "-"} ${equipo.responsable_documento ? `(${equipo.responsable_documento})` : ""}</p>
    <p><strong>Ubicación:</strong> ${ubicacionTexto}</p>

    <h3 class="mt-3 font-semibold">📌 Información de Mantenimiento</h3>
    <p><strong>Tipo de equipo:</strong> ${tipoNombre}</p>
    <p><strong>Fecha inicio mantenimiento:</strong> ${fechaInicioFmt}</p>
    <p><strong>Próximo mantenimiento:</strong> ${proximoFmt}</p>
    <p><strong>Intervalo:</strong> ${intervaloTxt}</p>
  `;

  // Mostrar campos personalizados (definidos por el tipo). Intentamos mostrar valores si existen.
  const camposDiv = document.createElement("div");
  camposDiv.className = "mt-4";
  camposDiv.innerHTML = `<h3 class="font-semibold">Campos Personalizados:</h3>`;

  // Si la API devolvió la definición de campos (tipo_campos), iterarlas
  const camposDef = equipo.tipo_campos || [];

  if (camposDef.length > 0) {
    // Intentamos buscar valores en las propiedades del objeto equipo (por si el backend los incluyó ahí)
    // O en una propiedad llamada 'campos_personalizados' si el backend la entrega
    const valoresDirectos = equipo.campos_personalizados || {}; // si está como objeto {nombre_campo: valor}
    camposDef.forEach(c => {
      // algunos esquemas guardan el nombre de campo en 'nombre_campo' (según tu código servidor)
      const nombreCampo = c.nombre_campo || c.nombre || c.field || "campo";
      const valor = (valoresDirectos && valoresDirectos[nombreCampo]) !== undefined
        ? valoresDirectos[nombreCampo]
        : (equipo[nombreCampo] !== undefined ? equipo[nombreCampo] : "-");
      const p = document.createElement("p");
      p.innerHTML = `<strong>${nombreCampo}:</strong> ${valor}`;
      camposDiv.appendChild(p);
    });
  } else {
    // Si no hay definición de campos, pero el backend puede haber devuelto un objeto 'campos_personalizados'
    if (equipo.campos_personalizados && Object.keys(equipo.campos_personalizados).length > 0) {
      Object.entries(equipo.campos_personalizados).forEach(([k, v]) => {
        const p = document.createElement("p");
        p.innerHTML = `<strong>${k}:</strong> ${v}`;
        camposDiv.appendChild(p);
      });
    } else {
      camposDiv.innerHTML += "<p>No hay información adicional</p>";
    }
  }

  contenedor.appendChild(camposDiv);
}

// Cargar historial de preventivos y actualizar el campo "Próximo mantenimiento" si hace falta
async function cargarPreventivos(equipoId) {
  try {
    const res = await fetch(`${API_PREVENTIVOS}/${equipoId}`);
    if (!res.ok) throw new Error("No se pudieron cargar los preventivos");
    const preventivos = await res.json();
    const tbody = document.getElementById("tabla-preventivos");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!preventivos || preventivos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2" class="text-center py-3 text-gray-500">No hay mantenimientos preventivos</td></tr>`;
      // Si no hay historial, usar proximo_mantenimiento del equipo (si existe) o '-'
      if (currentEquipo && currentEquipo.proximo_mantenimiento) {
        document.getElementById("proximo-preventivo").textContent = formatDateToDDMMYYYY(currentEquipo.proximo_mantenimiento);
      } else {
        document.getElementById("proximo-preventivo").textContent = "-";
      }
      return;
    }

    // Mostrar la lista (ordeno por fecha descendente si no viene así)
    preventivos.sort((a,b) => (a.fecha < b.fecha) ? 1 : -1);
    preventivos.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="px-4 py-2 border">${formatDateToDDMMYYYY(p.fecha)}</td>
        <td class="px-4 py-2 border">${p.realizado_por || "-"}</td>
      `;
      tbody.appendChild(tr);
    });

    // Determinar próximo mantenimiento:
    // 1) Si backend ya actualizó currentEquipo.proximo_mantenimiento, mostrarlo.
    // 2) Sino, usar la última fecha registrada + intervalo_dias del equipo (si existe).
    if (currentEquipo && currentEquipo.proximo_mantenimiento) {
      document.getElementById("proximo-preventivo").textContent = formatDateToDDMMYYYY(currentEquipo.proximo_mantenimiento);
    } else {
      const ultima = preventivos[0]; // la más reciente (tras el sort)
      const intervalo = currentEquipo ? parseInt(currentEquipo.intervalo_dias) : NaN;
      if (intervalo && ultima && ultima.fecha) {
        // suma intervalo en días a la última fecha (manipular con partes YYYY-MM-DD para evitar timezone issues)
        const ymd = ultima.fecha.toString().match(/^(\d{4}-\d{2}-\d{2})/)[1];
        const [y, m, d] = ymd.split("-").map(Number);
        const dt = new Date(Date.UTC(y, m-1, d)); // crear como UTC
        dt.setUTCDate(dt.getUTCDate() + intervalo);
        const iso = dt.toISOString().split("T")[0];
        document.getElementById("proximo-preventivo").textContent = formatDateToDDMMYYYY(iso);
      } else {
        document.getElementById("proximo-preventivo").textContent = "-";
      }
    }
  } catch (err) {
    console.error("Error cargando preventivos:", err);
    mostrarMensaje("❌ Error cargando preventivos", true);
  }
}

// Cargar historial de correctivos
async function cargarCorrectivos(equipoId) {
  try {
    const res = await fetch(`${API_CORRECTIVOS}/${equipoId}`);
    if (!res.ok) throw new Error("No se pudieron cargar los correctivos");
    const correctivos = await res.json();
    const tbody = document.getElementById("tabla-correctivos");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!correctivos || correctivos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-gray-500">No hay mantenimientos correctivos</td></tr>`;
      return;
    }

    // si vienen sin ordenar, ordenamos desc por fecha
    correctivos.sort((a,b) => (a.fecha < b.fecha) ? 1 : -1);

    correctivos.forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="px-4 py-2 border">${formatDateToDDMMYYYY(c.fecha)}</td>
        <td class="px-4 py-2 border">${c.descripcion || "-"}</td>
        <td class="px-4 py-2 border">${c.realizado_por || "-"}</td>
        <td class="px-4 py-2 border">${c.observaciones || "-"}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error cargando correctivos:", err);
    mostrarMensaje("❌ Error cargando correctivos", true);
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
  mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${
    esError ? "bg-red-100 text-red-800 border-l-4 border-red-500" : "bg-green-100 text-green-800 border-l-4 border-green-500"
  }`;

  setTimeout(() => {
    mensaje.textContent = "";
    mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
  }, 3000);
}
