// ✅ verEquipo.js
const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";
const API_PREVENTIVOS = "https://inventario-api-gw73.onrender.com/mantenimientos/preventivos";
const API_CORRECTIVOS = "https://inventario-api-gw73.onrender.com/mantenimientos/correctivos";

// 👤 Usuario en sesión
const usuario = localStorage.getItem("usuario") || "Administrador";

// 📌 Obtener ID de equipo desde la URL
function getEquipoIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

document.addEventListener("DOMContentLoaded", async () => {
  const equipoId = getEquipoIdFromUrl();
  if (!equipoId) {
    mostrarMensaje("❌ No se proporcionó un ID de equipo", true);
    return;
  }

  // 🔹 Cargar datos del equipo
  try {
    const resEquipo = await fetch(`${API_EQUIPOS}/${equipoId}`);
    if (!resEquipo.ok) throw new Error("No se pudo cargar el equipo");
    const equipo = await resEquipo.json();

    renderInfoEquipo(equipo);

    // Botón editar
    document.getElementById("editar-btn").onclick = () => {
      window.location.href = `editarEquipo.html?id=${equipoId}`;
    };
  } catch (err) {
    console.error("Error en equipo:", err);
    mostrarMensaje("❌ Error al cargar los detalles del equipo", true);
    return;
  }

  // 🔹 Cargar mantenimientos
  cargarPreventivos(equipoId);
  cargarCorrectivos(equipoId);

  // 🔹 Validar nuevo preventivo
  document.getElementById("btn-validar-preventivo").onclick = async () => {
    try {
      const hoy = new Date().toISOString().split("T")[0];
      await fetch(API_PREVENTIVOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_equipo: equipoId,
          fecha: hoy,
          realizado_por: usuario,
        }),
      });
      mostrarMensaje("✅ Mantenimiento preventivo registrado");
      cargarPreventivos(equipoId);
    } catch (err) {
      console.error("Error guardando preventivo:", err);
      mostrarMensaje("❌ Error registrando preventivo", true);
    }
  };

  // 🔹 Botón agregar correctivo (abre un prompt simple)
  document.getElementById("btn-agregar-correctivo").onclick = async () => {
    const descripcion = prompt("Descripción del correctivo:");
    if (!descripcion) return;

    const observaciones = prompt("Observaciones:");

    try {
      const hoy = new Date().toISOString().split("T")[0];
      await fetch(API_CORRECTIVOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_equipo: equipoId,
          fecha: hoy,
          descripcion,
          observaciones,
          realizado_por: usuario,
        }),
      });

      mostrarMensaje("✅ Correctivo registrado");
      cargarCorrectivos(equipoId);
    } catch (err) {
      console.error("Error guardando correctivo:", err);
      mostrarMensaje("❌ Error registrando correctivo", true);
    }
  };
});

// 🔹 Renderizar la información general del equipo
function renderInfoEquipo(equipo) {
  const contenedor = document.getElementById("info-equipo");
  contenedor.innerHTML = `
    <p><strong>Código:</strong> ${equipo.codigo_interno || "-"}</p>
    <p><strong>Nombre:</strong> ${equipo.nombre || "-"}</p>
    <p><strong>Descripción:</strong> ${equipo.descripcion || "-"}</p>
    <p><strong>Responsable:</strong> ${equipo.responsable_nombre || "-"} (${equipo.responsable_documento || "-"})</p>
    <p><strong>Ubicación:</strong> ${
      equipo.ubicacion_tipo === "puesto"
        ? `Puesto: ${equipo.puesto_codigo || equipo.id_ubicacion}`
        : `Área: ${equipo.area_nombre || equipo.id_ubicacion}`
    }</p>

    <h3 class="mt-3 font-semibold">📌 Información de Mantenimiento</h3>
    <p><strong>Tipo de equipo:</strong> ${equipo.tipo_nombre || "-"}</p>
    <p><strong>Fecha inicio mantenimiento:</strong> ${equipo.fecha_inicio_mantenimiento || "-"}</p>
    <p><strong>Próximo mantenimiento:</strong> ${equipo.proximo_mantenimiento || "-"}</p>
    <p><strong>Intervalo:</strong> ${equipo.intervalo_dias ? `${equipo.intervalo_dias} días` : "-"}</p>
  `;

  // Campos personalizados
  const camposDiv = document.createElement("div");
  camposDiv.className = "mt-4";
  camposDiv.innerHTML = "<h3 class='font-semibold'>Campos Personalizados:</h3>";

  if (equipo.campos_personalizados) {
    Object.entries(equipo.campos_personalizados).forEach(([campo, valor]) => {
      const p = document.createElement("p");
      p.innerHTML = `<strong>${campo}:</strong> ${valor}`;
      camposDiv.appendChild(p);
    });
  } else {
    camposDiv.innerHTML += "<p>No hay información adicional</p>";
  }

  contenedor.appendChild(camposDiv);
}

// 🔹 Cargar preventivos
async function cargarPreventivos(equipoId) {
  try {
    const res = await fetch(`${API_PREVENTIVOS}/${equipoId}`);
    if (!res.ok) throw new Error("No se pudieron cargar los preventivos");

    const preventivos = await res.json();
    const tbody = document.getElementById("tabla-preventivos");
    tbody.innerHTML = "";

    if (preventivos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2" class="text-center py-3 text-gray-500">No hay mantenimientos preventivos</td></tr>`;
      document.getElementById("proximo-preventivo").textContent = "-";
    } else {
      preventivos.forEach((p) => {
        const row = `
          <tr>
            <td class="px-4 py-2 border">${p.fecha}</td>
            <td class="px-4 py-2 border">${p.realizado_por}</td>
          </tr>`;
        tbody.innerHTML += row;
      });

      // Calcular próximo (basado en última fecha)
      const ultimaFecha = new Date(preventivos[preventivos.length - 1].fecha);
      ultimaFecha.setMonth(ultimaFecha.getMonth() + 3); // 👈 cada 3 meses
      document.getElementById("proximo-preventivo").textContent =
        ultimaFecha.toISOString().split("T")[0];
    }
  } catch (err) {
    console.error("Error en preventivos:", err);
    mostrarMensaje("❌ Error cargando preventivos", true);
  }
}

// 🔹 Cargar correctivos
async function cargarCorrectivos(equipoId) {
  try {
    const res = await fetch(`${API_CORRECTIVOS}/${equipoId}`);
    if (!res.ok) throw new Error("No se pudieron cargar los correctivos");

    const correctivos = await res.json();
    const tbody = document.getElementById("tabla-correctivos");
    tbody.innerHTML = "";

    if (correctivos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-gray-500">No hay mantenimientos correctivos</td></tr>`;
    } else {
      correctivos.forEach((c) => {
        const row = `
          <tr>
            <td class="px-4 py-2 border">${c.fecha}</td>
            <td class="px-4 py-2 border">${c.descripcion}</td>
            <td class="px-4 py-2 border">${c.realizado_por}</td>
            <td class="px-4 py-2 border">${c.observaciones || "-"}</td>
          </tr>`;
        tbody.innerHTML += row;
      });
    }
  } catch (err) {
    console.error("Error en correctivos:", err);
    mostrarMensaje("❌ Error cargando correctivos", true);
  }
}

// 🔹 Mensajes flotantes
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
