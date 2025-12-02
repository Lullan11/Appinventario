// src/js/dashboard.js - VERSIÓN COMPLETA CON PERSISTENCIA EN MEMORIA

const API_URL = "https://inventario-api-gw73.onrender.com";

// ✅ VARIABLE GLOBAL PARA PERSISTENCIA EN MEMORIA
window.DASHBOARD_CACHE = window.DASHBOARD_CACHE || {
    datos: null,
    timestamp: null,
    ttl: 5 * 60 * 1000, // 5 minutos
    ultimaCarga: null
};

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
        vencidosPreventivos: 0,
        vencidosCalibraciones: 0
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

    // Tarjetas para vencidos específicos
    vencidosPreventivos: null,
    vencidosCalibraciones: null
};

// ✅ Variable para controlar si ya mostramos skeleton
let skeletonMostrado = false;

async function cargarStats() {
    try {
        console.log("📊 Cargando estadísticas del dashboard...");

        // ✅ 1. PRIMERO: Verificar si ya hay datos en memoria
        const ahora = Date.now();
        
        // Opción A: Hay datos en memoria válidos
        if (window.DASHBOARD_CACHE.datos && 
            window.DASHBOARD_CACHE.timestamp && 
            (ahora - window.DASHBOARD_CACHE.timestamp) < window.DASHBOARD_CACHE.ttl) {
            
            console.log("✅ Usando datos en memoria (persistencia)");
            dashboardData = window.DASHBOARD_CACHE.datos;
            
            // Inicializar DOM si es necesario
            if (!domElements.totalEquipos) {
                inicializarElementosDOM();
            }
            
            // Actualizar interfaz inmediatamente
            actualizarInterfaz();
            
            // Mostrar notificación de carga rápida
            mostrarToastCargaRapida();
            
            // Actualizar en segundo plano
            actualizarDatosEnSegundoPlano();
            return;
        }
        
        // Opción B: Datos en memoria pero expirados
        if (window.DASHBOARD_CACHE.datos) {
            console.log("ℹ️ Datos en memoria expirados, mostrando mientras se actualizan...");
            dashboardData = window.DASHBOARD_CACHE.datos;
            
            // Inicializar DOM si es necesario
            if (!domElements.totalEquipos) {
                inicializarElementosDOM();
            }
            
            // Actualizar interfaz con datos expirados
            actualizarInterfaz();
            
            // Mostrar mensaje de actualización
            mostrarMensajeActualizacion();
        }

        // ✅ 2. MOSTRAR SKELETON (solo si no hay datos en memoria)
        if (!window.DASHBOARD_CACHE.datos && !skeletonMostrado) {
            mostrarSkeletonCards(true);
            skeletonMostrado = true;
        }

        // ✅ 3. Cargar datos frescos
        let loadingTimeout = setTimeout(() => {
            mostrarLoadingDashboard(true);
        }, 800);

        try {
            // Inicializar elementos del DOM
            inicializarElementosDOM();

            // Cargar datos en paralelo
            console.time("CargaDatosDashboard");
            const [equiposRes, equiposInactivosRes, sedesRes, areasRes, puestosRes, tiposMantenimientoRes, mantenimientosRealizadosRes] = await Promise.all([
                fetch(`${API_URL}/equipos`),
                fetch(`${API_URL}/equipos/inactivos`),
                fetch(`${API_URL}/sedes`),
                fetch(`${API_URL}/areas`),
                fetch(`${API_URL}/puestos`),
                fetch(`${API_URL}/tipos-mantenimiento`),
                fetch(`${API_URL}/mantenimientos`)
            ]);
            console.timeEnd("CargaDatosDashboard");

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

            // Cargar mantenimientos realizados
            let todosLosMantenimientosRealizados = [];
            if (mantenimientosRealizadosRes.ok) {
                try {
                    todosLosMantenimientosRealizados = await mantenimientosRealizadosRes.json();
                } catch (parseError) {
                    console.warn("⚠️ Error parseando mantenimientos realizados");
                    todosLosMantenimientosRealizados = [];
                }
            }

            // Procesar equipos inactivos
            let equiposInactivosData = [];
            if (equiposInactivosRes.ok) {
                equiposInactivosData = await equiposInactivosRes.json();
            }

            // Calcular estadísticas de equipos
            const totalEquipos = equiposActivosData.length + equiposInactivosData.length;

            // Calcular mantenimientos
            const mantenimientosData = await calcularMantenimientosOptimizado(
                equiposActivosData,
                tiposMantenimientoData,
                todosLosMantenimientosRealizados
            );

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

            // ✅ GUARDAR EN MEMORIA GLOBAL
            window.DASHBOARD_CACHE.datos = dashboardData;
            window.DASHBOARD_CACHE.timestamp = Date.now();
            window.DASHBOARD_CACHE.ultimaCarga = new Date().toLocaleTimeString();

            // Actualizar la interfaz
            actualizarInterfaz();

            // Limpiar timeouts y ocultar loadings
            clearTimeout(loadingTimeout);
            mostrarLoadingDashboard(false);
            mostrarSkeletonCards(false);
            skeletonMostrado = false;

            console.log("✅ Dashboard cargado exitosamente y guardado en memoria");

        } catch (error) {
            clearTimeout(loadingTimeout);
            mostrarLoadingDashboard(false);
            mostrarSkeletonCards(false);
            skeletonMostrado = false;
            throw error;
        }

    } catch (err) {
        console.error("❌ Error cargando stats:", err);
        mostrarErrorDashboard(err.message);
        mostrarLoadingDashboard(false);
        mostrarSkeletonCards(false);
        skeletonMostrado = false;
    }
}

