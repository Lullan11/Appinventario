document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Evita que se recargue la página

    const codigo = document.getElementById("codigo").value.trim();
    const nombre = document.getElementById("nombre").value.trim();
    const direccion = document.getElementById("direccion").value.trim();

    // Validación simple
    if (!codigo || !nombre || !direccion) {
      alert("Por favor completa todos los campos.");
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

      alert("Sede creada exitosamente.");
      window.location.href = "sedes.html"; // Redirige a la lista de sedes
    } catch (err) {
      console.error(err);
      alert("Hubo un problema al guardar la sede.");
    }
  });
});
