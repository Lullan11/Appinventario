// src/js/equipos-suspendidos.js

const API_EQUIPOS = "https://inventario-api-gw73.onrender.com/equipos";
let equiposSuspendidos = [];

// ✅ VARIABLES PARA LOADING
let loadingTimeout = null;

// ✅ FUNCIÓN PARA MOSTRAR LOADING
function mostrarLoadingSuspendidos(mostrar) {
    let loadingElement = document.getElementById('suspendidos-loading');
    
    if (mostrar) {
        // Limpiar timeout anterior si existe
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
        }
        
        // Solo mostrar después de 300ms (si la carga es rápida, no se muestra)
        loadingTimeout = setTimeout(() => {
            if (!document.getElementById('suspendidos-loading')) {
                loadingElement = document.createElement('div');
                loadingElement.id = 'suspendidos-loading';
                loadingElement.className = 'fixed top-4 right-4 z-50 animate-slide-in';
                loadingElement.innerHTML = `
                    <div class="bg-white rounded-lg p-4 shadow-xl border border-gray-200">
                        <div class="flex items-center space-x-3">
                            <div class="animate-spin rounded-full h-5 w-5 border-2 border-[#f59e0b] border-t-transparent"></div>
                            <div>
                                <p class="text-sm font-medium text-gray-800">Cargando equipos suspendidos</p>
                                <p class="text-xs text-gray-600">Obteniendo datos...</p>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(loadingElement);
            }
        }, 300);
    } else {
        // Limpiar timeout si aún no se mostró
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
        }
        
        // Ocultar loading con animación
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

document.addEventListener("DOMContentLoaded", async () => {
    try {
        console.log("🚀 Inicializando módulo de equipos suspendidos...");
        
        // ✅ MOSTRAR LOADING
        mostrarLoadingSuspendidos(true);
        
        // Cargar equipos suspendidos
        await cargarEquiposSuspendidos();
        
        // Configurar eventos
        configurarEventos();
        
        // ✅ OCULTAR LOADING
        mostrarLoadingSuspendidos(false);
        
        // Ocultar skeleton
        document.getElementById('skeleton-loading').style.display = 'none';
        
    } catch (err) {
        console.error("❌ Error inicializando:", err);
        mostrarLoadingSuspendidos(false);
        document.getElementById('skeleton-loading').style.display = 'none';
        mostrarMensaje("❌ Error al cargar equipos suspendidos", true);
    }
});

async function cargarEquiposSuspendidos() {
    try {
        const res = await fetch(`${API_EQUIPOS}/suspendidos`);
        if (!res.ok) throw new Error("Error al obtener equipos suspendidos");

        equiposSuspendidos = await res.json();
        renderizarTablaSuspendidos();
        
        console.log(`✅ Cargados ${equiposSuspendidos.length} equipos suspendidos`);
    } catch (err) {
        console.error("Error cargando equipos suspendidos:", err);
        const contenidoDinamico = document.getElementById("contenido-dinamico");
        contenidoDinamico.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
                <p class="text-red-700 font-medium">Error al cargar equipos suspendidos</p>
                <p class="text-gray-600 text-sm mt-1">${err.message}</p>
                <button onclick="cargarEquiposSuspendidos()" class="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    <i class="fas fa-redo mr-1"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function renderizarTablaSuspendidos() {
    const contenidoDinamico = document.getElementById("contenido-dinamico");
    
    if (equiposSuspendidos.length === 0) {
        contenidoDinamico.innerHTML = `
            <section class="max-w-4xl mx-auto bg-white p-8 border-2 border-[#0F172A] rounded-xl shadow-md text-center">
                <i class="fas fa-pause-circle text-4xl text-yellow-400 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay equipos suspendidos</h3>
                <p class="text-gray-500 mb-4">Todos los equipos se encuentran activos o inactivos.</p>
                <div class="space-x-3">
                    <a href="equipos.html" class="bg-[#639A33] text-white px-4 py-2 rounded hover:bg-green-600 transition">
                        Ver equipos activos
                    </a>
                    <a href="equipos-inactivos.html" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition">
                        Ver equipos inactivos
                    </a>
                </div>
            </section>
        `;
        return;
    }

    contenidoDinamico.innerHTML = `
        <section class="max-w-7xl mx-auto bg-white p-6 border-2 border-[#0F172A] rounded-xl shadow-md">
            <!-- Header -->
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h3 class="text-2xl font-semibold text-[#0F172A]">Equipos Suspendidos</h3>
                    <p class="text-gray-600">Equipos temporalmente fuera de servicio</p>
                </div>
                <span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    <i class="fas fa-pause mr-1"></i> ${equiposSuspendidos.length} suspendido(s)
                </span>
            </div>

            <!-- Barra de búsqueda -->
            <div class="mb-6">
                <div class="relative max-w-md">
                    <input 
                        type="text" 
                        id="buscar-suspendidos" 
                        placeholder="Buscar por código, nombre, motivo..." 
                        class="w-full pl-10 pr-4 py-2 border-2 border-[#0F172A] rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fas fa-search text-gray-400"></i>
                    </div>
                </div>
            </div>

            <!-- Tabla -->
            <div class="overflow-x-auto">
                <table class="min-w-full text-left border border-[#0F172A]">
                    <thead class="bg-yellow-600 text-white">
                        <tr>
                            <th class="px-4 py-2 border border-[#0F172A]">Código</th>
                            <th class="px-4 py-2 border border-[#0F172A]">Nombre</th>
                            <th class="px-4 py-2 border border-[#0F172A]">Motivo</th>
                            <th class="px-4 py-2 border border-[#0F172A]">Fecha suspensión</th>
                            <th class="px-4 py-2 border border-[#0F172A]">Reintegro estimado</th>
                            <th class="px-4 py-2 border border-[#0F172A]">Estado</th>
                            <th class="px-4 py-2 border border-[#0F172A] text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tablaSuspendidos">
                        ${equiposSuspendidos.map(equipo => crearFilaSuspendido(equipo)).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Mensaje sin resultados -->
            <div id="sin-resultados-suspendidos" class="hidden text-center py-8">
                <i class="fas fa-search text-3xl text-gray-400 mb-3"></i>
                <h4 class="text-lg font-semibold text-gray-600 mb-2">No se encontraron resultados</h4>
                <p class="text-gray-500">Intenta con otros términos de búsqueda</p>
            </div>
        </section>
    `;

    // Configurar búsqueda
    const buscarInput = document.getElementById('buscar-suspendidos');
    if (buscarInput) {
        buscarInput.addEventListener('input', filtrarSuspendidos);
    }
}

function crearFilaSuspendido(equipo) {
    return `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-2 border border-[#0F172A] font-mono">${equipo.codigo_interno}</td>
            <td class="px-4 py-2 border border-[#0F172A] font-medium">${equipo.nombre}</td>
            <td class="px-4 py-2 border border-[#0F172A]">
                <div class="text-sm">
                    <div class="font-medium">${equipo.motivo || '-'}</div>
                    ${equipo.observaciones ? `<div class="text-gray-600 text-xs mt-1">${equipo.observaciones.substring(0, 50)}${equipo.observaciones.length > 50 ? '...' : ''}</div>` : ''}
                </div>
            </td>
            <td class="px-4 py-2 border border-[#0F172A]">${equipo.fecha_suspension ? new Date(equipo.fecha_suspension).toLocaleDateString() : '-'}</td>
            <td class="px-4 py-2 border border-[#0F172A]">${equipo.fecha_reintegro_estimada ? new Date(equipo.fecha_reintegro_estimada).toLocaleDateString() : '-'}</td>
            <td class="px-4 py-2 border border-[#0F172A]">
                ${equipo.reintegrado ? 
                    '<span class="badge-reintegrado"><i class="fas fa-check-circle mr-1"></i>Reintegrado</span>' : 
                    '<span class="badge-suspendido"><i class="fas fa-pause mr-1"></i>Suspendido</span>'}
            </td>
            <td class="px-4 py-2 border border-[#0F172A] text-center">
                <div class="flex justify-center gap-2">
                    <button onclick="verDetalleSuspendido(${equipo.id})" 
                        class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm">
                        <i class="fas fa-eye mr-1"></i>Ver
                    </button>
                    ${!equipo.reintegrado ? `
                        <button onclick="reintegrarEquipo(${equipo.id})" 
                            class="btn-reintegrar px-3 py-1 rounded text-sm">
                            <i class="fas fa-play mr-1"></i>Reintegrar
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

function configurarEventos() {
    // Formulario suspender
    const formSuspender = document.getElementById('form-suspender');
    if (formSuspender) {
        formSuspender.addEventListener('submit', async (e) => {
            e.preventDefault();
            await suspenderEquipo();
        });
    }

    // Formulario reintegrar
    const formReintegrar = document.getElementById('form-reintegrar');
    if (formReintegrar) {
        formReintegrar.addEventListener('submit', async (e) => {
            e.preventDefault();
            await reintegrarEquipoSubmit();
        });
    }

    // Fecha de suspensión por defecto
    const fechaSuspension = document.getElementById('fecha-suspension');
    if (fechaSuspension) {
        fechaSuspension.valueAsDate = new Date();
    }

    // Fecha de reintegro real por defecto
    const fechaReintegroReal = document.getElementById('fecha-reintegro-real');
    if (fechaReintegroReal) {
        fechaReintegroReal.valueAsDate = new Date();
    }
}

function filtrarSuspendidos() {
    const termino = document.getElementById('buscar-suspendidos').value.toLowerCase().trim();
    const tablaSuspendidos = document.getElementById('tablaSuspendidos');
    const sinResultados = document.getElementById('sin-resultados-suspendidos');
    
    if (!tablaSuspendidos) return;

    if (termino === '') {
        renderizarFilasSuspendidos(equiposSuspendidos);
        if (sinResultados) sinResultados.classList.add('hidden');
        return;
    }

    const equiposFiltrados = equiposSuspendidos.filter(equipo => 
        equipo.codigo_interno.toLowerCase().includes(termino) ||
        equipo.nombre.toLowerCase().includes(termino) ||
        (equipo.motivo && equipo.motivo.toLowerCase().includes(termino)) ||
        (equipo.realizado_por && equipo.realizado_por.toLowerCase().includes(termino)) ||
        (equipo.observaciones && equipo.observaciones.toLowerCase().includes(termino))
    );

    renderizarFilasSuspendidos(equiposFiltrados);

    if (sinResultados) {
        if (equiposFiltrados.length === 0) {
            sinResultados.classList.remove('hidden');
        } else {
            sinResultados.classList.add('hidden');
        }
    }
}

function renderizarFilasSuspendidos(equipos) {
    const tablaSuspendidos = document.getElementById('tablaSuspendidos');
    if (!tablaSuspendidos) return;

    if (equipos.length === 0) {
        tablaSuspendidos.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-gray-500">
                    No hay equipos suspendidos que coincidan con la búsqueda
                </td>
            </tr>
        `;
    } else {
        tablaSuspendidos.innerHTML = equipos.map(equipo => crearFilaSuspendido(equipo)).join('');
    }
}

// Función para mostrar modal de suspensión (se llama desde equipos.js)
async function mostrarModalSuspender(id) {
    try {
        // ✅ MOSTRAR LOADING
        mostrarLoadingSuspendidos(true);
        
        const res = await fetch(`${API_EQUIPOS}/${id}/completo`);
        if (!res.ok) throw new Error("Error al obtener datos del equipo");
        
        const equipo = await res.json();
        
        document.getElementById('equipo-id-suspender').value = id;
        document.getElementById('info-equipo-suspender').innerHTML = `
            <p><strong>Nombre:</strong> ${equipo.nombre}</p>
            <p><strong>Código:</strong> ${equipo.codigo_interno}</p>
            <p><strong>Ubicación:</strong> ${equipo.ubicacion === 'puesto' ? 
                `Puesto: ${equipo.puesto_codigo || '-'}` : 
                `Área: ${equipo.area_nombre || '-'}`}</p>
            <p><strong>Responsable:</strong> ${equipo.responsable_nombre || '-'}</p>
            <p><strong>Tipo:</strong> ${equipo.tipo_equipo_nombre || '-'}</p>
        `;
        
        const fechaSuspension = document.getElementById('fecha-suspension');
        fechaSuspension.valueAsDate = new Date();
        
        // Establecer fecha estimada de reintegro (por defecto 7 días)
        const fechaEstimada = new Date();
        fechaEstimada.setDate(fechaEstimada.getDate() + 7);
        document.getElementById('fecha-reintegro-estimada').valueAsDate = fechaEstimada;
        
        document.getElementById('modal-suspender').classList.remove('hidden');
        
        // ✅ OCULTAR LOADING
        mostrarLoadingSuspendidos(false);
        
    } catch (err) {
        console.error("Error al cargar datos para suspender:", err);
        mostrarLoadingSuspendidos(false);
        mostrarMensaje("❌ Error al cargar datos del equipo", true);
    }
}

function cerrarModalSuspender() {
    document.getElementById('modal-suspender').classList.add('hidden');
    document.getElementById('form-suspender').reset();
}

async function suspenderEquipo() {
    const id = document.getElementById('equipo-id-suspender').value;
    const formData = {
        motivo: document.getElementById('motivo-suspension').value,
        observaciones: document.getElementById('observaciones-suspension').value,
        fecha_suspension: document.getElementById('fecha-suspension').value,
        realizado_por: document.getElementById('realizado-por-suspension').value.trim(),
        fecha_reintegro_estimada: document.getElementById('fecha-reintegro-estimada').value
    };

    if (!formData.motivo || !formData.fecha_suspension || !formData.realizado_por || !formData.fecha_reintegro_estimada) {
        mostrarMensaje("❌ Complete todos los campos requeridos", true);
        return;
    }

    try {
        // ✅ MOSTRAR LOADING
        mostrarLoadingSuspendidos(true);
        
        const res = await fetch(`${API_EQUIPOS}/${id}/suspender`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Error al suspender equipo");
        }

        mostrarMensaje("✅ Equipo suspendido correctamente");
        cerrarModalSuspender();
        
        // ✅ OCULTAR LOADING
        mostrarLoadingSuspendidos(false);
        
        // Si estamos en la página de equipos suspendidos, recargar
        if (window.location.pathname.includes('equipos-suspendidos')) {
            await cargarEquiposSuspendidos();
        } else {
            // Si estamos en la página principal, recargar
            setTimeout(() => location.reload(), 2000);
        }

    } catch (err) {
        console.error("Error al suspender equipo:", err);
        mostrarLoadingSuspendidos(false);
        mostrarMensaje("❌ Error al suspender equipo: " + err.message, true);
    }
}

async function verDetalleSuspendido(id) {
    try {
        // ✅ MOSTRAR LOADING
        mostrarLoadingSuspendidos(true);
        
        const res = await fetch(`${API_EQUIPOS}/${id}/suspendido-completo`);
        if (!res.ok) throw new Error("Error al obtener detalles");
        
        const equipo = await res.json();
        
        // ✅ OCULTAR LOADING
        mostrarLoadingSuspendidos(false);
        
        const modalHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
                    <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                        <h3 class="text-xl font-bold text-[#0F172A]">Detalle del Equipo Suspendido</h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-4">
                                <div class="bg-gray-50 p-4 rounded-lg">
                                    <h4 class="font-semibold text-lg text-gray-700 mb-2">Información del Equipo</h4>
                                    <div class="space-y-2">
                                        <p><strong>Código:</strong> ${equipo.codigo_interno}</p>
                                        <p><strong>Nombre:</strong> ${equipo.nombre}</p>
                                        <p><strong>Tipo:</strong> ${equipo.tipo_equipo_nombre || '-'}</p>
                                        <p><strong>Ubicación:</strong> ${equipo.ubicacion === 'puesto' ? 'Puesto' : 'Área'}</p>
                                        <p><strong>Responsable:</strong> ${equipo.responsable_nombre || '-'}</p>
                                    </div>
                                </div>
                                
                                <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                    <h4 class="font-semibold text-lg text-yellow-700 mb-2">Información de Suspensión</h4>
                                    <div class="space-y-2">
                                        <p><strong>Motivo:</strong> ${equipo.motivo || '-'}</p>
                                        <p><strong>Fecha suspensión:</strong> ${equipo.fecha_suspension ? new Date(equipo.fecha_suspension).toLocaleDateString() : '-'}</p>
                                        <p><strong>Realizado por:</strong> ${equipo.realizado_por || '-'}</p>
                                        <p><strong>Reintegro estimado:</strong> ${equipo.fecha_reintegro_estimada ? new Date(equipo.fecha_reintegro_estimada).toLocaleDateString() : '-'}</p>
                                        ${equipo.observaciones ? `<p><strong>Observaciones:</strong> ${equipo.observaciones}</p>` : ''}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="space-y-4">
                                ${equipo.reintegrado ? `
                                    <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                                        <h4 class="font-semibold text-lg text-green-700 mb-2">Información de Reintegro</h4>
                                        <div class="space-y-2">
                                            <p><strong>Fecha reintegro:</strong> ${equipo.fecha_reintegro_real ? new Date(equipo.fecha_reintegro_real).toLocaleDateString() : '-'}</p>
                                            <p><strong>Realizado por:</strong> ${equipo.realizado_por_reintegro || '-'}</p>
                                            ${equipo.observaciones_reintegro ? `<p><strong>Observaciones:</strong> ${equipo.observaciones_reintegro}</p>` : ''}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${Object.keys(equipo.campos_personalizados || {}).length > 0 ? `
                                    <div class="bg-blue-50 p-4 rounded-lg">
                                        <h4 class="font-semibold text-lg text-blue-700 mb-2">Especificaciones</h4>
                                        <div class="grid grid-cols-2 gap-2">
                                            ${Object.entries(equipo.campos_personalizados).map(([key, value]) => `
                                                <div class="text-sm">
                                                    <span class="font-medium">${key}:</span>
                                                    <span class="text-gray-600"> ${value || '-'}</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="mt-6 flex justify-end">
                            <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    } catch (err) {
        console.error("Error al obtener detalle:", err);
        mostrarLoadingSuspendidos(false);
        mostrarMensaje("❌ Error al cargar detalles del equipo", true);
    }
}

async function reintegrarEquipo(id) {
    try {
        // ✅ MOSTRAR LOADING
        mostrarLoadingSuspendidos(true);
        
        const res = await fetch(`${API_EQUIPOS}/${id}/suspendido-completo`);
        if (!res.ok) throw new Error("Error al obtener datos del equipo");
        
        const equipo = await res.json();
        
        document.getElementById('equipo-id-reintegrar').value = id;
        document.getElementById('info-equipo-reintegrar').innerHTML = `
            <p><strong>Nombre:</strong> ${equipo.nombre}</p>
            <p><strong>Código:</strong> ${equipo.codigo_interno}</p>
            <p><strong>Motivo suspensión:</strong> ${equipo.motivo || '-'}</p>
            <p><strong>Fecha suspensión:</strong> ${equipo.fecha_suspension ? new Date(equipo.fecha_suspension).toLocaleDateString() : '-'}</p>
            <p><strong>Reintegro estimado:</strong> ${equipo.fecha_reintegro_estimada ? new Date(equipo.fecha_reintegro_estimada).toLocaleDateString() : '-'}</p>
        `;
        
        document.getElementById('fecha-reintegro-real').valueAsDate = new Date();
        
        document.getElementById('modal-reintegrar').classList.remove('hidden');
        
        // ✅ OCULTAR LOADING
        mostrarLoadingSuspendidos(false);
        
    } catch (err) {
        console.error("Error al cargar datos para reintegrar:", err);
        mostrarLoadingSuspendidos(false);
        mostrarMensaje("❌ Error al cargar datos del equipo", true);
    }
}

function cerrarModalReintegrar() {
    document.getElementById('modal-reintegrar').classList.add('hidden');
    document.getElementById('form-reintegrar').reset();
}

async function reintegrarEquipoSubmit() {
    const id = document.getElementById('equipo-id-reintegrar').value;
    const formData = {
        observaciones_reintegro: document.getElementById('observaciones-reintegro').value,
        realizado_por_reintegro: document.getElementById('realizado-por-reintegro').value.trim(),
        fecha_reintegro_real: document.getElementById('fecha-reintegro-real').value
    };

    if (!formData.observaciones_reintegro || !formData.realizado_por_reintegro || !formData.fecha_reintegro_real) {
        mostrarMensaje("❌ Complete todos los campos requeridos", true);
        return;
    }

    try {
        // ✅ MOSTRAR LOADING
        mostrarLoadingSuspendidos(true);
        
        const res = await fetch(`${API_EQUIPOS}/${id}/reintegrar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Error al reintegrar equipo");
        }

        mostrarMensaje("✅ Equipo reintegrado correctamente");
        cerrarModalReintegrar();
        
        // ✅ OCULTAR LOADING
        mostrarLoadingSuspendidos(false);
        
        // Recargar la lista
        await cargarEquiposSuspendidos();

    } catch (err) {
        console.error("Error al reintegrar equipo:", err);
        mostrarLoadingSuspendidos(false);
        mostrarMensaje("❌ Error al reintegrar equipo: " + err.message, true);
    }
}

function mostrarMensaje(texto, esError = false) {
    let mensaje = document.getElementById("mensaje-suspendidos");
    if (!mensaje) {
        mensaje = document.createElement("div");
        mensaje.id = "mensaje-suspendidos";
        mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 animate-slide-in";
        document.body.appendChild(mensaje);
    }

    mensaje.textContent = texto;
    mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 animate-slide-in ${esError ? "bg-red-100 text-red-800 border-l-4 border-red-500" : "bg-green-100 text-green-800 border-l-4 border-green-500"}`;

    setTimeout(() => {
        mensaje.style.opacity = '0';
        mensaje.style.transform = 'translateX(100%)';
        mensaje.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            mensaje.remove();
        }, 300);
    }, 4000);
}

// ========================= Hacer funciones disponibles globalmente =========================

window.mostrarModalSuspender = mostrarModalSuspender;
window.cerrarModalSuspender = cerrarModalSuspender;
window.verDetalleSuspendido = verDetalleSuspendido;
window.reintegrarEquipo = reintegrarEquipo;
window.cerrarModalReintegrar = cerrarModalReintegrar;
window.filtrarSuspendidos = filtrarSuspendidos;
window.cargarEquiposSuspendidos = cargarEquiposSuspendidos;