// ✅ FUNCIÓN OPTIMIZADA: Calcular mantenimientos manualmente
async function calcularMantenimientosOptimizado(equiposData, tiposMantenimientoData, mantenimientosRealizadosData = []) {
    try {
        let vencidos = 0;
        let proximos = 0;
        let alDia = 0;
        let sinConfiguracion = 0;
        let totalMantenimientosProgramados = 0;
        let preventivos = 0;
        let calibraciones = 0;
        let correctivos = 0;
        let proximosMantenimiento = 0;
        let proximosCalibracion = 0;
        let vencidosPreventivos = 0;
        let vencidosCalibraciones = 0;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Identificar IDs de tipos de mantenimiento
        const tipoPreventivo = tiposMantenimientoData.find(t => t.nombre.toLowerCase().includes('preventivo'));
        const tipoCalibracion = tiposMantenimientoData.find(t => t.nombre.toLowerCase().includes('calibración') || t.nombre.toLowerCase().includes('calibracion'));
        const tipoCorrectivo = tiposMantenimientoData.find(t => t.nombre.toLowerCase().includes('correctivo'));

        // ✅ CONTAR CORRECTIVOS REALIZADOS
        if (mantenimientosRealizadosData && mantenimientosRealizadosData.length > 0) {
            const correctivosRealizados = mantenimientosRealizadosData.filter(mant => {
                if (tipoCorrectivo && mant.id_tipo === tipoCorrectivo.id) return true;
                if (mant.tipo_mantenimiento && mant.tipo_mantenimiento.toLowerCase().includes('correctivo')) return true;
                return false;
            });
            correctivos = correctivosRealizados.length;
        }

        // ✅ Procesar equipos en chunks
        const chunkSize = 10;
        const totalEquipos = equiposData.length;
        
        for (let i = 0; i < totalEquipos; i += chunkSize) {
            const chunk = equiposData.slice(i, i + chunkSize);
            
            const chunkPromises = chunk.map(async (equipo) => {
                try {
                    const equipoCompletoRes = await fetch(`${API_URL}/equipos/${equipo.id}/completo`);
                    if (!equipoCompletoRes.ok) {
                        return { sinConfiguracion: 1 };
                    }

                    const equipoCompleto = await equipoCompletoRes.json();

                    if (!equipoCompleto.mantenimientos_configurados || equipoCompleto.mantenimientos_configurados.length === 0) {
                        return { sinConfiguracion: 1 };
                    }

                    // Determinar estado del equipo
                    const estadoReal = determinarEstadoMantenimientoRealDashboard(equipoCompleto);
                    
                    // Variables para contar tipos específicos
                    let equipoProximoMantenimiento = false;
                    let equipoProximoCalibracion = false;
                    let equipoVencidoPreventivo = false;
                    let equipoVencidoCalibracion = false;
                    let chunkPreventivos = 0;
                    let chunkCalibraciones = 0;
                    let chunkTotalMantenimientos = 0;

                    // Analizar cada mantenimiento del equipo
                    equipoCompleto.mantenimientos_configurados.forEach(mant => {
                        if (mant.proxima_fecha && mant.activo !== false) {
                            chunkTotalMantenimientos++;

                            // Contar por tipo de mantenimiento
                            if (tipoPreventivo && mant.id_tipo_mantenimiento === tipoPreventivo.id) {
                                chunkPreventivos++;
                            } else if (tipoCalibracion && mant.id_tipo_mantenimiento === tipoCalibracion.id) {
                                chunkCalibraciones++;
                            }

                            // Calcular días para determinar próximos y vencidos por tipo
                            const proxima = new Date(mant.proxima_fecha);
                            proxima.setHours(0, 0, 0, 0);
                            const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));

                            // MANTENIMIENTOS PREVENTIVOS
                            if (tipoPreventivo && mant.id_tipo_mantenimiento === tipoPreventivo.id) {
                                if (diffDias <= 0) {
                                    equipoVencidoPreventivo = true;
                                } else if (diffDias <= 30) {
                                    equipoProximoMantenimiento = true;
                                }
                            }

                            // CALIBRACIONES
                            if (tipoCalibracion && mant.id_tipo_mantenimiento === tipoCalibracion.id) {
                                if (diffDias <= 0) {
                                    equipoVencidoCalibracion = true;
                                } else if (diffDias <= 30) {
                                    equipoProximoCalibracion = true;
                                }
                            }
                        }
                    });

                    return {
                        estado: estadoReal,
                        sinConfiguracion: 0,
                        preventivos: chunkPreventivos,
                        calibraciones: chunkCalibraciones,
                        totalMantenimientos: chunkTotalMantenimientos,
                        proximoMantenimiento: equipoProximoMantenimiento,
                        proximoCalibracion: equipoProximoCalibracion,
                        vencidoPreventivo: equipoVencidoPreventivo,
                        vencidoCalibracion: equipoVencidoCalibracion
                    };

                } catch (error) {
                    return { sinConfiguracion: 1 };
                }
            });

            // Esperar a que se procese el chunk completo
            const chunkResults = await Promise.all(chunkPromises);

            // Sumar resultados del chunk
            chunkResults.forEach(result => {
                switch (result.estado) {
                    case "VENCIDO": vencidos++; break;
                    case "PRÓXIMO": proximos++; break;
                    case "OK": alDia++; break;
                    case "SIN_DATOS": sinConfiguracion++; break;
                }

                sinConfiguracion += result.sinConfiguracion || 0;
                preventivos += result.preventivos || 0;
                calibraciones += result.calibraciones || 0;
                totalMantenimientosProgramados += result.totalMantenimientos || 0;
                
                if (result.proximoMantenimiento) proximosMantenimiento++;
                if (result.proximoCalibracion) proximosCalibracion++;
                if (result.vencidoPreventivo) vencidosPreventivos++;
                if (result.vencidoCalibracion) vencidosCalibraciones++;
            });
        }

        // ✅ CALCULAR TOTAL COMBINADO
        const totalCombinado = totalMantenimientosProgramados + correctivos;

        return {
            vencidos,
            proximos,
            alDia,
            sinConfiguracion,
            total: totalCombinado,
            preventivos,
            calibraciones,
            correctivos,
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

// ✅ FUNCIÓN AUXILIAR: Determinar estado real del mantenimiento
function determinarEstadoMantenimientoRealDashboard(equipo) {
    if (!equipo.mantenimientos_configurados || equipo.mantenimientos_configurados.length === 0) {
        return "SIN_DATOS";
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    let estado = "OK";
    let diasMasUrgente = Infinity;

    equipo.mantenimientos_configurados.forEach(mant => {
        if (mant.proxima_fecha) {
            const proxima = new Date(mant.proxima_fecha);
            proxima.setHours(0, 0, 0, 0);
            
            const diffDias = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));
            
            if (diffDias < diasMasUrgente) {
                diasMasUrgente = diffDias;
            }
        }
    });

    if (diasMasUrgente < 0) {
        estado = "VENCIDO";
    } else if (diasMasUrgente <= 30) {
        estado = "PRÓXIMO";
    } else if (diasMasUrgente === Infinity) {
        estado = "SIN_DATOS";
    }

    return estado;
}

