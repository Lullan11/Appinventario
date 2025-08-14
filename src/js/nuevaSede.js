document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const mensaje = document.getElementById("mensaje");

  function mostrarMensaje(texto, esError = false) {
    mensaje.textContent = texto;
    mensaje.style.color = esError ? "red" : "green";

    // Ocultar mensaje después de 3 segundos
    setTimeout(() => {
      mensaje.textContent = "";
    }, 3000);
  }

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
