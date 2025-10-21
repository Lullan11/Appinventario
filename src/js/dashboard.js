const API_URL = "https://inventario-api-gw73.onrender.com";

// Variables globales para almacenar datos
let dashboardData = {
    equipos: { total: 0, activos: 0, inactivos: 0 },
    sedes: 0,
    areas: 0,
    puestos: 0,
    mantenimientos: { 
        vencidos: 0, 
        proximos: 0, 
        alDia: 0, 
        sinConfiguracion: 0,
        total: 0,
        preventivos: 0,
        calibraciones: 0,
        correctivos: 0,
        proximosMantenimiento: 0,
        proximosCalibracion: 0,
        vencidosPreventivos: 0,    // ✅ NUEVO
        vencidosCalibraciones: 0   // ✅ NUEVO
    }
};

// Elementos del DOM
let domElements = {
    // Tarjetas principales
    totalEquipos: null,
    totalOficinas: null,
    totalSedes: null,
    totalPuestos: null,
    
    // Tarjetas de mantenimientos
    totalVencidos: null,
    totalProximos: null,
    totalAlDia: null,
    totalSinConfiguracion: null,
    
    // Tarjetas adicionales
    totalInactivos: null,
    totalEquiposGeneral: null,
    
    // Tarjetas de tipos de mantenimiento
    totalMantenimientos: null,
    totalPreventivos: null,
    totalCalibraciones: null,
    totalCorrectivos: null,
    
    // Tarjetas de próximos
    proximosMantenimiento: null,
    proximosCalibracion: null,
    
    // ✅ NUEVAS tarjetas para vencidos específicos
    vencidosPreventivos: null,
    vencidosCalibraciones: null
};

async function cargarStats() {
    try {
        console.log("📊 Cargando estadísticas del dashboard...");
        
        // Inicializar elementos del DOM
        inicializarElementosDOM();
        
        // Cargar todos los datos necesarios
        const [equiposRes, equiposInactivosRes, sedesRes, areasRes, puestosRes, tiposMantenimientoRes] = await Promise.all([
            fetch(`${API_URL}/equipos`),
            fetch(`${API_URL}/equipos/inactivos`),
            fetch(`${API_URL}/sedes`),
            fetch(`${API_URL}/areas`),
            fetch(`${API_URL}/puestos`),
            fetch(`${API_URL}/tipos-mantenimiento`)
        ]);

        // Verificar respuestas
        if (!equiposRes.ok) throw new Error("Error al cargar equipos activos");
        if (!sedesRes.ok) throw new Error("Error al cargar sedes");
        if (!areasRes.ok) throw new Error("Error al cargar áreas");
        if (!puestosRes.ok) throw new Error("Error al cargar puestos");

        // Procesar datos básicos
        const equiposActivosData = await equiposRes.json();
        const sedesData = await sedesRes.json();
        const areasData = await areasRes.json();
        const puestosData = await puestosRes.json();
        const tiposMantenimientoData = tiposMantenimientoRes.ok ? await tiposMantenimientoRes.json() : [];
        
        // Procesar equipos inactivos (si la respuesta es exitosa)
        let equiposInactivosData = [];
        if (equiposInactivosRes.ok) {
            equiposInactivosData = await equiposInactivosRes.json();
        }

        // Calcular estadísticas de equipos
        const totalEquipos = equiposActivosData.length + equiposInactivosData.length;

        console.log(`🔢 Datos básicos - Equipos activos: ${equiposActivosData.length}, Inactivos: ${equiposInactivosData.length}, Sedes: ${sedesData.length}, Áreas: ${areasData.length}, Puestos: ${puestosData.length}`);

        // Calcular mantenimientos para TODOS los equipos activos
        const mantenimientosData = await calcularMantenimientosManualmente(equiposActivosData, tiposMantenimientoData);

        // Actualizar datos globales
        dashboardData = {
            equipos: {
                total: totalEquipos,
                activos: equiposActivosData.length,
                inactivos: equiposInactivosData.length
            },
            sedes: sedesData.length || 0,
            areas: areasData.length || 0,
            puestos: puestosData.length || 0,
            mantenimientos: mantenimientosData
        };

        // Actualizar la interfaz
        actualizarInterfaz();
        
        console.log("✅ Dashboard cargado exitosamente:", dashboardData);

    } catch (err) {
        console.error("❌ Error cargando stats:", err);
        mostrarErrorDashboard(err.message);
    }
}

