// Funciones de utilidad
function mostrarMensaje(texto, esError = false) {
  const mensaje = document.getElementById("mensaje-tipo-equipo") || crearElementoMensaje();

  mensaje.textContent = texto;
  mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 transition-all duration-300 ${esError
      ? 'bg-red-100 text-red-800 border-l-4 border-red-500'
      : 'bg-green-100 text-green-800 border-l-4 border-green-500'
    }`;

  setTimeout(() => {
    mensaje.style.opacity = '0';
    setTimeout(() => mensaje.textContent = "", 300);
  }, 3000);
}

function crearElementoMensaje() {
  const mensaje = document.createElement("div");
  mensaje.id = "mensaje-tipo-equipo";
  document.body.appendChild(mensaje);
  return mensaje;
}

function validarFormulario(nombre, campos) {
  if (!nombre.trim()) {
    mostrarMensaje("Por favor escribe el nombre del tipo de equipo.", true);
    return false;
  }

  if (campos.length === 0) {
    mostrarMensaje("Debes agregar al menos un campo requerido.", true);
    return false;
  }

  // Validar que todos los campos tengan nombre
  const camposInvalidos = campos.filter(c => !c.nombre.trim());
  if (camposInvalidos.length > 0) {
    mostrarMensaje("Todos los campos deben tener un nombre válido.", true);
    return false;
  }

  return true;
}

function agregarCampo(nombre = '', tipo = 'texto') {
  const container = document.getElementById("campos-requeridos");
  const campoId = Date.now(); // ID único para cada campo

  const div = document.createElement("div");
  div.className = "flex gap-2 items-center campo-personalizado";
  div.innerHTML = `
        <input 
          type="text" 
          class="flex-1 rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705] transition" 
          placeholder="Nombre del campo requerido" 
          value="${nombre}"
          required 
        />
        <select class="border-2 border-[#0F172A] px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-[#F2B705] transition">
          <option value="texto" ${tipo === 'texto' ? 'selected' : ''}>Texto</option>
          <option value="numero" ${tipo === 'numero' ? 'selected' : ''}>Número</option>
          <option value="fecha" ${tipo === 'fecha' ? 'selected' : ''}>Fecha</option>
        </select>
        <button 
          type="button" 
          onclick="this.parentElement.remove()" 
          class="text-red-600 text-lg font-bold hover:text-red-800 transition"
        >
          &times;
        </button>
      `;

  container.appendChild(div);
  if (!nombre) {
    div.querySelector("input").focus();
  }
}

// Cargar tipo de equipo para edición
async function cargarTipoParaEdicion(id) {
  try {
    const res = await fetch(`https://inventario-api-gw73.onrender.com/tipos-equipo/${id}`);

    if (!res.ok) {
      throw new Error(`Error ${res.status}`);
    }

    const tipo = await res.json();

    // Llenar el formulario con los datos existentes
    document.getElementById("nombreTipoEquipo").value = tipo.nombre;

    // Limpiar campos existentes
    document.getElementById("campos-requeridos").innerHTML = '';

    // Agregar campos existentes
    tipo.campos.forEach(campo => {
      agregarCampo(campo.nombre_campo, campo.tipo_dato);
    });

    // Cambiar el texto del botón
    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Actualizar Tipo de Equipo';
    submitBtn.className = 'px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold border-2 border-blue-700 hover:bg-blue-700 transition';

    // Cambiar el título
    document.querySelector('h1').textContent = 'Editar Tipo de Equipo';

    // Guardar el ID para la actualización
    document.getElementById("form-tipo-equipo").dataset.editId = id;

  } catch (err) {
    console.error("Error al cargar tipo para edición:", err);
    mostrarMensaje("❌ Error al cargar tipo de equipo", true);
  }
}

