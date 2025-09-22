// welcome.js - recover password
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("recoverForm");

  if (!form) return; // si no existe, salir (evita errores en login.html)

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("recoverEmail").value.trim();
    const newPassword = document.getElementById("recoverNewPassword").value.trim();

    if (!email || !newPassword) {
      mostrarMensaje("Completa todos los campos de recuperación.", true);
      return;
    }

    try {
      const res = await fetch("https://inventario-api-gw73.onrender.com/usuarios/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await res.json();
      mostrarMensaje(data.message || data.error, !res.ok);

      if (res.ok) {
        // Limpiar campos
        document.getElementById("recoverEmail").value = "";
        document.getElementById("recoverNewPassword").value = "";
      }
    } catch (err) {
      console.error("Error en recuperación:", err);
      mostrarMensaje("Error al enviar la solicitud.", true);
    }
  });

  // FUNCIÓN PARA MENSAJES
  function mostrarMensaje(texto, esError = false) {
    let mensaje = document.getElementById("mensaje-login");
    if (!mensaje) {
      mensaje = document.createElement("div");
      mensaje.id = "mensaje-login";
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
});
