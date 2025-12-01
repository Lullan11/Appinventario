// welcome.js - login (ACTUALIZADO)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      mostrarMensaje("Por favor completa todos los campos.", true);
      return;
    }

    try {
      const res = await fetch("https://inventario-api-gw73.onrender.com/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // IMPORTANTE: Guardar usuario CON ROL
        localStorage.setItem("currentUser", JSON.stringify(data.usuario));
        localStorage.setItem("token", data.token);

        console.log("✅ Login exitoso:", data.usuario.nombre, "Rol:", data.usuario.rol);

        mostrarMensaje(`✅ Bienvenido ${data.usuario.nombre} (${data.usuario.rol})`);
        setTimeout(() => {
          // Redirigir a la página de inicio según el rol
          const rol = data.usuario.rol.toLowerCase();
          const paginaInicio = PAGINA_INICIO_POR_ROL[rol] || 'dashboard.html';
          window.location.href = `src/views/${paginaInicio}`;
        }, 1500);
      } else {
        mostrarMensaje(data.error || "Error al iniciar sesión", true);
      }
    } catch (err) {
      console.error("Error en login:", err);
      mostrarMensaje("No se pudo conectar con el servidor", true);
    }
  });

  // FUNCIÓN PARA MENSAJES (se mantiene igual)
  function mostrarMensaje(texto, esError = false) {
    let mensaje = document.getElementById("mensaje-login");
    if (!mensaje) {
      mensaje = document.createElement("div");
      mensaje.id = "mensaje-login";
      mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50";
      document.body.appendChild(mensaje);
    }

    mensaje.textContent = texto;
    mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${esError
        ? "bg-red-100 text-red-800 border-l-4 border-red-500"
        : "bg-green-100 text-green-800 border-l-4 border-green-500"
      }`;

    setTimeout(() => {
      mensaje.textContent = "";
      mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
    }, 3000);
  }
});