// ✅ FUNCIÓN PARA MOSTRAR LOADING DISCRETO
function mostrarLoadingDashboard(mostrar) {
    let loadingElement = document.getElementById('dashboard-loading');
    
    if (mostrar) {
        if (!loadingElement) {
            loadingElement = document.createElement('div');
            loadingElement.id = 'dashboard-loading';
            loadingElement.className = 'fixed top-4 right-4 z-50 animate-slide-in';
            loadingElement.innerHTML = `
                <div class="bg-white rounded-lg p-4 shadow-xl border border-gray-200">
                    <div class="flex items-center space-x-3">
                        <div class="animate-spin rounded-full h-5 w-5 border-2 border-[#639A33] border-t-transparent"></div>
                        <div>
                            <p class="text-sm font-medium text-gray-800">Actualizando dashboard</p>
                            <p class="text-xs text-gray-600">Obteniendo datos...</p>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(loadingElement);
        }
    } else {
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            loadingElement.style.transform = 'translateY(-10px)';
            loadingElement.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                if (loadingElement && loadingElement.parentNode) {
                    loadingElement.remove();
                }
            }, 300);
        }
    }
}

// ✅ FUNCIÓN PARA MOSTRAR MENSAJE DE ACTUALIZACIÓN
function mostrarMensajeActualizacion() {
    const toastId = 'toast-actualizando';
    let toast = document.getElementById(toastId);
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'fixed top-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg z-50 animate-slide-in';
        toast.innerHTML = `
            <div class="flex items-center">
                <div class="bg-blue-100 p-2 rounded-md mr-3">
                    <div class="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                </div>
                <div>
                    <p class="font-medium text-blue-800">Actualizando datos</p>
                    <p class="text-sm text-blue-600">Mostrando información anterior</p>
                </div>
                <button onclick="document.getElementById('toast-actualizando').remove()" class="ml-4 text-blue-400 hover:text-blue-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(toast);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    if (toast && toast.parentNode) toast.remove();
                }, 300);
            }
        }, 3000);
    }
}

