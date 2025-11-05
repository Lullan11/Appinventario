let inventario = {};

document.addEventListener("DOMContentLoaded", async () => {
  await cargarProductos(); // 🧠 Cargar los productos desde Neon al iniciar
  const btnRegistrar = document.getElementById("btnRegistrar");
  btnRegistrar.addEventListener("click", registrarMovimiento);
});

async function cargarProductos() {
  try {
    const response = await fetch("https://inventario-api-gw73.onrender.com/productos");
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const productos = await response.json();
    const select = document.getElementById("producto");
    
    // Limpiar opciones existentes excepto la primera
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }
    
    // Agregar productos al select
    productos.forEach(prod => {
      const option = document.createElement("option");
      option.value = prod.nombre;
      option.textContent = prod.nombre;
      select.appendChild(option);
    });
    
    console.log("Productos cargados:", productos.length);
  } catch (error) {
    console.error("Error cargando productos:", error);
    alert("No se pudieron cargar los productos desde la base de datos.");
  }
}

function registrarMovimiento() {
  const fecha = document.getElementById("fecha").value;
  const producto = document.getElementById("producto").value;
  const tipo = document.getElementById("tipo").value;
  const cantidad = parseInt(document.getElementById("cantidad").value);

  // Validaciones
  if (!fecha || !producto || !tipo || !cantidad || cantidad <= 0) {
    alert("Por favor completa todos los campos con valores válidos");
    return;
  }

  // Inicializar producto en inventario si no existe
  if (!inventario[producto]) {
    inventario[producto] = 0;
  }

  // Procesar movimiento
  if (tipo === "entrada") {
    inventario[producto] += cantidad;
  } else if (tipo === "salida") {
    if (inventario[producto] < cantidad) {
      alert("Stock insuficiente para realizar esta salida");
      return;
    }
    inventario[producto] -= cantidad;
  }

  // Agregar fila a la tabla
  const tabla = document.getElementById("tabla-kardex").querySelector("tbody");
  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td>${fecha}</td>
    <td>${producto}</td>
    <td>${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</td>
    <td>${cantidad}</td>
    <td>${inventario[producto]}</td>
  `;
  tabla.appendChild(fila);

  // Limpiar formulario (excepto fecha y producto)
  document.getElementById("cantidad").value = "";
  document.getElementById("tipo").value = "";
}