// src/js/usuarios.js - SISTEMA COMPLETO DE GESTIÓN DE USUARIOS CON ROLES
const API_URL = "https://inventario-api-gw73.onrender.com/usuarios";
const ACCESS_PASSWORD = "api";

// ========================= SISTEMA DE AUTENTICACIÓN =========================

// Mostrar modal de autenticación (SIEMPRE se muestra al entrar)
function mostrarModalAutenticacion() {
    // Ocultar la interfaz principal primero
    ocultarInterfazUsuarios();
    
    const modal = document.createElement('div');
    modal.id = 'modal-autenticacion';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-80 mx-4">
            <h3 class="text-lg font-bold mb-4 text-gray-800">Acceso Restringido</h3>
            <p class="text-sm text-gray-600 mb-4">Ingrese la contraseña para acceder a la gestión de usuarios:</p>
            <input type="password" id="input-password" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="Contraseña de acceso">
            <div class="flex justify-end gap-2 mt-4">
                <button onclick="regresar()" class="px-4 py-2 text-gray-600 hover:text-gray-800">
                    Regresar
                </button>
                <button onclick="validarAcceso()" 
                        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Acceder
                </button>
            </div>
            <p id="error-auth" class="text-red-500 text-sm mt-2 hidden">Contraseña incorrecta</p>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Focus en el input
    document.getElementById('input-password').focus();
    
    // Permitir enviar con Enter
    document.getElementById('input-password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            validarAcceso();
        }
    });
}

// Regresar a la página anterior
function regresar() {
    window.history.back();
}

// Ocultar interfaz de usuarios
function ocultarInterfazUsuarios() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.display = 'none';
    }
}

// Mostrar interfaz de usuarios
function mostrarInterfazUsuarios() {
    // Mostrar el contenido principal
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.display = 'flex';
    }
    
    console.log('✅ Mostrando interfaz de usuarios');
    cargarUsuarios();
}

// Validar acceso
function validarAcceso() {
    const password = document.getElementById('input-password').value;
    const errorElement = document.getElementById('error-auth');
    
    if (password === ACCESS_PASSWORD) {
        document.getElementById('modal-autenticacion').remove();
        mostrarInterfazUsuarios();
    } else {
        errorElement.classList.remove('hidden');
        document.getElementById('input-password').value = '';
        document.getElementById('input-password').focus();
    }
}

// ========================= FUNCIONES DE MENSAJES =========================

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

// ========================= FUNCIONES PRINCIPALES =========================

// Abrir formulario
function abrirFormularioUsuario(editData = null) {
    const container = document.getElementById("formUsuarioContainer");
    container.classList.remove("hidden");
    const titulo = editData ? "Editar Usuario" : "Nuevo Usuario";
    document.getElementById("tituloFormUsuario").textContent = titulo;

    const inputPassword = document.getElementById("usuarioPassword");
    const inputRespuesta = document.getElementById("usuarioRespuesta");

    if (editData) {
        // Edición: llenar campos existentes
        document.getElementById("usuarioNombre").value = editData.nombre || '';
        document.getElementById("usuarioDocumento").value = editData.documento || '';
        document.getElementById("usuarioCorreo").value = editData.email || '';
        document.getElementById("usuarioPregunta").value = editData.security_question || '';
        document.getElementById("usuarioRol").value = editData.rol || 'tecnico'; // ← NUEVO: Rol
        
        inputRespuesta.value = "";
        inputPassword.value = "";

        inputPassword.required = false;
        inputRespuesta.required = false;

        container.dataset.editId = editData.id;
    } else {
        // Creación: limpiar todo
        document.getElementById("formUsuario").reset();
        document.getElementById("usuarioRol").value = 'tecnico'; // ← Valor por defecto
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
    const rol = document.getElementById("usuarioRol").value; // ← NUEVO: Obtener rol

    // Validaciones
    if (!nombre || !documento || !email || !question) {
        mostrarMensaje("❌ Por favor complete todos los campos obligatorios", true);
        return;
    }

    if (!id && !password) {
        mostrarMensaje("❌ La contraseña es obligatoria para nuevos usuarios", true);
        return;
    }

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/${id}` : API_URL;

    const bodyData = { 
        nombre, 
        documento, 
        email, 
        security_question: question,
        rol // ← NUEVO: Agregar rol al body
    };
    
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
            mostrarMensaje(id ? "✅ Usuario actualizado correctamente" : "✅ Usuario creado exitosamente");
            cargarUsuarios();
            cerrarFormularioUsuario();
        } else {
            mostrarMensaje(data.error || "❌ Error al guardar usuario", true);
        }
    } catch (err) {
        console.error(err);
        mostrarMensaje("❌ Error al conectar con el servidor", true);
    }
});

// Cargar usuarios
async function cargarUsuarios() {
    try {
        console.log('🔄 Cargando usuarios desde:', API_URL);
        const res = await fetch(API_URL);
        
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('📊 Usuarios cargados:', data);
        
        const tabla = document.getElementById("tablaUsuarios");
        tabla.innerHTML = "";

        if (!data || !data.length) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-gray-500">
                        No hay usuarios registrados
                    </td>
                </tr>
            `;
            return;
        }

        data.forEach(u => {
            // Determinar color del badge según el rol
            let rolColor = 'bg-gray-200 text-gray-800';
            let rolTexto = u.rol || 'N/A';
            
            switch(u.rol) {
                case 'admin':
                    rolColor = 'bg-red-100 text-red-800';
                    rolTexto = 'Administrador';
                    break;
                case 'supervisor':
                    rolColor = 'bg-blue-100 text-blue-800';
                    rolTexto = 'Supervisor';
                    break;
                case 'auxiliar':
                    rolColor = 'bg-green-100 text-green-800';
                    rolTexto = 'Auxiliar';
                    break;
                case 'tecnico':
                    rolColor = 'bg-purple-100 text-purple-800';
                    rolTexto = 'Técnico';
                    break;
                case 'doctor':
                    rolColor = 'bg-indigo-100 text-indigo-800';
                    rolTexto = 'Doctor';
                    break;
            }

            const tr = document.createElement("tr");
            tr.className = "hover:bg-gray-50 border-b transition-colors";
            tr.innerHTML = `
                <td class="px-4 py-3 border">${u.nombre || 'N/A'}</td>
                <td class="px-4 py-3 border">${u.documento || 'N/A'}</td>
                <td class="px-4 py-3 border">${u.email || 'N/A'}</td>
                <td class="px-4 py-3 border">${u.security_question || 'N/A'}</td>
                <td class="px-4 py-3 border">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rolColor}">
                        ${rolTexto}
                    </span>
                </td>
                <td class="px-4 py-3 border text-center">
                    <div id="delete-controls-${u.id}" class="flex justify-center gap-2">
                        <button onclick='abrirFormularioUsuario(${JSON.stringify(u).replace(/'/g, "\\'")})' 
                                class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition text-sm">
                            Editar
                        </button>
                        <button onclick='mostrarConfirmacionUsuario(${u.id})' 
                                class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm">
                            Eliminar
                        </button>
                    </div>
                </td>
            `;
            tabla.appendChild(tr);
        });
        
        mostrarMensaje(`✅ ${data.length} usuarios cargados correctamente`);
        
    } catch (err) {
        console.error('❌ Error cargando usuarios:', err);
        mostrarMensaje("❌ Error al cargar usuarios: " + err.message, true);
        
        const tabla = document.getElementById("tablaUsuarios");
        tabla.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-red-500">
                    Error al cargar usuarios: ${err.message}
                </td>
            </tr>
        `;
    }
}

// Confirmación de eliminación
function mostrarConfirmacionUsuario(id) {
    const container = document.getElementById(`delete-controls-${id}`);
    if (!container) return;
    
    container.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="text-xs text-red-600 font-medium">¿Eliminar?</span>
            <button onclick="eliminarUsuario(${id})" 
                    class="bg-red-700 text-white px-2 py-1 rounded text-xs hover:bg-red-800 transition">
                Sí
            </button>
            <button onclick="cancelarEliminacionUsuario(${id})" 
                    class="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600 transition">
                No
            </button>
        </div>
    `;
}

