const API_URL = "https://inventario-api-gw73.onrender.com/areas";
const API_SEDES = "https://inventario-api-gw73.onrender.com/sedes";

// Obtener parámetros de la URL (ej: editarArea.html?id=3)
function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

document.addEventListener("DOMContentLoaded", async () => {
  const id = getIdFromUrl();
  if (!id) {
    mostrarMensaje("No se encontró el ID del área.", true);
    return;
  }

  let area;

  // 1) Traer datos del área
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error("No se encontró el área");
    area = await res.json();

    document.getElementById("nombre_area").value = area.nombre;
    document.getElementById("codigo_area").value = area.codigo;
  } catch (err) {
    console.error("Error cargando área:", err);
    mostrarMensaje("Error al cargar los datos del área.", true);
    return;
  }

  // 2) Cargar sedes y preseleccionar la sede a la que pertenece el área
  try {
    const resSedes = await fetch(API_SEDES);
    if (!resSedes.ok) throw new Error("Error al traer sedes");

    const sedes = await resSedes.json(); // ← { id, codigo, nombre, ... }
    const select = document.getElementById("sede");

    // Limpia y deja el placeholder
    select.innerHTML = '<option value="">Selecciona una sede</option>';

    // Pinta todas las sedes (usar "id" porque así lo devuelve tu API)
    sedes.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = String(s.id);
      opt.textContent = s.nombre;
      select.appendChild(opt);
    });

    // Determinar el id a seleccionar:
    //   - Preferir area.id_sede (si el backend ya lo devuelve)
    //   - Si no existe, hacer fallback por nombre (area.sede_nombre)
    let idSedeSeleccionada = area.id_sede;

    if (idSedeSeleccionada == null && area.sede_nombre) {
      const coincidencia = sedes.find((s) => s.nombre === area.sede_nombre);
      if (coincidencia) idSedeSeleccionada = coincidencia.id;
    }

    if (idSedeSeleccionada != null) {
      select.value = String(idSedeSeleccionada);
    } else {
      // Si no encontramos nada, dejamos el placeholder (seguirá siendo editable)
      console.warn("No se pudo determinar la sede del área. Revisa el endpoint /areas/:id");
    }
  } catch (err) {
    console.error("Error cargando sedes:", err);
    mostrarMensaje("Error al cargar las sedes.", true);
  }

  // 3) Manejar submit del formulario
  const form = document.getElementById("form-editar-area");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre_area").value.trim();
    const codigo = document.getElementById("codigo_area").value.trim();
    const id_sede = document.getElementById("sede").value;

    if (!id_sede) {
      mostrarMensaje("Debes seleccionar una sede.", true);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo,
          nombre,
          // asegúrate de enviar número; tu SQL espera integer
          id_sede: Number(id_sede),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Respuesta servidor:", data);
        mostrarMensaje(data.error || data.message || "Error al actualizar el área.", true);
        return;
      }

      mostrarMensaje("✅ Área actualizada correctamente.");
      setTimeout(() => {
        window.location.href = "areas.html";
      }, 1200);
    } catch (err) {
      console.error("Error actualizando área:", err);
      mostrarMensaje("Error de conexión con el servidor.", true);
    }
  });
});

// Función para mostrar mensajes (mismo diseño que en puestos)
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-area");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-area";
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