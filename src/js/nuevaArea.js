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
        mostrarMensaje(data.error || "❌ Error al crear el área.", true);
        return;
      }

      mostrarMensaje("✅ Área creada correctamente.");
      setTimeout(() => {
        window.location.href = "areas.html"; // redirige a la lista
      }, 1500);
    } catch (err) {
      console.error("Error creando área:", err);
      mostrarMensaje("❌ Error de conexión con el servidor.", true);
    }
  });
});

// Reutilizamos la misma función de mensajes que usamos en sedes
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje";
    mensaje.className = "mt-4 text-center font-semibold";
    document.querySelector("main").prepend(mensaje);
  }
  mensaje.textContent = texto;
  mensaje.style.color = esError ? "red" : "green";

  setTimeout(() => {
    mensaje.textContent = "";
  }, 3000);
}
