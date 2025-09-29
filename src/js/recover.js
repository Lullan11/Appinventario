document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("recoverForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("recoverEmail").value.trim();

    if (!email) {
      mostrarMensaje("❌ Por favor ingresa tu correo.", true);
      return;
    }

    try {
      const res = await fetch("https://inventario-api-gw73.onrender.com/usuarios/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        mostrarMensaje("✅ Si el correo está registrado, recibirás un enlace de recuperación.");
      } else {
        mostrarMensaje(data.error || "❌ Error al enviar el correo.", true);
      }
    } catch (err) {
      console.error("Error en la recuperación:", err);
      mostrarMensaje("❌ Error al intentar recuperar la contraseña.", true);
    }
  });
});

// Función para mostrar mensajes (mismo diseño que en sedes)
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-sedes"); // mismo id que en sedes
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-sedes";
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