// ✅ MOSTRAR TOAST DE CARGA RÁPIDA
function mostrarToastCargaRapida() {
    const toastId = 'toast-carga-rapida';
    let toast = document.getElementById(toastId);
    
    if (!toast) {
        const ultimaCarga = window.DASHBOARD_CACHE.ultimaCarga || 'reciente';
        
        toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg z-50 animate-slide-in';
        toast.innerHTML = `
            <div class="flex items-center">
                <div class="bg-green-100 p-2 rounded-md mr-3">
                    <i class="fas fa-bolt text-green-600"></i>
                </div>
                <div>
                    <p class="font-medium text-green-800">Carga instantánea</p>
                    <p class="text-sm text-green-600">Datos actualizados: ${ultimaCarga}</p>
                </div>
                <button onclick="document.getElementById('toast-carga-rapida').remove()" class="ml-4 text-green-400 hover:text-green-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(toast);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    if (toast && toast.parentNode) toast.remove();
                }, 300);
            }
        }, 3000);
    }
}

// ✅ MOSTRAR SKELETON CARDS
function mostrarSkeletonCards(mostrar) {
    const skeletonId = 'skeleton-cards';
    let skeleton = document.getElementById(skeletonId);
    
    if (mostrar) {
        if (!skeleton) {
            skeleton = document.createElement('div');
            skeleton.id = skeletonId;
            skeleton.className = 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-8';
            
            const skeletonHTML = Array(4).fill(0).map(() => `
                <div class="bg-gray-100 rounded-lg p-6 animate-pulse">
                    <div class="flex items-center justify-between mb-4">
                        <div class="bg-gray-200 rounded-md w-12 h-12"></div>
                        <div class="bg-gray-200 rounded w-6 h-6"></div>
                    </div>
                    <div class="bg-gray-200 rounded h-6 w-24 mb-2"></div>
                    <div class="bg-gray-300 rounded h-10 w-16 mb-3"></div>
                    <div class="bg-gray-200 rounded h-4 w-32"></div>
                </div>
            `).join('');
            
            skeleton.innerHTML = skeletonHTML;
            
            // Reemplazar contenido actual con skeleton
            const mainContainer = document.querySelector('#main-content > .container');
            if (mainContainer) {
                const existingContent = mainContainer.querySelector('.grid-cols-1.md\\:grid-cols-4');
                if (existingContent) {
                    existingContent.style.display = 'none';
                    existingContent.parentNode.insertBefore(skeleton, existingContent.nextSibling);
                }
            }
        }
    } else {
        if (skeleton) {
            skeleton.remove();
            const existingContent = document.querySelector('#main-content .grid-cols-1.md\\:grid-cols-4');
            if (existingContent) {
                existingContent.style.display = 'grid';
            }
        }
    }
}

// ✅ ACTUALIZAR DATOS EN SEGUNDO PLANO
async function actualizarDatosEnSegundoPlano() {
    try {
        console.log("🔄 Actualizando datos en segundo plano...");
        
        // Solo actualizar si los datos tienen más de 1 minuto
        const ahora = Date.now();
        if (window.DASHBOARD_CACHE.timestamp && 
            (ahora - window.DASHBOARD_CACHE.timestamp) < 60000) {
            return; // Demasiado reciente
        }
        
        // Actualizar cache silenciosamente
        const [equiposRes, mantenimientosRes] = await Promise.all([
            fetch(`${API_URL}/equipos`),
            fetch(`${API_URL}/mantenimientos`)
        ]);
        
        if (equiposRes.ok && mantenimientosRes.ok) {
            const equiposData = await equiposRes.json();
            const mantenimientosData = mantenimientosRes.ok ? await mantenimientosRes.json() : [];
            
            // Actualizar datos en memoria
            if (window.DASHBOARD_CACHE.datos) {
                window.DASHBOARD_CACHE.datos.equipos.activos = equiposData.length;
                window.DASHBOARD_CACHE.datos.equipos.total = equiposData.length + 
                    (window.DASHBOARD_CACHE.datos.equipos.inactivos || 0);
                
                // Recalcular mantenimientos correctivos
                const tiposMantenimientoRes = await fetch(`${API_URL}/tipos-mantenimiento`);
                if (tiposMantenimientoRes.ok) {
                    const tiposMantenimientoData = await tiposMantenimientoRes.json();
                    const tipoCorrectivo = tiposMantenimientoData.find(t => 
                        t.nombre.toLowerCase().includes('correctivo')
                    );
                    
                    if (tipoCorrectivo) {
                        window.DASHBOARD_CACHE.datos.mantenimientos.correctivos = mantenimientosData.filter(mant => 
                            mant.id_tipo === tipoCorrectivo.id || 
                            mant.tipo_mantenimiento?.toLowerCase().includes('correctivo')
                        ).length;
                    }
                }
                
                window.DASHBOARD_CACHE.timestamp = Date.now();
                window.DASHBOARD_CACHE.ultimaCarga = new Date().toLocaleTimeString();
                
                console.log("✅ Datos actualizados en segundo plano en memoria");
                
                // Notificar actualización silenciosa
                mostrarNotificacionActualizacion();
            }
        }
    } catch (error) {
        console.log("⚠️ Error en actualización en segundo plano:", error);
        // No mostrar error al usuario
    }
}

// ✅ NUEVA FUNCIÓN: Notificación de actualización silenciosa
function mostrarNotificacionActualizacion() {
    // Solo mostrar si el usuario está en el dashboard
    if (!document.querySelector('#dashboard-loading')) {
        const notificacionId = 'notificacion-actualizacion';
        let notificacion = document.getElementById(notificacionId);
        
        if (!notificacion) {
            notificacion = document.createElement('div');
            notificacion.id = notificacionId;
            notificacion.className = 'fixed bottom-4 right-4 bg-blue-500 text-white rounded-lg p-3 shadow-lg z-50 animate-fade-in';
            notificacion.style.maxWidth = '300px';
            notificacion.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-sync-alt mr-2"></i>
                    <span class="text-sm">Datos del dashboard actualizados</span>
                    <button onclick="document.getElementById('notificacion-actualizacion').remove()" class="ml-3 text-blue-200 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            document.body.appendChild(notificacion);
            
            // Auto-remover después de 2 segundos
            setTimeout(() => {
                if (notificacion && notificacion.parentNode) {
                    notificacion.style.opacity = '0';
                    notificacion.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                        if (notificacion && notificacion.parentNode) notificacion.remove();
                    }, 300);
                }
            }, 2000);
        }
    }
}

// ✅ FUNCIÓN PARA FORZAR UNA ACTUALIZACIÓN COMPLETA
async function forzarActualizacionDashboard() {
    try {
        mostrarLoadingDashboard(true);
        
        // Limpiar cache para forzar recarga
        window.DASHBOARD_CACHE.datos = null;
        window.DASHBOARD_CACHE.timestamp = null;
        
        // Recargar datos
        await cargarStats();
        
        mostrarToastForzado();
        
    } catch (error) {
        console.error("Error forzando actualización:", error);
        mostrarLoadingDashboard(false);
    }
}

// ✅ NUEVA FUNCIÓN: Toast para actualización forzada
function mostrarToastForzado() {
    const toastId = 'toast-forzado';
    let toast = document.getElementById(toastId);
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'fixed top-4 right-4 bg-purple-50 border border-purple-200 rounded-lg p-4 shadow-lg z-50 animate-slide-in';
        toast.innerHTML = `
            <div class="flex items-center">
                <div class="bg-purple-100 p-2 rounded-md mr-3">
                    <i class="fas fa-sync text-purple-600"></i>
                </div>
                <div>
                    <p class="font-medium text-purple-800">Actualización completa</p>
                    <p class="text-sm text-purple-600">Todos los datos se han actualizado</p>
                </div>
                <button onclick="document.getElementById('toast-forzado').remove()" class="ml-4 text-purple-400 hover:text-purple-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(toast);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    if (toast && toast.parentNode) toast.remove();
                }, 300);
            }
        }, 3000);
    }
}

