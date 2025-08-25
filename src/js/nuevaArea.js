document.addEventListener("DOMContentLoaded", async () => {
  // Cargar sedes en el <select>
  try {
    const res = await fetch("https://inventario-api-gw73.onrender.com/sedes");
    const sedes = await res.json();
    const select = document.getElementById("sede");

    sedes.forEach((sede) => {
      const option = document.createElement("option");
      option.value = sede.id; // ID de la sede
      option.textContent = sede.nombre; // Nombre de la sede
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error cargando sedes:", err);
    mostrarMensaje("Error cargando sedes", true);
  }

  // Manejar envío del formulario
  const form = document.getElementById("form-nueva-area");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre_area").value.trim();
    const codigo = document.getElementById("codigo_area").value.trim();
    const id_sede = document.getElementById("sede").value;

    try {
      const res = await fetch("https://inventario-api-gw73.onrender.com/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, nombre, id_sede }),
      });

      const data = await res.json();

      if (!res.ok) {
        mostrarMensaje(data.error || "Error al crear el área.", true);
        return;
      }

      mostrarMensaje("✅ Área creada correctamente.");
      setTimeout(() => {
        window.location.href = "areas.html"; // redirige a la lista
      }, 1500);
    } catch (err) {
      console.error("Error creando área:", err);
      mostrarMensaje("Error de conexión con el servidor.", true);
    }
  });
});

// Función para mostrar mensajes (mismo diseño que en puestos)
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-area");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-area";
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