// Event Listener mejorado
document.getElementById("form-tipo-equipo")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const nombre = document.getElementById("nombreTipoEquipo").value.trim();
  const esEdicion = this.dataset.editId;

  const campos = Array.from(document.querySelectorAll(".campo-personalizado"))
    .map(div => ({
      nombre: div.querySelector("input").value.trim(),
      tipo_dato: div.querySelector("select").value
    }))
    .filter(c => c.nombre); // Filtrar campos vacíos

  if (!validarFormulario(nombre, campos)) {
    return;
  }

  try {
    const url = esEdicion
      ? `https://inventario-api-gw73.onrender.com/tipos-equipo/${esEdicion}`
      : "https://inventario-api-gw73.onrender.com/tipos-equipo";

    const method = esEdicion ? "PUT" : "POST";

    const res = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        nombre,
        campos: campos.map(c => ({
          nombre: c.nombre,
          tipo_dato: c.tipo_dato
        }))
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.msg || `Error ${res.status}`);
    }

    mostrarMensaje(esEdicion ? "✅ Tipo de equipo actualizado correctamente." : "✅ Tipo de equipo creado correctamente.");

    setTimeout(() => {
      if (esEdicion) {
        // Si estamos editando, recargar la página
        window.location.reload();
      } else {
        window.location.href = 'nuevoEquipo.html';
      }
    }, 1500);

  } catch (err) {
    console.error("Error:", err);
    mostrarMensaje(err.message || "Error de conexión con el servidor.", true);
  }
});

// Cargar tipos optimizado
async function cargarTipos() {
  try {
    const res = await fetch("https://inventario-api-gw73.onrender.com/tipos-equipo");

    if (!res.ok) {
      throw new Error(`Error ${res.status}`);
    }

    const tipos = await res.json();
    const tabla = document.getElementById("tabla-tipos");

    if (!tabla) return;

    tabla.innerHTML = tipos.map(tipo => `
          <tr>
            <td class="p-2 border border-[#0F172A]">${tipo.id}</td>
            <td class="p-2 border border-[#0F172A] font-semibold">${tipo.nombre}</td>
            <td class="p-2 border border-[#0F172A]">
              ${tipo.campos.map(c => `
                <span class="inline-block bg-gray-200 px-2 py-1 rounded text-xs mr-1 mb-1">
                  ${c.nombre_campo} (${c.tipo_dato})
                </span>
              `).join("")}
            </td>
            <td class="p-2 border border-[#0F172A]">
              <div class="flex gap-2">
                <button 
                  onclick="editarTipo(${tipo.id})" 
                  class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                >
                  <i class="fas fa-edit"></i> Editar
                </button>
                <button 
                  onclick="eliminarTipo(${tipo.id})" 
                  class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                >
                  <i class="fas fa-trash"></i> Eliminar
                </button>
              </div>
            </td>
          </tr>
        `).join("");

  } catch (err) {
    console.error("Error al cargar tipos:", err);
    mostrarMensaje("❌ Error al cargar tipos de equipo", true);
  }
}

// Función para editar tipo
function editarTipo(id) {
  // Cargar los datos directamente en el formulario actual
  cargarTipoParaEdicion(id);

  // Hacer scroll suave al formulario para que el usuario vea los cambios
  document.getElementById('form-tipo-equipo').scrollIntoView({
    behavior: 'smooth'
  });
}

// Eliminar tipo mejorado
async function eliminarTipo(id) {
  if (!confirm("¿Estás seguro de que quieres eliminar este tipo de equipo?\n\n⚠️ Esta acción no se puede deshacer y podría afectar a los equipos que usen este tipo.")) {
    return;
  }

  try {
    const res = await fetch(`https://inventario-api-gw73.onrender.com/tipos-equipo/${id}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.msg || `Error ${res.status}`);
    }

    mostrarMensaje("✅ Tipo de equipo eliminado correctamente");
    cargarTipos();

  } catch (err) {
    console.error("Error al eliminar:", err);
    mostrarMensaje(err.message || "❌ Error al eliminar tipo de equipo", true);
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', function () {
  cargarTipos();

  // Agregar un campo inicial
  agregarCampo();
});