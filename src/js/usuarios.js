const API_URL = "https://inventario-api-gw73.onrender.com/usuarios";

// Función para mostrar mensajes
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-usuarios");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-usuarios";
    mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50";
    document.body.appendChild(mensaje);
  }

  mensaje.textContent = texto;
  mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${
    esError ? 'bg-red-100 text-red-800 border-l-4 border-red-500' : 'bg-green-100 text-green-800 border-l-4 border-green-500'
  }`;

  setTimeout(() => {
    mensaje.textContent = "";
    mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
  }, 3000);
}

// Abrir formulario
function abrirFormularioUsuario(editData = null) {
  const container = document.getElementById("formUsuarioContainer");
  container.classList.remove("hidden");
  const titulo = editData ? "Editar Usuario" : "Nuevo Usuario";
  document.getElementById("tituloFormUsuario").textContent = titulo;

  const inputPassword = document.getElementById("usuarioPassword");
  const inputRespuesta = document.getElementById("usuarioRespuesta");

  if (editData) {
    // Edición: llenar campos existentes y dejar password/respuesta vacíos y opcionales
    document.getElementById("usuarioNombre").value = editData.nombre;
    document.getElementById("usuarioDocumento").value = editData.documento;
    document.getElementById("usuarioCorreo").value = editData.email;
    document.getElementById("usuarioPregunta").value = editData.security_question;
    inputRespuesta.value = "";
    inputPassword.value = "";

    inputPassword.required = false;
    inputRespuesta.required = false;

    container.dataset.editId = editData.id;
  } else {
    // Creación: limpiar todo y hacer password/respuesta obligatorios
    document.getElementById("formUsuario").reset();
    inputPassword.required = true;
    inputRespuesta.required = true;
    delete container.dataset.editId;
  }
}

// Cerrar formulario
function cerrarFormularioUsuario() {
  const container = document.getElementById("formUsuarioContainer");
  container.classList.add("hidden");
  delete container.dataset.editId;
}

// Guardar/Editar usuario
document.getElementById("formUsuario").addEventListener("submit", async (e) => {
  e.preventDefault();
  const container = document.getElementById("formUsuarioContainer");
  const id = container.dataset.editId;

  const nombre = document.getElementById("usuarioNombre").value.trim();
  const documento = document.getElementById("usuarioDocumento").value.trim();
  const email = document.getElementById("usuarioCorreo").value.trim();
  const question = document.getElementById("usuarioPregunta").value.trim();
  const answer = document.getElementById("usuarioRespuesta").value.trim();
  const password = document.getElementById("usuarioPassword").value.trim();

  const method = id ? "PUT" : "POST";
  const url = id ? `${API_URL}/${id}` : API_URL;

  const bodyData = { nombre, documento, email, security_question: question };
  if (password) bodyData.password = password;
  if (answer) bodyData.security_answer = answer;

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData)
    });
    const data = await res.json();

    if (res.ok) {
      mostrarMensaje(id ? "✅ Usuario actualizado." : "✅ Usuario creado.");
      cargarUsuarios();
      cerrarFormularioUsuario();
    } else {
      mostrarMensaje(data.error || "❌ Error al guardar usuario.", true);
    }
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error al conectar con el servidor.", true);
  }
});

// Cargar usuarios
async function cargarUsuarios() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const tabla = document.getElementById("tablaUsuarios");
    tabla.innerHTML = "";

    if (!data.length) {
      tabla.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay usuarios registrados.</td></tr>`;
      return;
    }

    data.forEach(u => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-100 transition";
      tr.innerHTML = `
        <td class="px-4 py-2 border">${u.nombre}</td>
        <td class="px-4 py-2 border">${u.documento}</td>
        <td class="px-4 py-2 border">${u.email}</td>
        <td class="px-4 py-2 border">${u.security_question}</td>
        <td class="px-4 py-2 border text-center">
          <div id="delete-controls-${u.id}" class="flex justify-center gap-2 flex-wrap">
            <button onclick='abrirFormularioUsuario(${JSON.stringify(u)})' class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Editar</button>
            <button onclick='mostrarConfirmacionUsuario(${u.id})' class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Eliminar</button>
          </div>
        </td>
      `;
      tabla.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error al cargar usuarios.", true);
  }
}

// Confirmación de eliminación
function mostrarConfirmacionUsuario(id) {
  const container = document.getElementById(`delete-controls-${id}`);
  container.innerHTML = `
    <div class="flex gap-1">
      <button onclick="eliminarUsuario(${id})" class="bg-red-700 text-white px-2 py-1 rounded">Sí</button>
      <button onclick="cancelarEliminacionUsuario(${id})" class="bg-gray-400 text-white px-2 py-1 rounded">No</button>
    </div>
  `;
}

function cancelarEliminacionUsuario(id) {
  const container = document.getElementById(`delete-controls-${id}`);
  container.innerHTML = `
    <button onclick='abrirFormularioUsuario(${id})' class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Editar</button>
    <button onclick='mostrarConfirmacionUsuario(${id})' class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Eliminar</button>
  `;
}

// Eliminar usuario
async function eliminarUsuario(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      mostrarMensaje(data.message || "❌ No se pudo eliminar el usuario.", true);
      cancelarEliminacionUsuario(id);
      return;
    }

    mostrarMensaje("✅ Usuario eliminado correctamente.");
    setTimeout(cargarUsuarios, 1000);
  } catch (err) {
    console.error(err);
    mostrarMensaje("❌ Error al conectar con el servidor.", true);
  }
}

// Filtrar tabla
function filtrarUsuarios() {
  const texto = document.getElementById('busqueda').value.toLowerCase();
  const filas = document.querySelectorAll('#tablaUsuarios tr');
  filas.forEach(fila => {
    const contenido = fila.textContent.toLowerCase();
    fila.style.display = contenido.includes(texto) ? '' : 'none';
  });
}

// Inicializar
document.addEventListener("DOMContentLoaded", cargarUsuarios);