function cancelarEliminacionUsuario(id) {
    cargarUsuarios();
}

// Eliminar usuario
async function eliminarUsuario(id) {
    if (!confirm('¿Está seguro de que desea eliminar este usuario?')) {
        cancelarEliminacionUsuario(id);
        return;
    }

    try {
        console.log('🗑️ Eliminando usuario ID:', id);
        const res = await fetch(`${API_URL}/${id}`, { 
            method: "DELETE" 
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "No se pudo eliminar el usuario");
        }

        mostrarMensaje("✅ Usuario eliminado correctamente");
        cargarUsuarios();
        
    } catch (err) {
        console.error('❌ Error eliminando usuario:', err);
        mostrarMensaje("❌ Error al eliminar usuario: " + err.message, true);
        cancelarEliminacionUsuario(id);
    }
}

// Filtrar tabla
function filtrarUsuarios() {
    const texto = document.getElementById('busqueda').value.toLowerCase();
    const filas = document.querySelectorAll('#tablaUsuarios tr');
    let resultados = 0;
    
    filas.forEach(fila => {
        if (fila.cells.length === 1) return;
        
        const contenido = fila.textContent.toLowerCase();
        if (contenido.includes(texto)) {
            fila.style.display = '';
            resultados++;
        } else {
            fila.style.display = 'none';
        }
    });

    // Mostrar mensaje si no hay resultados
    const mensajeNoResultados = document.getElementById('mensaje-no-resultados');
    if (!mensajeNoResultados && resultados === 0 && texto !== '') {
        const tabla = document.getElementById("tablaUsuarios");
        const mensaje = document.createElement('tr');
        mensaje.id = 'mensaje-no-resultados';
        mensaje.innerHTML = `
            <td colspan="6" class="text-center py-4 text-gray-500">
                No se encontraron usuarios que coincidan con "${texto}"
            </td>
        `;
        tabla.appendChild(mensaje);
    } else if (mensajeNoResultados && (resultados > 0 || texto === '')) {
        mensajeNoResultados.remove();
    }
}

// ========================= INICIALIZACIÓN =========================

document.addEventListener("DOMContentLoaded", function() {
    console.log('🚀 Inicializando gestión de usuarios...');
    
    // Inicializar búsqueda
    const busquedaInput = document.getElementById('busqueda');
    if (busquedaInput) {
        busquedaInput.addEventListener('input', filtrarUsuarios);
    }
    
    // Mostrar modal de autenticación
    mostrarModalAutenticacion();
});

// ========================= FUNCIONES GLOBALES =========================

// Hacer funciones disponibles globalmente para los onclick
window.abrirFormularioUsuario = abrirFormularioUsuario;
window.cerrarFormularioUsuario = cerrarFormularioUsuario;
window.mostrarConfirmacionUsuario = mostrarConfirmacionUsuario;
window.cancelarEliminacionUsuario = cancelarEliminacionUsuario;
window.eliminarUsuario = eliminarUsuario;
window.regresar = regresar;
window.validarAcceso = validarAcceso;