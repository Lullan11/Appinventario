document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const codigo = document.getElementById("codigo").value.trim();
    const nombre = document.getElementById("nombre").value.trim();
    const direccion = document.getElementById("direccion").value.trim();

    if (!codigo || !nombre || !direccion) {
      mostrarMensaje("Por favor completa todos los campos.", true);
      return;
    }

    try {
      const res = await fetch("https://inventario-api-gw73.onrender.com/sedes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ codigo, nombre, direccion }),
      });

      if (!res.ok) {
        throw new Error("Error al crear la sede.");
      }

      mostrarMensaje("✅ Sede creada exitosamente.");
      setTimeout(() => {
        window.location.href = "sedes.html";
      }, 1500); // Redirige después de mostrar el mensaje
    } catch (err) {
      console.error(err);
      mostrarMensaje("Hubo un problema al guardar la sede.", true);
    }
  });
});

// Función para mostrar mensajes (mismo diseño que en puestos)
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-sede");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-sede";
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