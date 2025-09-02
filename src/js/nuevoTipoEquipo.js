function mostrarError(mensaje) {
  mostrarMensaje(mensaje, true); // ahora usa el mismo estilo de mensajes flotantes
}

// Función para mostrar mensajes (éxito o error)
function mostrarMensaje(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-tipo-equipo");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-tipo-equipo";
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

function agregarCampo() {
  const container = document.getElementById("campos-requeridos");
  const div = document.createElement("div");
  div.className = "flex gap-2 items-center";
  div.innerHTML = `
    <input type="text" class="flex-1 rounded-md border-2 border-[#0F172A] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F2B705] transition" placeholder="Nombre del campo requerido" required />
    <select class="border-2 border-[#0F172A] px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-[#F2B705] transition">
      <option value="texto">Texto</option>
      <option value="numero">Número</option>
      <option value="fecha">Fecha</option>
    </select>
    <button type="button" onclick="this.parentElement.remove()" class="text-red-600 text-lg font-bold">&times;</button>
  `;
  container.appendChild(div);
  div.querySelector("input").focus();
}

document.getElementById("form-tipo-equipo").addEventListener("submit", async function(e) {
  e.preventDefault();

  const nombreInput = document.getElementById("nombreTipoEquipo");
  const nombre = nombreInput.value.trim();

  const campos = [...document.querySelectorAll("#campos-requeridos div")].map(div => {
    const nombreCampo = div.querySelector("input").value.trim();
    const tipoDato = div.querySelector("select").value;
    return { nombre: nombreCampo, tipo_dato: tipoDato };
  }).filter(c => c.nombre);

  if (!nombre) {
    mostrarMensaje("Por favor escribe el nombre del tipo de equipo.", true);
    nombreInput.focus();
    return;
  }

  if (campos.length === 0) {
    mostrarMensaje("Debes agregar al menos un campo requerido.", true);
    return;
  }

  try {
    const res = await fetch("https://inventario-api-gw73.onrender.com/tipos-equipo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, campos })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMensaje(data.msg || "Error al guardar tipo de equipo", true);
      return;
    }

    mostrarMensaje("✅ Tipo de equipo creado correctamente.");
    setTimeout(() => {
      window.location.href = "nuevoEquipo.html";
    }, 1500);

  } catch (err) {
    console.error(err);
    mostrarMensaje("Error de conexión con el servidor.", true);
  }
});