// ✅ FUNCIONES ORIGINALES (sin cambios)

function inicializarElementosDOM() {
    // Elementos principales
    domElements.totalEquipos = document.getElementById("total-equipos");
    domElements.totalOficinas = document.getElementById("total-oficinas");
    domElements.totalSedes = document.getElementById("total-sedes");
    domElements.totalPuestos = document.getElementById("total-puestos");

    // Crear secciones adicionales
    crearSeccionMantenimientos();
    crearSeccionAdicional();
    crearSeccionTiposMantenimiento();
    crearSeccionProximos();
    crearSeccionVencidosEspecificos();

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

    // Inicializar elementos de vencidos específicos
    domElements.vencidosPreventivos = document.getElementById("vencidos-preventivos");
    domElements.vencidosCalibraciones = document.getElementById("vencidos-calibraciones");
}

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

function actualizarInterfaz() {
    // Actualizar tarjetas principales
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

    // Actualizar tarjetas de mantenimientos
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

    // Actualizar tarjetas de tipos de mantenimiento
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
    }

    // Actualizar tarjetas de próximos
    if (domElements.proximosMantenimiento) {
        domElements.proximosMantenimiento.textContent = dashboardData.mantenimientos.proximosMantenimiento || 0;
    }
    if (domElements.proximosCalibracion) {
        domElements.proximosCalibracion.textContent = dashboardData.mantenimientos.proximosCalibracion || 0;
    }

    // Actualizar tarjetas de vencidos específicos
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
        // 📊 Gráfica de Barras - Distribución General
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

        // 🍩 Gráfica Circular - Tipos de Mantenimiento
        new Chart(pieChartCanvas, {
            type: "doughnut",
            data: {
                labels: [
                    "Mantenimientos Preventivos",
                    "Calibraciones",
                    "Mantenimientos Correctivos"
                ],
                datasets: [{
                    data: [
                        dashboardData.mantenimientos.preventivos || 0,
                        dashboardData.mantenimientos.calibraciones || 0,
                        dashboardData.mantenimientos.correctivos || 0
                    ],
                    backgroundColor: ["#0D9488", "#DB2777", "#EA580C"],
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

        // 📈 Gráfica de Línea - Estado de Mantenimientos
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
                        dashboardData.mantenimientos.vencidosPreventivos || 0,
                        dashboardData.mantenimientos.vencidosCalibraciones || 0
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

        // 🕸 Gráfica Radar - Comparación Relativa
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
                    "Prev. Vencidos",
                    "Calib. Vencidas"
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
                        dashboardData.mantenimientos.vencidosPreventivos || 0,
                        dashboardData.mantenimientos.vencidosCalibraciones || 0
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
    switch (tipo) {
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
        case 'vencidos-preventivos':
            url += '?vencido=preventivo';
            break;
        case 'vencidos-calibraciones':
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

// ✅ FUNCIÓN: Agregar botón de actualización al navbar
function agregarBotonActualizacion() {
    // Esperar a que el navbar esté disponible
    setTimeout(() => {
        const navbar = document.querySelector('nav .flex.items-center.space-x-4');
        if (navbar && !document.getElementById('btn-actualizar-dashboard')) {
            const botonActualizar = document.createElement('button');
            botonActualizar.id = 'btn-actualizar-dashboard';
            botonActualizar.className = 'flex items-center space-x-2 px-3 py-2 bg-[#639A33] text-white rounded-md hover:bg-[#4B7B2D] transition-colors';
            botonActualizar.innerHTML = `
                <i class="fas fa-sync-alt"></i>
                <span class="hidden md:inline">Actualizar</span>
            `;
            botonActualizar.title = "Forzar actualización del dashboard";
            botonActualizar.onclick = forzarActualizacionDashboard;
            
            navbar.appendChild(botonActualizar);
        }
    }, 1000);
}

// ✅ FUNCIÓN PARA MOSTRAR ESTADO DE CACHE EN CONSOLA (debug)
function mostrarEstadoCache() {
    console.log("📊 Estado del cache del dashboard:");
    console.log("- Datos cargados:", window.DASHBOARD_CACHE.datos ? "Sí" : "No");
    console.log("- Última actualización:", window.DASHBOARD_CACHE.ultimaCarga || "Nunca");
    console.log("- Tiempo desde última actualización:", 
        window.DASHBOARD_CACHE.timestamp ? 
        Math.floor((Date.now() - window.DASHBOARD_CACHE.timestamp) / 1000) + " segundos" : 
        "N/A");
    
    if (window.DASHBOARD_CACHE.datos) {
        console.log("- Total equipos:", window.DASHBOARD_CACHE.datos.equipos.total);
        console.log("- Mantenimientos vencidos:", window.DASHBOARD_CACHE.datos.mantenimientos.vencidos);
    }
}

// ========================= INICIALIZACIÓN =========================

document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 Inicializando dashboard con persistencia...");
    
    // Verificar si ya hay datos cargados
    const ahora = Date.now();
    
    if (window.DASHBOARD_CACHE.datos && 
        window.DASHBOARD_CACHE.timestamp && 
        (ahora - window.DASHBOARD_CACHE.timestamp) < window.DASHBOARD_CACHE.ttl) {
        
        console.log("📱 Dashboard: Datos en memoria encontrados, cargando instantáneamente");
        
        // Cargar inmediatamente desde memoria
        dashboardData = window.DASHBOARD_CACHE.datos;
        setTimeout(() => {
            if (!domElements.totalEquipos) {
                inicializarElementosDOM();
            }
            actualizarInterfaz();
            mostrarToastCargaRapida();
        }, 100);
        
        // Actualizar en segundo plano
        actualizarDatosEnSegundoPlano();
        
    } else {
        // Cargar normalmente
        cargarStats();
    }
    
    // Agregar botón de actualización al navbar
    agregarBotonActualizacion();
    
    // Actualizar cada 5 minutos
    setInterval(() => {
        const ahora = Date.now();
        if (!window.DASHBOARD_CACHE.timestamp || 
            (ahora - window.DASHBOARD_CACHE.timestamp) >= window.DASHBOARD_CACHE.ttl) {
            console.log("🔄 Actualizando dashboard (cache expirado)");
            cargarStats();
        }
    }, 300000);
    
    // Actualizar cuando la pestaña se vuelve visible
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            const ahora = Date.now();
            // Actualizar si los datos tienen más de 2 minutos
            if (!window.DASHBOARD_CACHE.timestamp || 
                (ahora - window.DASHBOARD_CACHE.timestamp) >= (2 * 60 * 1000)) {
                console.log("🔍 Pestaña visible, actualizando datos");
                cargarStats();
            }
        }
    });
});

// Hacer funciones disponibles globalmente
window.navigateToMantenimientos = navigateToMantenimientos;
window.cargarStats = cargarStats;
window.forzarActualizacionDashboard = forzarActualizacionDashboard;
window.mostrarEstadoCache = mostrarEstadoCache;