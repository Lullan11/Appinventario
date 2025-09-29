const API_URL = "https://inventario-api-gw73.onrender.com"; // Render

async function cargarStats() {
  try {
    const equiposRes = await fetch(`${API_URL}/stats/total-equipos`);
    const equiposData = await equiposRes.json();
    document.getElementById("total-equipos").textContent = equiposData.total;

    const oficinasRes = await fetch(`${API_URL}/stats/total-areas`);
    const oficinasData = await oficinasRes.json();
    document.getElementById("total-oficinas").textContent = oficinasData.total;

    const sedesRes = await fetch(`${API_URL}/stats/total-sedes`);
    const sedesData = await sedesRes.json();
    document.getElementById("total-sedes").textContent = sedesData.total;

    const puestosRes = await fetch(`${API_URL}/stats/total-puestos`);
    const puestosData = await puestosRes.json();
    document.getElementById("total-puestos").textContent = puestosData.total;

    // 📊 Renderizar gráficas
    renderCharts({
      equipos: equiposData.total,
      oficinas: oficinasData.total,
      sedes: sedesData.total,
      puestos: puestosData.total,
    });
  } catch (err) {
    console.error("Error cargando stats:", err);
  }
}

function renderCharts(data) {
  // 📊 Barras
  new Chart(document.getElementById("statsChart"), {
    type: "bar",
    data: {
      labels: ["Sedes", "Áreas", "Puestos", "Equipos"],
      datasets: [{
        label: "Cantidad",
        data: [data.sedes, data.oficinas, data.puestos, data.equipos],
        backgroundColor: ["#3B82F6", "#639A33", "#9333EA", "#F97316"],
      }],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });

  // 🍩 Circular
  new Chart(document.getElementById("pieChart"), {
    type: "doughnut",
    data: {
      labels: ["Sedes", "Áreas", "Puestos", "Equipos"],
      datasets: [{
        data: [data.sedes, data.oficinas, data.puestos, data.equipos],
        backgroundColor: ["#3B82F6", "#639A33", "#9333EA", "#F97316"],
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
    },
  });

  // 📈 Línea (ejemplo, luego la conectamos a API real)
  new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: {
      labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
      datasets: [{
        label: "Equipos registrados",
        data: [5, 10, 7, 12, 20, 25],
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59,130,246,0.2)",
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#3B82F6",
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
    },
  });

  // 🕸 Radar (ahora sí usando los datos reales)
  new Chart(document.getElementById("radarChart"), {
    type: "radar",
    data: {
      labels: ["Sedes", "Áreas", "Puestos", "Equipos"],
      datasets: [{
        label: "Inventario",
        data: [data.sedes, data.oficinas, data.puestos, data.equipos],
        backgroundColor: "rgba(99,154,51,0.2)",
        borderColor: "#639A33",
        pointBackgroundColor: "#639A33",
      }],
    },
    options: {
      responsive: true,
      scales: { r: { beginAtZero: true } },
    },
  });
}



// 🚀 Ejecutar
cargarStats();