// Función para inicializar elementos del DOM de forma segura
function inicializarElementosDOM() {
    // Elementos principales (siempre deberían existir)
    domElements.totalEquipos = document.getElementById("total-equipos");
    domElements.totalOficinas = document.getElementById("total-oficinas");
    domElements.totalSedes = document.getElementById("total-sedes");
    domElements.totalPuestos = document.getElementById("total-puestos");
    
    // Crear secciones adicionales
    crearSeccionMantenimientos();
    crearSeccionAdicional();
    crearSeccionTiposMantenimiento();
    crearSeccionProximos();
    crearSeccionVencidosEspecificos(); // ✅ NUEVA sección
    
    // Inicializar elementos de mantenimientos
    domElements.totalVencidos = document.getElementById("total-vencidos");
    domElements.totalProximos = document.getElementById("total-proximos");
    domElements.totalAlDia = document.getElementById("total-al-dia");
    domElements.totalSinConfiguracion = document.getElementById("total-sin-configuracion");
    
    // Inicializar elementos adicionales
    domElements.totalInactivos = document.getElementById("total-inactivos");
    domElements.totalEquiposGeneral = document.getElementById("total-equipos-general");
    
    // Inicializar elementos de tipos de mantenimiento
    domElements.totalMantenimientos = document.getElementById("total-mantenimientos");
    domElements.totalPreventivos = document.getElementById("total-preventivos");
    domElements.totalCalibraciones = document.getElementById("total-calibraciones");
    domElements.totalCorrectivos = document.getElementById("total-correctivos");
    
    // Inicializar elementos de próximos
    domElements.proximosMantenimiento = document.getElementById("proximos-mantenimiento");
    domElements.proximosCalibracion = document.getElementById("proximos-calibracion");
    
    // ✅ Inicializar elementos de vencidos específicos
    domElements.vencidosPreventivos = document.getElementById("vencidos-preventivos");
    domElements.vencidosCalibraciones = document.getElementById("vencidos-calibraciones");
}

