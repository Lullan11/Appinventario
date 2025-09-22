document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const documento = document.getElementById("documento").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!nombre || !documento || !email || !password) {
      mostrarMensaje("Por favor completa todos los campos.", true);
      return;
    }

    try {
      const res = await fetch("https://inventario-api-gw73.onrender.com/usuarios/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, documento, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        mostrarMensaje("✅ Registro exitoso. Ahora puedes iniciar sesión.");
        setTimeout(() => {
          window.location.href = "./welcome.html";
        }, 1500); // redirige después de mostrar el mensaje
      } else {
        mostrarMensaje(data.error || "Error al registrarse", true);
      }
    } catch (err) {
      console.error("Error en registro:", err);
      mostrarMensaje("No se pudo conectar con el servidor", true);
    }
  });
});

// Función para mostrar mensajes visibles en la página
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-register");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-register";
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
    mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
  }, 3000);
}