// Función para crear la sección de mantenimientos
function crearSeccionMantenimientos() {
    let mantenimientosSection = document.getElementById('mantenimientos-section');
    
    if (!mantenimientosSection) {
        mantenimientosSection = document.createElement('section');
        mantenimientosSection.id = 'mantenimientos-section';
        mantenimientosSection.className = 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-8';
        mantenimientosSection.innerHTML = `
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-red-500 cursor-pointer" onclick="navigateToMantenimientos('vencidos')">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-red-100 p-2 rounded-md">
                        <i class="fas fa-exclamation-triangle text-red-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Mantenimientos Vencidos</h3>
                <p id="total-vencidos" class="text-3xl font-bold text-red-500">0</p>
                <p class="text-sm text-gray-600 mt-1">Equipos con mantenimiento atrasado</p>
            </div>
            
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-yellow-500 cursor-pointer" onclick="navigateToMantenimientos('proximos')">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-yellow-100 p-2 rounded-md">
                        <i class="fas fa-clock text-yellow-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Mantenimientos Próximos</h3>
                <p id="total-proximos" class="text-3xl font-bold text-yellow-500">0</p>
                <p class="text-sm text-gray-600 mt-1">Próximos 10 días</p>
            </div>
            
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-green-500 cursor-pointer" onclick="navigateToMantenimientos('al-dia')">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-green-100 p-2 rounded-md">
                        <i class="fas fa-check-circle text-green-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Equipos al Día</h3>
                <p id="total-al-dia" class="text-3xl font-bold text-green-500">0</p>
                <p class="text-sm text-gray-600 mt-1">Mantenimiento al corriente</p>
            </div>
            
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-blue-500 cursor-pointer" onclick="navigateToMantenimientos('sin-configuracion')">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-blue-100 p-2 rounded-md">
                        <i class="fas fa-cog text-blue-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Sin Configuración</h3>
                <p id="total-sin-configuracion" class="text-3xl font-bold text-blue-500">0</p>
                <p class="text-sm text-gray-600 mt-1">Sin mantenimientos programados</p>
            </div>
        `;
        
        // Insertar después de las tarjetas principales
        const mainSection = document.querySelector('section.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
        if (mainSection && mainSection.parentNode) {
            mainSection.parentNode.insertBefore(mantenimientosSection, mainSection.nextSibling);
        }
    }
}

// Función para crear sección adicional con equipos inactivos y totales
function crearSeccionAdicional() {
    let adicionalSection = document.getElementById('adicional-section');
    
    if (!adicionalSection) {
        adicionalSection = document.createElement('section');
        adicionalSection.id = 'adicional-section';
        adicionalSection.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-8';
        adicionalSection.innerHTML = `
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-gray-500 cursor-pointer" onclick="window.location.href='inactivos.html'">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-gray-100 p-2 rounded-md">
                        <i class="fas fa-ban text-gray-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Equipos Inactivos</h3>
                <p id="total-inactivos" class="text-3xl font-bold text-gray-600">0</p>
                <p class="text-sm text-gray-600 mt-1">Equipos dados de baja</p>
            </div>
            
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-indigo-500 cursor-pointer" onclick="window.location.href='equipos.html'">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-indigo-100 p-2 rounded-md">
                        <i class="fas fa-laptop text-indigo-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Total Equipos</h3>
                <p id="total-equipos-general" class="text-3xl font-bold text-indigo-500">0</p>
                <p class="text-sm text-gray-600 mt-1">Activos + Inactivos</p>
            </div>
        `;
        
        // Insertar después de la sección de mantenimientos
        const mantenimientosSection = document.getElementById('mantenimientos-section');
        if (mantenimientosSection && mantenimientosSection.parentNode) {
            mantenimientosSection.parentNode.insertBefore(adicionalSection, mantenimientosSection.nextSibling);
        }
    }
}

// Función para crear sección de tipos de mantenimiento
function crearSeccionTiposMantenimiento() {
    let tiposMantenimientoSection = document.getElementById('tipos-mantenimiento-section');
    
    if (!tiposMantenimientoSection) {
        tiposMantenimientoSection = document.createElement('section');
        tiposMantenimientoSection.id = 'tipos-mantenimiento-section';
        tiposMantenimientoSection.className = 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-8';
        tiposMantenimientoSection.innerHTML = `
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-purple-500 cursor-pointer" onclick="navigateToMantenimientos('todos')">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-purple-100 p-2 rounded-md">
                        <i class="fas fa-tools text-purple-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Total Mantenimientos</h3>
                <p id="total-mantenimientos" class="text-3xl font-bold text-purple-500">0</p>
                <p class="text-sm text-gray-600 mt-1">Todos los mantenimientos activos</p>
            </div>
            
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-teal-500 cursor-pointer" onclick="navigateToMantenimientos('preventivo')">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-teal-100 p-2 rounded-md">
                        <i class="fas fa-shield-alt text-teal-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Mantenimientos Preventivos</h3>
                <p id="total-preventivos" class="text-3xl font-bold text-teal-500">0</p>
                <p class="text-sm text-gray-600 mt-1">Mantenimientos programados</p>
            </div>
            
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-pink-500 cursor-pointer" onclick="navigateToMantenimientos('calibracion')">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-pink-100 p-2 rounded-md">
                        <i class="fas fa-ruler-combined text-pink-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Calibraciones</h3>
                <p id="total-calibraciones" class="text-3xl font-bold text-pink-500">0</p>
                <p class="text-sm text-gray-600 mt-1">Calibraciones programadas</p>
            </div>
            
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-orange-500 cursor-pointer" onclick="navigateToMantenimientos('correctivo')">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-orange-100 p-2 rounded-md">
                        <i class="fas fa-wrench text-orange-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Mantenimientos Correctivos</h3>
                <p id="total-correctivos" class="text-3xl font-bold text-orange-500">0</p>
                <p class="text-sm text-gray-600 mt-1">Reparaciones y ajustes</p>
            </div>
        `;
        
        // Insertar después de la sección adicional
        const adicionalSection = document.getElementById('adicional-section');
        if (adicionalSection && adicionalSection.parentNode) {
            adicionalSection.parentNode.insertBefore(tiposMantenimientoSection, adicionalSection.nextSibling);
        }
    }
}

// Función para crear sección de próximos mantenimientos y calibraciones
function crearSeccionProximos() {
    let proximosSection = document.getElementById('proximos-section');
    
    if (!proximosSection) {
        proximosSection = document.createElement('section');
        proximosSection.id = 'proximos-section';
        proximosSection.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-8';
        proximosSection.innerHTML = `
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-cyan-500 cursor-pointer" onclick="navigateToMantenimientos('proximos-mantenimiento')">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-cyan-100 p-2 rounded-md">
                        <i class="fas fa-tools text-cyan-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Próximos Mantenimientos</h3>
                <p id="proximos-mantenimiento" class="text-3xl font-bold text-cyan-500">0</p>
                <p class="text-sm text-gray-600 mt-1">Equipos con mantenimiento próximo</p>
            </div>
            
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-rose-500 cursor-pointer" onclick="navigateToMantenimientos('proximos-calibracion')">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-rose-100 p-2 rounded-md">
                        <i class="fas fa-ruler-combined text-rose-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Próximas Calibraciones</h3>
                <p id="proximos-calibracion" class="text-3xl font-bold text-rose-500">0</p>
                <p class="text-sm text-gray-600 mt-1">Equipos con calibración próxima</p>
            </div>
        `;
        
        // Insertar después de la sección de tipos de mantenimiento
        const tiposMantenimientoSection = document.getElementById('tipos-mantenimiento-section');
        if (tiposMantenimientoSection && tiposMantenimientoSection.parentNode) {
            tiposMantenimientoSection.parentNode.insertBefore(proximosSection, tiposMantenimientoSection.nextSibling);
        }
    }
}

// ✅ NUEVA función para crear sección de vencidos específicos
function crearSeccionVencidosEspecificos() {
    let vencidosSection = document.getElementById('vencidos-especificos-section');
    
    if (!vencidosSection) {
        vencidosSection = document.createElement('section');
        vencidosSection.id = 'vencidos-especificos-section';
        vencidosSection.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-8';
        vencidosSection.innerHTML = `
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-red-600 cursor-pointer" onclick="navigateToMantenimientos('vencidos-preventivos')">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-red-100 p-2 rounded-md">
                        <i class="fas fa-shield-alt text-red-600 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Preventivos Vencidos</h3>
                <p id="vencidos-preventivos" class="text-3xl font-bold text-red-600">0</p>
                <p class="text-sm text-gray-600 mt-1">Mantenimientos preventivos atrasados</p>
            </div>
            
            <div class="stat-card bg-white rounded-lg p-4 shadow border border-red-700 cursor-pointer" onclick="navigateToMantenimientos('vencidos-calibraciones')">
                <div class="flex items-center justify-between mb-3">
                    <div class="bg-red-100 p-2 rounded-md">
                        <i class="fas fa-ruler-combined text-red-700 text-lg"></i>
                    </div>
                    <i class="fas fa-external-link-alt text-gray-400"></i>
                </div>
                <h3 class="text-base font-semibold text-[#0F172A] mb-2">Calibraciones Vencidas</h3>
                <p id="vencidos-calibraciones" class="text-3xl font-bold text-red-700">0</p>
                <p class="text-sm text-gray-600 mt-1">Calibraciones atrasadas</p>
            </div>
        `;
        
        // Insertar después de la sección de próximos
        const proximosSection = document.getElementById('proximos-section');
        if (proximosSection && proximosSection.parentNode) {
            proximosSection.parentNode.insertBefore(vencidosSection, proximosSection.nextSibling);
        }
    }
}

// Función para calcular mantenimientos manualmente (ACTUALIZADA con vencidos específicos)
// Función para calcular mantenimientos manualmente (ACTUALIZADA para contar correctivos realizados)
async function calcularMantenimientosManualmente(equiposData, tiposMantenimientoData) {
    try {
        let vencidos = 0;
        let proximos = 0;
        let alDia = 0;
        let sinConfiguracion = 0;
        let totalMantenimientos = 0;
        let preventivos = 0;
        let calibraciones = 0;
        let correctivos = 0;
        let proximosMantenimiento = 0;
        let proximosCalibracion = 0;
        let vencidosPreventivos = 0;
        let vencidosCalibraciones = 0;

        const hoy = new Date();
        
        // Identificar IDs de tipos de mantenimiento
        const tipoPreventivo = tiposMantenimientoData.find(t => t.nombre.toLowerCase().includes('preventivo'));
        const tipoCalibracion = tiposMantenimientoData.find(t => t.nombre.toLowerCase().includes('calibración') || t.nombre.toLowerCase().includes('calibracion'));
        const tipoCorrectivo = tiposMantenimientoData.find(t => t.nombre.toLowerCase().includes('correctivo'));

        // ✅ NUEVO: Contar correctivos realizados de todos los equipos
        let totalCorrectivosRealizados = 0;
        try {
            const mantenimientosRealizadosRes = await fetch(`${API_URL}/mantenimientos/todos`);
            if (mantenimientosRealizadosRes.ok) {
                const todosMantenimientos = await mantenimientosRealizadosRes.json();
                
                // Filtrar solo los correctivos realizados
                const correctivosRealizados = todosMantenimientos.filter(mant => {
                    const tipoMantenimiento = tiposMantenimientoData.find(t => t.id === mant.id_tipo);
                    return tipoMantenimiento?.nombre?.toLowerCase().includes('correctivo');
                });
                
                totalCorrectivosRealizados = correctivosRealizados.length;
                console.log("✅ Correctivos realizados encontrados:", totalCorrectivosRealizados);
            }
        } catch (error) {
            console.warn("⚠️ No se pudieron cargar los correctivos realizados:", error);
        }
        
        // Procesar TODOS los equipos activos para mantenimientos programados
        for (const equipo of equiposData) {
            try {
                // Obtener datos completos del equipo para ver mantenimientos
                const equipoCompletoRes = await fetch(`${API_URL}/equipos/${equipo.id}/completo`);
                if (equipoCompletoRes.ok) {
                    const equipoCompleto = await equipoCompletoRes.json();
                    
                    if (!equipoCompleto.mantenimientos_configurados || 
                        equipoCompleto.mantenimientos_configurados.length === 0) {
                        sinConfiguracion++;
                        continue;
                    }

                    // Determinar el estado más crítico del equipo
                    let estadoEquipo = "OK";
                    let tieneMantenimientos = false;
                    let equipoProximoMantenimiento = false;
                    let equipoProximoCalibracion = false;
                    let equipoVencidoPreventivo = false;
                    let equipoVencidoCalibracion = false;
                    
                    equipoCompleto.mantenimientos_configurados.forEach(mant => {
                        if (mant.proxima_fecha && mant.activo !== false) {
                            tieneMantenimientos = true;
                            totalMantenimientos++;
                            
                            // Contar por tipo de mantenimiento (solo programados)
                            if (tipoPreventivo && mant.id_tipo_mantenimiento === tipoPreventivo.id) {
                                preventivos++;
                            } else if (tipoCalibracion && mant.id_tipo_mantenimiento === tipoCalibracion.id) {
                                calibraciones++;
                            }
                            // NOTA: Los correctivos no se cuentan aquí porque no son programados
                            
                            const proxima = new Date(mant.proxima_fecha);
                            const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
                            
                            // Verificar si está próximo (10 días)
                            if (diffDias <= 10 && diffDias > 0) {
                                if (tipoPreventivo && mant.id_tipo_mantenimiento === tipoPreventivo.id) {
                                    equipoProximoMantenimiento = true;
                                } else if (tipoCalibracion && mant.id_tipo_mantenimiento === tipoCalibracion.id) {
                                    equipoProximoCalibracion = true;
                                }
                            }
                            
                            // Verificar vencidos específicos
                            if (diffDias <= 0) {
                                if (tipoPreventivo && mant.id_tipo_mantenimiento === tipoPreventivo.id) {
                                    equipoVencidoPreventivo = true;
                                } else if (tipoCalibracion && mant.id_tipo_mantenimiento === tipoCalibracion.id) {
                                    equipoVencidoCalibracion = true;
                                }
                            }
                            
                            if (diffDias <= 0 && estadoEquipo !== "VENCIDO") {
                                estadoEquipo = "VENCIDO";
                            } else if (diffDias <= 10 && estadoEquipo === "OK") {
                                estadoEquipo = "PRÓXIMO";
                            }
                        }
                    });

                    // Si no tiene mantenimientos activos, contar como sin configuración
                    if (!tieneMantenimientos) {
                        sinConfiguracion++;
                        continue;
                    }

                    // Contar equipos próximos por tipo
                    if (equipoProximoMantenimiento) proximosMantenimiento++;
                    if (equipoProximoCalibracion) proximosCalibracion++;

                    // Contar equipos vencidos por tipo
                    if (equipoVencidoPreventivo) vencidosPreventivos++;
                    if (equipoVencidoCalibracion) vencidosCalibraciones++;

                    // Contar según el estado
                    switch(estadoEquipo) {
                        case "VENCIDO":
                            vencidos++;
                            break;
                        case "PRÓXIMO":
                            proximos++;
                            break;
                        case "OK":
                            alDia++;
                            break;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ No se pudieron cargar mantenimientos del equipo ${equipo.id}:`, error);
                sinConfiguracion++;
            }
        }

        // ✅ CORREGIDO: Usar los correctivos realizados en lugar de los programados
        correctivos = totalCorrectivosRealizados;

        return { 
            vencidos, 
            proximos, 
            alDia, 
            sinConfiguracion,
            total: totalMantenimientos + totalCorrectivosRealizados, // Incluir correctivos en el total
            preventivos,
            calibraciones,
            correctivos, // ✅ Ahora muestra los correctivos realizados
            proximosMantenimiento,
            proximosCalibracion,
            vencidosPreventivos,
            vencidosCalibraciones
        };
        
    } catch (error) {
        console.error("❌ Error calculando mantenimientos:", error);
        return { 
            vencidos: 0, 
            proximos: 0, 
            alDia: 0, 
            sinConfiguracion: 0,
            total: 0,
            preventivos: 0,
            calibraciones: 0,
            correctivos: 0,
            proximosMantenimiento: 0,
            proximosCalibracion: 0,
            vencidosPreventivos: 0,
            vencidosCalibraciones: 0
        };
    }
}

function actualizarInterfaz() {
    // Actualizar tarjetas principales (con verificación de existencia)
    if (domElements.totalEquipos) {
        domElements.totalEquipos.textContent = dashboardData.equipos.activos;
    }
    if (domElements.totalOficinas) {
        domElements.totalOficinas.textContent = dashboardData.areas;
    }
    if (domElements.totalSedes) {
        domElements.totalSedes.textContent = dashboardData.sedes;
    }
    if (domElements.totalPuestos) {
        domElements.totalPuestos.textContent = dashboardData.puestos;
    }

    // Actualizar tarjetas de mantenimientos (ESTADOS DE EQUIPOS)
    if (domElements.totalVencidos) {
        domElements.totalVencidos.textContent = dashboardData.mantenimientos.vencidos || 0;
    }
    if (domElements.totalProximos) {
        domElements.totalProximos.textContent = dashboardData.mantenimientos.proximos || 0;
    }
    if (domElements.totalAlDia) {
        domElements.totalAlDia.textContent = dashboardData.mantenimientos.alDia || 0;
    }
    if (domElements.totalSinConfiguracion) {
        domElements.totalSinConfiguracion.textContent = dashboardData.mantenimientos.sinConfiguracion || 0;
    }

    // Actualizar tarjetas adicionales
    if (domElements.totalInactivos) {
        domElements.totalInactivos.textContent = dashboardData.equipos.inactivos || 0;
    }
    if (domElements.totalEquiposGeneral) {
        domElements.totalEquiposGeneral.textContent = dashboardData.equipos.total || 0;
    }

    // Actualizar tarjetas de tipos de mantenimiento (TOTALES COMBINADOS)
    if (domElements.totalMantenimientos) {
        domElements.totalMantenimientos.textContent = dashboardData.mantenimientos.total || 0;
    }
    if (domElements.totalPreventivos) {
        domElements.totalPreventivos.textContent = dashboardData.mantenimientos.preventivos || 0;
    }
    if (domElements.totalCalibraciones) {
        domElements.totalCalibraciones.textContent = dashboardData.mantenimientos.calibraciones || 0;
    }
    if (domElements.totalCorrectivos) {
        domElements.totalCorrectivos.textContent = dashboardData.mantenimientos.correctivos || 0;
        console.log("🛠️ Correctivos mostrados:", dashboardData.mantenimientos.correctivos);
    }
    
    // Actualizar tarjetas de próximos (POR EQUIPO)
    if (domElements.proximosMantenimiento) {
        domElements.proximosMantenimiento.textContent = dashboardData.mantenimientos.proximosMantenimiento || 0;
    }
    if (domElements.proximosCalibracion) {
        domElements.proximosCalibracion.textContent = dashboardData.mantenimientos.proximosCalibracion || 0;
    }
    
    // Actualizar tarjetas de vencidos específicos (POR EQUIPO)
    if (domElements.vencidosPreventivos) {
        domElements.vencidosPreventivos.textContent = dashboardData.mantenimientos.vencidosPreventivos || 0;
    }
    if (domElements.vencidosCalibraciones) {
        domElements.vencidosCalibraciones.textContent = dashboardData.mantenimientos.vencidosCalibraciones || 0;
    }
    
    // Renderizar gráficas con datos actualizados
    renderCharts();
}

function renderCharts() {
    // Destruir gráficas existentes si hay
    destruirGraficasExistentes();

    // Verificar que los canvas existen antes de crear gráficas
    const statsChartCanvas = document.getElementById("statsChart");
    const pieChartCanvas = document.getElementById("pieChart");
    const lineChartCanvas = document.getElementById("lineChart");
    const radarChartCanvas = document.getElementById("radarChart");

    if (!statsChartCanvas || !pieChartCanvas || !lineChartCanvas || !radarChartCanvas) {
        console.warn("⚠️ No se encontraron todos los elementos canvas para las gráficas");
        return;
    }

    try {
        // 📊 Gráfica de Barras - Distribución General (ACTUALIZADA)
        new Chart(statsChartCanvas, {
            type: "bar",
            data: {
                labels: ["Sedes", "Áreas", "Puestos", "Equipos Activos", "Equipos Inactivos"],
                datasets: [{
                    label: "Cantidad",
                    data: [
                        dashboardData.sedes, 
                        dashboardData.areas, 
                        dashboardData.puestos, 
                        dashboardData.equipos.activos,
                        dashboardData.equipos.inactivos
                    ],
                    backgroundColor: ["#3B82F6", "#639A33", "#9333EA", "#10B981", "#6B7280"],
                    borderColor: ["#1D4ED8", "#4B7B2D", "#7E22CE", "#059669", "#4B5563"],
                    borderWidth: 2
                }],
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: true,
                plugins: { 
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Distribución General del Inventario',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            },
        });

        // 🍩 Gráfica Circular - Tipos de Mantenimiento (ACTUALIZADA)
        new Chart(pieChartCanvas, {
            type: "doughnut",
            data: {
                labels: [
                    "Mantenimientos Preventivos", 
                    "Calibraciones",
                    "Mantenimientos Correctivos",
                    "Otros Mantenimientos"
                ],
                datasets: [{
                    data: [
                        dashboardData.mantenimientos.preventivos || 0, 
                        dashboardData.mantenimientos.calibraciones || 0,
                        dashboardData.mantenimientos.correctivos || 0,
                        (dashboardData.mantenimientos.total || 0) - 
                        ((dashboardData.mantenimientos.preventivos || 0) + 
                         (dashboardData.mantenimientos.calibraciones || 0) +
                         (dashboardData.mantenimientos.correctivos || 0))
                    ],
                    backgroundColor: ["#0D9488", "#DB2777", "#EA580C", "#6366F1"],
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverOffset: 15
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { 
                    legend: { 
                        position: "bottom",
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    title: {
                        display: true,
                        text: 'Distribución de Tipos de Mantenimiento',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                cutout: '50%'
            },
        });

        // 📈 Gráfica de Línea - Estado de Mantenimientos (ACTUALIZADA con vencidos específicos)
        new Chart(lineChartCanvas, {
            type: "line",
            data: {
                labels: ["Vencidos", "Próximos", "Al Día", "Sin Configuración", "Prev. Vencidos", "Calib. Vencidas"],
                datasets: [{
                    label: "Cantidad de Equipos",
                    data: [
                        dashboardData.mantenimientos.vencidos || 0,
                        dashboardData.mantenimientos.proximos || 0, 
                        dashboardData.mantenimientos.alDia || 0,
                        dashboardData.mantenimientos.sinConfiguracion || 0,
                        dashboardData.mantenimientos.vencidosPreventivos || 0,  // ✅ NUEVO
                        dashboardData.mantenimientos.vencidosCalibraciones || 0  // ✅ NUEVO
                    ],
                    borderColor: "#639A33",
                    backgroundColor: "rgba(99,154,51,0.1)",
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: "#639A33",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { 
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Estado de Mantenimientos por Equipo',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cantidad de Equipos'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Estado de Mantenimiento'
                        }
                    }
                }
            },
        });

        // 🕸 Gráfica Radar - Comparación Relativa (ACTUALIZADA)
        new Chart(radarChartCanvas, {
            type: "radar",
            data: {
                labels: [
                    "Sedes", 
                    "Áreas", 
                    "Puestos", 
                    "Equipos Activos", 
                    "Mantenimientos Totales",
                    "Preventivos",
                    "Calibraciones",
                    "Correctivos",
                    "Prev. Vencidos",      // ✅ NUEVO
                    "Calib. Vencidas"      // ✅ NUEVO
                ],
                datasets: [{
                    label: "Inventario General",
                    data: [
                        dashboardData.sedes, 
                        dashboardData.areas, 
                        dashboardData.puestos, 
                        dashboardData.equipos.activos,
                        dashboardData.mantenimientos.total || 0,
                        dashboardData.mantenimientos.preventivos || 0,
                        dashboardData.mantenimientos.calibraciones || 0,
                        dashboardData.mantenimientos.correctivos || 0,
                        dashboardData.mantenimientos.vencidosPreventivos || 0,    // ✅ NUEVO
                        dashboardData.mantenimientos.vencidosCalibraciones || 0   // ✅ NUEVO
                    ],
                    backgroundColor: "rgba(99,154,51,0.2)",
                    borderColor: "#639A33",
                    pointBackgroundColor: "#639A33",
                    pointBorderColor: "#fff",
                    pointHoverBackgroundColor: "#fff",
                    pointHoverBorderColor: "#639A33",
                    pointRadius: 4
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: { 
                    r: { 
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        pointLabels: {
                            font: {
                                size: 11
                            }
                        }
                    } 
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Comparación Relativa del Sistema Completo',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        labels: {
                            usePointStyle: true
                        }
                    }
                }
            },
        });

        console.log("✅ Gráficas renderizadas correctamente");
    } catch (error) {
        console.error("❌ Error renderizando gráficas:", error);
    }
}

function destruirGraficasExistentes() {
    // Destruir gráficas existentes para evitar duplicados
    try {
        const charts = Chart.instances;
        Object.keys(charts).forEach(key => {
            charts[key].destroy();
        });
    } catch (error) {
        console.warn("⚠️ Error destruyendo gráficas existentes:", error);
    }
}

function navigateToMantenimientos(tipo) {
    let url = 'equipos.html';
    
    // Agregar parámetros según el tipo de mantenimiento
    switch(tipo) {
        case 'vencidos':
            url += '?estado=VENCIDO';
            break;
        case 'proximos':
            url += '?estado=PRÓXIMO';
            break;
        case 'al-dia':
            url += '?estado=OK';
            break;
        case 'sin-configuracion':
            url += '?estado=SIN_DATOS';
            break;
        case 'todos':
            url += '?tipo=todos';
            break;
        case 'preventivo':
            url += '?tipo=preventivo';
            break;
        case 'calibracion':
            url += '?tipo=calibracion';
            break;
        case 'correctivo':
            url += '?tipo=correctivo';
            break;
        case 'proximos-mantenimiento':
            url += '?proximo=mantenimiento';
            break;
        case 'proximos-calibracion':
            url += '?proximo=calibracion';
            break;
        case 'vencidos-preventivos':          // ✅ NUEVO
            url += '?vencido=preventivo';
            break;
        case 'vencidos-calibraciones':        // ✅ NUEVO
            url += '?vencido=calibracion';
            break;
    }
    
    window.location.href = url;
}

function mostrarErrorDashboard(mensaje) {
    // Mostrar mensaje de error en la interfaz
    const errorHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div class="flex items-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-xl mr-3"></i>
                <div>
                    <h3 class="text-red-800 font-semibold">Error al cargar el dashboard</h3>
                    <p class="text-red-600 text-sm">${mensaje || 'No se pudieron cargar los datos. Verifica tu conexión e intenta nuevamente.'}</p>
                </div>
            </div>
            <button onclick="cargarStats()" class="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm">
                <i class="fas fa-redo mr-2"></i>Reintentar
            </button>
        </div>
    `;
    
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    const firstChild = mainContent.querySelector('div > :first-child');
    if (!firstChild) return;
    
    // Remover error anterior si existe
    const errorAnterior = firstChild.querySelector('.bg-red-50');
    if (errorAnterior) {
        errorAnterior.remove();
    }
    
    firstChild.insertAdjacentHTML('afterbegin', errorHTML);
}

// 🚀 Ejecutar cuando la página cargue
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Inicializando dashboard...");
    cargarStats();
    
    // Actualizar cada 5 minutos
    setInterval(cargarStats, 300000);
});

// Hacer funciones disponibles globalmente
window.navigateToMantenimientos = navigateToMantenimientos;
window.cargarStats = cargarStats;