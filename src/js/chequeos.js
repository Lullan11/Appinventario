// Configuración
const CLOUDINARY_CONFIG = {
    cloudName: 'dzkccjhn9',
    uploadPreset: 'inventario'
};

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}`;
const CLOUDINARY_RAW_UPLOAD = `${CLOUDINARY_UPLOAD_URL}/raw/upload`;
const API_BASE_URL = 'https://inventario-api-gw73.onrender.com';

// Variables globales
let sedeSeleccionada = null;
let consultorioSeleccionado = null;
let areaEspecialSeleccionada = null;
let historialChequeos = [];
let tipoInformeCompletoSeleccionado = 'completo';
let sedesDisponibles = [];
let consultoriosPorSede = {};
let areasPorSede = {};
let equiposPorSede = {};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    console.log('🔄 Iniciando sistema de chequeos...');
    
    cargarFechaActual();
    configurarEventos();
    configurarTabs();
    
    // Ocultar contenido principal inicialmente
    ocultarContenidoPrincipal();
    
    // Verificar si hay una sede guardada válida
    const sedeGuardada = verificarSedeGuardada();
    
    if (sedeGuardada) {
        console.log(`🔄 Recuperando sede guardada: ${sedeGuardada.nombre}`);
        
        // Usar la sede guardada
        sedeSeleccionada = sedeGuardada;
        
        // Actualizar interfaz inmediatamente
        actualizarTituloConSede(sedeGuardada.nombre);
        mostrarContenidoPrincipal();
        mostrarBotonCambiarSede();
        
        // Cargar datos de la sede
        cargarDatosDeSede();
        
    } else {
        console.log('ℹ️ No hay sede guardada, cargando sedes...');
        // Mostrar selector de sedes
        setTimeout(() => mostrarSelectorSedes(), 100);
    }
});

// ========================= FUNCIONES DE SEDES =========================

async function cargarSedes() {
    try {
        console.log('🏢 Cargando sedes disponibles desde BD...');
        
        // Mostrar estado de carga
        document.getElementById('cargando-sedes').classList.remove('hidden');
        document.getElementById('error-sedes').classList.add('hidden');
        document.getElementById('lista-sedes').innerHTML = '';
        
        const response = await fetch(`${API_BASE_URL}/sedes`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
        
        sedesDisponibles = await response.json();
        console.log(`✅ Sedes cargadas: ${sedesDisponibles.length}`);
        
        // Ocultar cargando y mostrar sedes
        document.getElementById('cargando-sedes').classList.add('hidden');
        
        if (sedesDisponibles.length === 0) {
            document.getElementById('lista-sedes').innerHTML = `
                <div class="text-center p-4 text-gray-500">
                    <i class="fas fa-building text-3xl mb-2"></i>
                    <p>No hay sedes disponibles en la base de datos</p>
                </div>
            `;
            return;
        }
        
        // Mostrar las sedes
        mostrarListaSedes();
        
        // También cargar las configuraciones por sede
        await cargarConfiguracionesSedes();
        
    } catch (err) {
        console.error('❌ Error cargando sedes:', err);
        
        document.getElementById('cargando-sedes').classList.add('hidden');
        document.getElementById('error-sedes').classList.remove('hidden');
        
        mostrarMensaje('❌ Error al cargar las sedes: ' + err.message, true);
    }
}

async function cargarConfiguracionesSedes() {
    try {
        console.log('⚙️ Cargando configuraciones por sede...');
        
        // Cargar consultorios por sede
        const responseConsultorios = await fetch(`${API_BASE_URL}/consultorios`);
        if (responseConsultorios.ok) {
            const consultorios = await responseConsultorios.json();
            consultoriosPorSede = consultorios;
            console.log(`✅ Configuraciones de consultorios cargadas para ${Object.keys(consultoriosPorSede).length} sedes`);
        }
        
        // Cargar áreas por sede
        const responseAreas = await fetch(`${API_BASE_URL}/areas-especiales`);
        if (responseAreas.ok) {
            const areas = await responseAreas.json();
            areasPorSede = areas;
            console.log(`✅ Configuraciones de áreas cargadas para ${Object.keys(areasPorSede).length} sedes`);
        }
        
        // Cargar equipos por sede
        const responseEquipos = await fetch(`${API_BASE_URL}/equipos-sede`);
        if (responseEquipos.ok) {
            const equipos = await responseEquipos.json();
            equiposPorSede = equipos;
            console.log(`✅ Configuraciones de equipos cargadas para ${Object.keys(equiposPorSede).length} sedes`);
        }
        
    } catch (error) {
        console.error('❌ Error cargando configuraciones:', error);
        // No mostramos error al usuario porque es información complementaria
    }
}

function mostrarListaSedes() {
    const listaSedes = document.getElementById('lista-sedes');
    listaSedes.innerHTML = '';
    
    sedesDisponibles.forEach(sede => {
        const cardSede = document.createElement('div');
        cardSede.className = 'sede-card bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 hover:border-[#639A33] transition-all duration-200';
        cardSede.dataset.sedeId = sede.id;
        cardSede.dataset.sedeNombre = sede.nombre;
        
        // Verificar si tiene configuraciones especiales
        const tieneConsultorios = consultoriosPorSede[sede.id] && consultoriosPorSede[sede.id].length > 0;
        const tieneAreas = areasPorSede[sede.id] && areasPorSede[sede.id].length > 0;
        
        let configuraciones = [];
        if (tieneConsultorios) configuraciones.push(`${consultoriosPorSede[sede.id].length} consultorios`);
        if (tieneAreas) configuraciones.push(`${areasPorSede[sede.id].length} áreas especiales`);
        
        cardSede.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="bg-[#639A33]/10 p-3 rounded-full">
                    <i class="fas fa-hospital text-[#639A33] text-lg"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-center justify-between">
                        <h3 class="font-semibold text-gray-800">${sede.nombre}</h3>
                        ${tieneConsultorios || tieneAreas ? '<span class="sede-badge text-xs">Configurada</span>' : ''}
                    </div>
                    <p class="text-sm text-gray-600 mt-1">${sede.codigo || 'Sin código'}</p>
                    ${configuraciones.length > 0 ? 
                        `<p class="text-xs text-gray-500 mt-1">${configuraciones.join(', ')}</p>` : 
                        ''}
                </div>
                <i class="fas fa-chevron-right text-gray-400"></i>
            </div>
        `;
        
        cardSede.addEventListener('click', () => {
            seleccionarSede(sede.id, sede.nombre);
        });
        
        listaSedes.appendChild(cardSede);
    });
}

function seleccionarSede(sedeId, sedeNombre) {
    console.log(`🏢 Sede seleccionada: ${sedeNombre} (ID: ${sedeId})`);
    
    // Validar que la sede sea válida
    if (!sedeId || !sedeNombre) {
        mostrarMensaje('❌ Error: Datos de sede inválidos', true);
        return;
    }
    
    // Verificar si ya está seleccionada esta sede
    if (sedeSeleccionada && sedeSeleccionada.id === sedeId) {
        console.log('ℹ️ La sede ya está seleccionada');
        return;
    }
    
    // Guardar la nueva selección
    sedeSeleccionada = {
        id: sedeId,
        nombre: sedeNombre,
        codigo: sedesDisponibles.find(s => s.id === sedeId)?.codigo || ''
    };
    
    // Guardar en localStorage con timestamp
    const sedeData = {
        id: sedeId,
        nombre: sedeNombre,
        codigo: sedeSeleccionada.codigo,
        fecha: new Date().toISOString(),
        modulo: 'chequeos'
    };
    
    try {
        localStorage.setItem('sede_chequeos', JSON.stringify(sedeData));
        console.log('💾 Sede guardada en localStorage:', sedeData);
    } catch (error) {
        console.error('❌ Error guardando en localStorage:', error);
    }
    
    // Ocultar el selector de sede
    ocultarSelectorSede();
    
    // Actualizar interfaz
    actualizarInterfazParaSede();
    
    // Mostrar mensaje de confirmación
    mostrarMensaje(`✅ Sede seleccionada: ${sedeNombre}`, false);
}

function actualizarInterfazParaSede() {
    // Actualizar título y subtítulo
    actualizarTituloConSede(sedeSeleccionada.nombre);
    
    // Mostrar contenido principal
    mostrarContenidoPrincipal();
    
    // Mostrar botón para cambiar sede
    mostrarBotonCambiarSede();
    
    // Actualizar consultorios y áreas según la sede
    actualizarConsultoriosParaSede();
    actualizarAreasParaSede();
    
    // Cargar datos de la sede
    cargarDatosDeSede();
}

function actualizarConsultoriosParaSede() {
    const gridConsultorios = document.getElementById('grid-consultorios');
    const selectConsultorios = document.getElementById('select-consultorio-informe');
    
    if (!gridConsultorios || !selectConsultorios) return;
    
    // Obtener consultorios para esta sede
    const consultoriosSede = consultoriosPorSede[sedeSeleccionada.id] || [];
    
    // Si no hay consultorios específicos, usar los por defecto (1-6)
    if (consultoriosSede.length === 0) {
        console.log(`ℹ️ No hay consultorios específicos para sede ${sedeSeleccionada.nombre}, usando por defecto`);
        
        // Generar consultorios por defecto (1-6)
        const consultoriosDefault = Array.from({length: 6}, (_, i) => ({
            id: i + 1,
            nombre: `Consultorio ${i + 1}`,
            descripcion: `Consultorio médico ${i + 1}`
        }));
        
        mostrarConsultoriosEnGrid(consultoriosDefault);
        llenarSelectConsultorios(consultoriosDefault);
        
    } else {
        // Usar consultorios específicos de la sede
        console.log(`✅ Usando ${consultoriosSede.length} consultorios específicos para sede ${sedeSeleccionada.nombre}`);
        mostrarConsultoriosEnGrid(consultoriosSede);
        llenarSelectConsultorios(consultoriosSede);
    }
}

function actualizarAreasParaSede() {
    const gridAreas = document.getElementById('grid-areas');
    const selectAreas = document.getElementById('select-area-informe');
    
    if (!gridAreas || !selectAreas) return;
    
    // Obtener áreas para esta sede
    const areasSede = areasPorSede[sedeSeleccionada.id] || [];
    
    if (areasSede.length === 0) {
        console.log(`ℹ️ No hay áreas especiales específicas para sede ${sedeSeleccionada.nombre}, usando por defecto`);
        
        // Usar áreas por defecto
        const areasDefault = [
            { id: 'espirometria', nombre: 'Espirometría', descripcion: 'Equipos de prueba respiratoria' },
            { id: 'audiometria', nombre: 'Audiometría', descripcion: 'Equipos de prueba auditiva' },
            { id: 'optometria', nombre: 'Optometría', descripcion: 'Equipos de examen visual' },
            { id: 'psicologia', nombre: 'Psicología', descripcion: 'Equipos de evaluación psicológica' }
        ];
        
        mostrarAreasEnGrid(areasDefault);
        llenarSelectAreas(areasDefault);
        
    } else {
        // Usar áreas específicas de la sede
        console.log(`✅ Usando ${areasSede.length} áreas específicas para sede ${sedeSeleccionada.nombre}`);
        mostrarAreasEnGrid(areasSede);
        llenarSelectAreas(areasSede);
    }
}

function mostrarConsultoriosEnGrid(consultorios) {
    const gridConsultorios = document.getElementById('grid-consultorios');
    if (!gridConsultorios) return;
    
    gridConsultorios.innerHTML = '';
    
    consultorios.forEach(consultorio => {
        const card = document.createElement('div');
        card.className = 'consultorio-card bg-white p-4 rounded-lg border border-gray-200 text-center cursor-pointer';
        card.dataset.consultorio = consultorio.id;
        card.dataset.consultorioNombre = consultorio.nombre;
        
        card.innerHTML = `
            <i class="fas fa-door-closed text-3xl text-[#01983B] mb-2"></i>
            <h4 class="font-semibold text-gray-800">${consultorio.nombre}</h4>
            ${consultorio.descripcion ? `<p class="text-gray-600 text-xs mt-1">${consultorio.descripcion}</p>` : ''}
        `;
        
        card.addEventListener('click', () => {
            if (!sedeSeleccionada) {
                mostrarMensaje('❌ Primero selecciona una sede', true);
                return;
            }
            
            document.querySelectorAll('.consultorio-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            consultorioSeleccionado = consultorio.id;
            mostrarListaChequeoConsultorio();
        });
        
        gridConsultorios.appendChild(card);
    });
}

function mostrarAreasEnGrid(areas) {
    const gridAreas = document.getElementById('grid-areas');
    if (!gridAreas) return;
    
    gridAreas.innerHTML = '';
    
    // Mapeo de iconos por tipo de área
    const iconosPorArea = {
        'espirometria': 'fa-lungs',
        'audiometria': 'fa-ear-deaf',
        'optometria': 'fa-eye',
        'psicologia': 'fa-brain'
    };
    
    areas.forEach(area => {
        const card = document.createElement('div');
        card.className = 'area-card bg-white p-6 rounded-lg border border-gray-200 text-center cursor-pointer';
        card.dataset.area = area.id;
        card.dataset.areaNombre = area.nombre;
        
        // Obtener el icono adecuado
        const icono = iconosPorArea[area.id] || 'fa-microscope';
        
        card.innerHTML = `
            <i class="fas ${icono} text-4xl text-[#639A33] mb-3"></i>
            <h4 class="font-semibold text-gray-800 text-lg mb-2">${area.nombre}</h4>
            <p class="text-gray-600 text-sm">${area.descripcion || 'Área especial médica'}</p>
        `;
        
        card.addEventListener('click', () => {
            if (!sedeSeleccionada) {
                mostrarMensaje('❌ Primero selecciona una sede', true);
                return;
            }
            
            document.querySelectorAll('.area-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            areaEspecialSeleccionada = area.id;
            mostrarListaChequeoArea();
        });
        
        gridAreas.appendChild(card);
    });
}

function llenarSelectConsultorios(consultorios) {
    const select = document.getElementById('select-consultorio-informe');
    if (!select) return;
    
    select.innerHTML = '';
    
    consultorios.forEach(consultorio => {
        const option = document.createElement('option');
        option.value = consultorio.id;
        option.textContent = consultorio.nombre;
        select.appendChild(option);
    });
}

function llenarSelectAreas(areas) {
    const select = document.getElementById('select-area-informe');
    if (!select) return;
    
    const selectArea = document.getElementById('select-area-informe');
    if (!selectArea) return;
    
    selectArea.innerHTML = '';
    
    areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area.id;
        option.textContent = area.nombre;
        selectArea.appendChild(option);
    });
}

function verificarSedeGuardada() {
    try {
        const sedeData = localStorage.getItem('sede_chequeos');
        if (!sedeData) return null;
        
        const sede = JSON.parse(sedeData);
        if (!sede || !sede.id || !sede.nombre) return null;
        
        // Verificar si la selección es reciente (menos de 8 horas)
        if (sede.fecha) {
            const fechaGuardada = new Date(sede.fecha);
            const hoy = new Date();
            const diferenciaHoras = (hoy - fechaGuardada) / (1000 * 60 * 60);
            
            if (diferenciaHoras < 8) {
                return sede;
            } else {
                console.log('ℹ️ Sede guardada expirada (más de 8 horas)');
                localStorage.removeItem('sede_chequeos');
            }
        }
        
        return null;
    } catch (error) {
        console.error('❌ Error verificando sede guardada:', error);
        localStorage.removeItem('sede_chequeos');
        return null;
    }
}

function cambiarSede() {
    console.log('🔄 Cambiando de sede...');
    
    if (!confirm('¿Estás seguro de que quieres cambiar de sede? Se perderán los datos no guardados.')) {
        return;
    }
    
    // Limpiar completamente datos actuales
    consultorioSeleccionado = null;
    areaEspecialSeleccionada = null;
    
    // Resetear formularios activos
    document.querySelectorAll('#lista-chequeo-consultorio, #lista-chequeo-area').forEach(form => {
        form.classList.add('hidden');
    });
    
    // Deseleccionar tarjetas
    document.querySelectorAll('.consultorio-card, .area-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Limpiar inputs de formularios
    const inputs = document.querySelectorAll('#responsable-chequeo, #validado-por, #observaciones-generales, #responsable-chequeo-area, #validado-por-area, #observaciones-generales-area');
    inputs.forEach(input => input.value = '');
    
    // Resetear checkboxes
    document.querySelectorAll('.checkbox-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.checked = true;
            item.classList.add('checked');
        }
    });
    
    // Limpiar tabla de historial
    const tbody = document.getElementById('historial-chequeos-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-clipboard-list text-3xl mb-2 block"></i>
                    Selecciona una sede para ver el historial
                </td>
            </tr>
        `;
    }
    
    // Resetear selects de informes
    document.querySelectorAll('#select-mes-informe, #select-anio-informe').forEach(select => {
        if (select) {
            select.selectedIndex = 0;
        }
    });
    
    // Limpiar localStorage específico de chequeos
    localStorage.removeItem('sede_chequeos');
    
    // Resetear variables globales
    sedeSeleccionada = null;
    historialChequeos = [];
    
    // Ocultar contenido principal
    ocultarContenidoPrincipal();
    
    // Ocultar botón de cambiar sede
    ocultarBotonCambiarSede();
    
    // Mostrar selector de sedes
    mostrarSelectorSedes();
    
    // Mostrar mensaje informativo
    mostrarMensaje('Selecciona una nueva sede para continuar', false);
    
    console.log('✅ Estado limpiado completamente. Mostrando selector de sedes.');
}

function mostrarSelectorSedes() {
    const selectorSede = document.getElementById('selector-sede');
    if (!selectorSede) return;
    
    // Mostrar el selector
    selectorSede.style.display = 'flex';
    
    // Cargar las sedes si no se han cargado
    if (sedesDisponibles.length === 0) {
        cargarSedes();
    } else {
        // Ya tenemos sedes cargadas, solo mostrarlas
        mostrarListaSedes();
    }
}

function ocultarSelectorSede() {
    const selectorSede = document.getElementById('selector-sede');
    if (selectorSede) {
        selectorSede.style.display = 'none';
    }
}

// ========================= FUNCIONES DE INTERFAZ =========================

function ocultarContenidoPrincipal() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.display = 'none';
    }
}

function mostrarContenidoPrincipal() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.display = 'flex';
        mainContent.style.flexDirection = 'column';
    }
}

function actualizarTituloConSede(sedeNombre) {
    const tituloPrincipal = document.getElementById('titulo-principal');
    const subtituloSede = document.getElementById('subtitulo-sede');
    
    if (tituloPrincipal) {
        tituloPrincipal.textContent = `Sistema de Chequeos Diarios - ${sedeNombre}`;
    }
    
    if (subtituloSede) {
        subtituloSede.textContent = `Sede actual: ${sedeNombre}`;
    }
}

function mostrarBotonCambiarSede() {
    const btnCambiarSede = document.getElementById('btn-cambiar-sede');
    if (btnCambiarSede) {
        btnCambiarSede.classList.remove('hidden');
        btnCambiarSede.style.display = 'flex';
    }
}

function ocultarBotonCambiarSede() {
    const btnCambiarSede = document.getElementById('btn-cambiar-sede');
    if (btnCambiarSede) {
        btnCambiarSede.classList.add('hidden');
        btnCambiarSede.style.display = 'none';
    }
}

// ========================= CARGAR DATOS DE SEDE =========================

async function cargarDatosDeSede() {
    if (!sedeSeleccionada) return;
    
    console.log(`📂 Cargando datos para sede: ${sedeSeleccionada.nombre}`);
    
    try {
        // Cargar historial
        await cargarHistorialDesdeBD();
        
        // Inicializar selects después de cargar el historial
        inicializarSelectsFechas();
        configurarInformesCompletos();
        
        console.log(`✅ Datos cargados para sede: ${sedeSeleccionada.nombre}`);
        
    } catch (error) {
        console.error('❌ Error cargando datos de sede:', error);
        mostrarMensaje('⚠️ Error cargando algunos datos de la sede', true);
    }
}

// ========================= FUNCIONES PRINCIPALES =========================

async function cargarHistorialDesdeBD() {
    if (!sedeSeleccionada) {
        console.log('❌ No hay sede seleccionada');
        return;
    }
    
    try {
        console.log(`📂 Cargando historial desde BD para sede: ${sedeSeleccionada.nombre}...`);
        const res = await fetch(`${API_BASE_URL}/chequeos?sede_id=${sedeSeleccionada.id}`);
        
        if (!res.ok) {
            throw new Error('Error al cargar historial');
        }
        
        historialChequeos = await res.json();
        console.log(`✅ Historial cargado: ${historialChequeos.length} registros`);
        cargarHistorialEnTabla();
        
    } catch (err) {
        console.error('❌ Error cargando historial:', err);
        mostrarMensaje('Error cargando historial de chequeos', true);
    }
}

// En la función guardarChequeoEnBD, modifica el objeto chequeoConSede
async function guardarChequeoEnBD(chequeoData) {
    try {
        console.log('📤 Guardando chequeo en BD...', chequeoData);
        
        // Enviar solo los campos que la API espera (no incluir sede_id, sede_nombre, etc.)
        const res = await fetch(`${API_BASE_URL}/chequeos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(chequeoData)
        });

        if (!res.ok) {
            let errorMessage = 'Error al guardar chequeo';
            try {
                const errorData = await res.json();
                console.error('❌ Error del servidor:', errorData);
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
                errorMessage = `Error ${res.status}: ${res.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const result = await res.json();
        console.log('✅ Chequeo guardado en BD:', result.chequeo.id);
        return result.chequeo;
        
    } catch (error) {
        console.error('❌ Error guardando en BD:', error);
        throw error;
    }
}

async function generarYSubirPDFConsultorio() {
    if (!sedeSeleccionada) {
        mostrarMensaje('❌ Primero selecciona una sede', true);
        return;
    }
    
    if (!consultorioSeleccionado) {
        mostrarMensaje('❌ Selecciona un consultorio primero', true);
        return;
    }

    // Verificar que los elementos existen
    const responsableInput = document.getElementById('responsable-chequeo');
    const validadoInput = document.getElementById('validado-por');
    
    if (!responsableInput || !validadoInput) {
        mostrarMensaje('❌ Error: No se encontraron los campos del formulario', true);
        return;
    }

    const responsable = responsableInput.value;
    const validadoPor = validadoInput.value;

    if (!responsable || !validadoPor) {
        mostrarMensaje('❌ Completa todos los campos requeridos', true);
        return;
    }

    try {
        mostrarMensaje('📄 Generando PDF...', false);
        
        const equiposData = obtenerDatosEquiposCompletos('consultorio');
        const pdfBlob = await generarPDFConsultorioBlob();
        await subirPDFCompletado(pdfBlob, 'consultorio', equiposData);
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('❌ Error al procesar: ' + error.message, true);
    }
}

// Nueva función para verificar si ya se hizo el chequeo de entrada
async function verificarChequeoEntrada(tipo, idAreaConsultorio) {
    if (!sedeSeleccionada) return false;
    
    const hoy = new Date().toISOString().split('T')[0];
    
    try {
        const res = await fetch(`${API_BASE_URL}/chequeos/dia?fecha=${hoy}&sede_id=${sedeSeleccionada.id}&tipo=${tipo}&id_area=${idAreaConsultorio}`);
        
        if (res.ok) {
            const chequeosHoy = await res.json();
            
            // Verificar si hay chequeo de entrada
            const chequeoEntrada = chequeosHoy.find(c => c.tipo_chequeo === 'entrada');
            
            // Si es después de las 12 PM y no hay chequeo de entrada, no permitir salida
            const ahora = new Date();
            if (ahora.getHours() >= 12 && !chequeoEntrada) {
                return { permitido: false, motivo: 'Primero debes realizar el chequeo de entrada' };
            }
            
            // Verificar si ya se hizo el chequeo de salida
            const chequeoSalida = chequeosHoy.find(c => c.tipo_chequeo === 'salida');
            if (chequeoSalida) {
                return { permitido: false, motivo: 'Ya se realizó el chequeo de salida hoy' };
            }
            
            return { permitido: true, tieneEntrada: !!chequeoEntrada };
        }
        
        return { permitido: true, tieneEntrada: false };
        
    } catch (error) {
        console.error('Error verificando chequeos:', error);
        return { permitido: true, tieneEntrada: false };
    }
}

async function subirPDFCompletado(pdfBlob, tipo, equiposData) {
    try {
        mostrarMensaje('📤 Subiendo PDF...', false);

        // 1. Subir PDF a Cloudinary
        const archivo = new File([pdfBlob], `chequeo_${tipo}_${sedeSeleccionada.nombre}_${Date.now()}.pdf`, { 
            type: 'application/pdf' 
        });
        const formData = new FormData();
        formData.append('file', archivo);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('resource_type', 'raw');

        console.log('☁️ Subiendo PDF a Cloudinary...');
        const cloudinaryResponse = await fetch(CLOUDINARY_RAW_UPLOAD, {
            method: 'POST',
            body: formData
        });

        if (!cloudinaryResponse.ok) {
            throw new Error(`Error ${cloudinaryResponse.status} al subir PDF a Cloudinary`);
        }

        const cloudinaryData = await cloudinaryResponse.json();
        console.log('✅ PDF subido a Cloudinary:', cloudinaryData.secure_url);

        // 2. Obtener elementos del DOM de manera segura
        let responsable = '';
        let validadoPor = '';
        let observaciones = '';

        if (tipo === 'consultorio') {
            const responsableInput = document.getElementById('responsable-chequeo');
            const validadoInput = document.getElementById('validado-por');
            const observacionesInput = document.getElementById('observaciones-generales');
            
            // Verificar que los elementos existen antes de acceder a .value
            if (responsableInput) responsable = responsableInput.value;
            if (validadoInput) validadoPor = validadoInput.value;
            if (observacionesInput) observaciones = observacionesInput.value;
        } else {
            const responsableInput = document.getElementById('responsable-chequeo-area');
            const validadoInput = document.getElementById('validado-por-area');
            const observacionesInput = document.getElementById('observaciones-generales-area');
            
            if (responsableInput) responsable = responsableInput.value;
            if (validadoInput) validadoPor = validadoInput.value;
            if (observacionesInput) observaciones = observacionesInput.value;
        }

        // 3. Validar campos obligatorios
        if (!responsable || !validadoPor) {
            throw new Error('Los campos Responsable y Validado por son obligatorios');
        }

        // 4. Preparar nombre según tipo
        let nombre = '';
        if (tipo === 'consultorio') {
            const consultorioCard = document.querySelector(`.consultorio-card[data-consultorio="${consultorioSeleccionado}"]`);
            const nombreConsultorio = consultorioCard?.dataset.consultorioNombre || `Consultorio ${consultorioSeleccionado}`;
            nombre = `${nombreConsultorio} - ${sedeSeleccionada.nombre}`;
        } else {
            const areaCard = document.querySelector(`.area-card[data-area="${areaEspecialSeleccionada}"]`);
            const nombreArea = areaCard?.dataset.areaNombre || obtenerNombreArea(areaEspecialSeleccionada);
            nombre = `${nombreArea} - ${sedeSeleccionada.nombre}`;
        }

        // 5. Preparar datos para la API
        const chequeoData = {
            tipo: tipo,
            nombre: nombre,
            responsable: responsable,
            validado_por: validadoPor,
            archivo_url: cloudinaryData.secure_url,
            archivo_public_id: cloudinaryData.public_id,
            observaciones: observaciones || '',
            equipos_chequeados: equiposData.filter(e => e.chequeado).length,
            datos_equipos: JSON.stringify(equiposData),
            mes: new Date().getMonth() + 1,
            año: new Date().getFullYear(),
            id_usuario: 1 // Aquí deberías usar el ID del usuario actual
        };

        console.log('💾 Datos para guardar en BD:', chequeoData);

        // 6. Guardar en BD
        const chequeoBD = await guardarChequeoEnBD(chequeoData);

        // 7. Actualizar interfaz
        if (chequeoBD) {
            historialChequeos.unshift(chequeoBD);
            cargarHistorialEnTabla();
            resetearFormulario(tipo);
            mostrarMensaje(`✅ Chequeo guardado correctamente en ${sedeSeleccionada.nombre}`, false);
            return chequeoBD;
        }

    } catch (error) {
        console.error('❌ Error en subirPDFCompletado:', error);
        mostrarMensaje('❌ Error al guardar chequeo: ' + error.message, true);
        throw error;
    }
}

async function eliminarChequeo(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este chequeo?')) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/chequeos/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            throw new Error('Error al eliminar chequeo');
        }

        historialChequeos = historialChequeos.filter(chequeo => chequeo.id !== id);
        cargarHistorialEnTabla();
        
        mostrarMensaje('✅ Chequeo eliminado correctamente', false);
        
    } catch (err) {
        console.error('❌ Error eliminando chequeo:', err);
        mostrarMensaje('Error al eliminar chequeo', true);
    }
}

// ========================= FUNCIONES PARA CARGAR EQUIPOS =========================

function mostrarListaChequeoConsultorio() {
    const container = document.getElementById('lista-chequeo-consultorio');
    const titulo = document.getElementById('consultorio-seleccionado');
    const equiposContainer = document.getElementById('equipos-consultorio-container');

    
    
    if (container && titulo && equiposContainer) {
        // Obtener nombre del consultorio
        const nombreConsultorio = document.querySelector(`.consultorio-card[data-consultorio="${consultorioSeleccionado}"]`)?.dataset.consultorioNombre || `Consultorio ${consultorioSeleccionado}`;
        
        titulo.textContent = `${nombreConsultorio} - ${sedeSeleccionada.nombre}`;
        container.classList.remove('hidden');

        // Actualizar texto del botón PDF según hora
const ahora = new Date();
const esEntrada = ahora.getHours() < 12;
const tipoChequeo = esEntrada ? 'Entrada' : 'Salida';

const btnPDF = document.getElementById('btn-generar-pdf');
if (btnPDF) {
    btnPDF.innerHTML = `
        <i class="fas fa-file-pdf"></i>
        Generar Chequeo de ${tipoChequeo} PDF
    `;
}
        
        // Cargar equipos para este consultorio y sede
        cargarEquiposConsultorio(consultorioSeleccionado, equiposContainer);
        
        console.log('✅ Formulario de consultorio mostrado para:', nombreConsultorio);
    } else {
        console.error('❌ No se encontró el contenedor del formulario de consultorio');
    }
}

function cargarEquiposConsultorio(consultorioId, container) {
    // Obtener equipos específicos para esta sede y consultorio
    const equiposSede = equiposPorSede[sedeSeleccionada.id];
    
    let equiposBase = [
        'Báscula', 'Linterna', 'Martillo de Reflejos', 'Negatoscopio', 
        'Pulsioxímetro', 'Tensiómetro', 'Fonendoscopio', 'Equipo de Órganos', 'Tallímetro'
    ];
    
    // Si hay equipos específicos para la sede, usarlos
    if (equiposSede && equiposSede.consultorios) {
        // Verificar si hay equipos específicos para este consultorio
        const equiposConsultorio = equiposSede.consultorios[consultorioId];
        if (equiposConsultorio && equiposConsultorio.length > 0) {
            equiposBase = equiposConsultorio;
            console.log(`✅ Usando equipos específicos para consultorio ${consultorioId}:`, equiposBase);
        }
    }
    
    // Solo para consultorio 6 agregar electrocardiograma por defecto
    if (consultorioId === '6' && !equiposBase.includes('Electrocardiograma')) {
        equiposBase.push('Electrocardiograma');
    }
    
    // Generar HTML de equipos
    let html = '';
    equiposBase.forEach(equipo => {
        const equipoId = `consultorio-${consultorioId}-${equipo.toLowerCase().replace(/\s+/g, '-')}`;
        html += `
            <div class="checkbox-item bg-white border border-gray-200 rounded-lg p-4 checked">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <input type="checkbox" id="${equipoId}" 
                               class="h-5 w-5 text-[#01983B] focus:ring-[#01983B] rounded" checked>
                        <label for="${equipoId}" class="text-gray-700 font-medium">${equipo}</label>
                    </div>
                    <div class="flex space-x-2">
                        <select class="estado-equipo border border-gray-300 rounded px-3 py-1 text-sm">
                            <option value="optimo">Óptimo</option>
                            <option value="regular">Regular</option>
                            <option value="defectuoso">Defectuoso</option>
                        </select>
                        <input type="text" placeholder="Observaciones" class="observaciones border border-gray-300 rounded px-3 py-1 text-sm w-40">
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function mostrarListaChequeoArea() {
    const container = document.getElementById('lista-chequeo-area');
    const titulo = document.getElementById('area-seleccionada');
    const equiposContainer = document.getElementById('equipos-area-container');
    
    if (container && titulo && equiposContainer) {
        // Obtener nombre del área
        const nombreArea = document.querySelector(`.area-card[data-area="${areaEspecialSeleccionada}"]`)?.dataset.areaNombre || obtenerNombreArea(areaEspecialSeleccionada);
        
        titulo.textContent = `${nombreArea} - ${sedeSeleccionada.nombre}`;
        container.classList.remove('hidden');
        cargarEquiposAreaEspecial(areaEspecialSeleccionada, equiposContainer);

        // Actualizar texto del botón PDF según hora
const ahora = new Date();
const esEntrada = ahora.getHours() < 12;
const tipoChequeo = esEntrada ? 'Entrada' : 'Salida';

const btnPDFArea = document.getElementById('btn-generar-pdf-area');
if (btnPDFArea) {
    btnPDFArea.innerHTML = `
        <i class="fas fa-file-pdf"></i>
        Generar Chequeo de ${tipoChequeo} PDF
    `;
}
    }
}

function cargarEquiposAreaEspecial(area, container) {
    // Obtener equipos específicos para esta sede y área
    const equiposSede = equiposPorSede[sedeSeleccionada.id];
    
    // Equipos por defecto por tipo de área
    const equiposPorAreaDefault = {
        'espirometria': ['Espirómetro', 'Báscula'],
        'audiometria': ['Audiómetro', 'Cabina Audiométrica', 'Equipo de organos'],
        'optometria': [
            'Autorref-Keratómetro', 'Forópter', 'Lámpara de Hendidura', 'Lensómetro',
            'Oftalmoscopio', 'Pantalla Tangente', 'Proyector Opto Tipos', 'Retinoscopio',
            'Test Ishihara', 'Transluminador', 'Unidad de Refracción', 'Visiómetro', 'Caja de lentes de prueba'
        ],
        'psicologia': ['Polireactímetro 1', 'Polireactímetro 2']
    };
    
    let equipos = equiposPorAreaDefault[area] || [];
    
    // Si hay equipos específicos para la sede, usarlos
    if (equiposSede && equiposSede.areas) {
        // Verificar si hay equipos específicos para esta área
        const equiposArea = equiposSede.areas[area];
        if (equiposArea && equiposArea.length > 0) {
            equipos = equiposArea;
            console.log(`✅ Usando equipos específicos para área ${area}:`, equipos);
        }
    }
    
    let html = `<h4 class="font-semibold text-gray-800 mb-4 text-lg">Equipos del Área</h4><div class="space-y-3">`;
    
    equipos.forEach(equipo => {
        const equipoId = `${area}-${equipo.toLowerCase().replace(/\s+/g, '-')}`;
        html += `
            <div class="checkbox-item bg-white border border-gray-200 rounded-lg p-4 checked">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <input type="checkbox" id="${equipoId}" 
                               class="h-5 w-5 text-[#639A33] focus:ring-[#639A33] rounded" checked>
                        <label for="${equipoId}" class="text-gray-700 font-medium">${equipo}</label>
                    </div>
                    <div class="flex space-x-2">
                        <select class="estado-equipo border border-gray-300 rounded px-3 py-1 text-sm">
                            <option value="optimo">Óptimo</option>
                            <option value="regular">Regular</option>
                            <option value="defectuoso">Defectuoso</option>
                        </select>
                        <input type="text" placeholder="Observaciones" class="observaciones border border-gray-300 rounded px-3 py-1 text-sm w-40">
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

// ========================= FUNCIONES DE CONFIGURACIÓN =========================

function cargarFechaActual() {
    const fecha = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
    
    document.querySelectorAll('#fecha-actual, #fecha-actual-area').forEach(elemento => {
        elemento.textContent = fecha;
    });
}

function configurarTabs() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
            
            button.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.remove('hidden');
            
            if (targetTab === 'historial-chequeos') {
                cargarHistorialEnTabla();
            }
        });
    });
}

function configurarEventos() {
    // Botón para cambiar sede
    const btnCambiarSede = document.getElementById('btn-cambiar-sede');
    if (btnCambiarSede) {
        btnCambiarSede.addEventListener('click', cambiarSede);
        console.log('✅ Botón cambiar sede configurado');
    }
    
    // Checkboxes
    document.addEventListener('change', function (e) {
        if (e.target.type === 'checkbox') {
            const item = e.target.closest('.checkbox-item');
            if (item) {
                item.classList.toggle('checked', e.target.checked);
            }
        }
    });

    // Botones de generación PDF
    document.getElementById('btn-generar-pdf')?.addEventListener('click', generarYSubirPDFConsultorio);
    document.getElementById('btn-generar-pdf-area')?.addEventListener('click', generarYSubirPDFArea);

    // Botones de historial
    document.getElementById('btn-ver-historial-consultorio')?.addEventListener('click', mostrarHistorialConsultorio);
    document.getElementById('btn-ver-historial-area')?.addEventListener('click', mostrarHistorialArea);

    // Configurar informes mensuales
    configurarInformesMensuales();
    
    // Configurar informes completos
    configurarInformesCompletos();
}

function configurarInformesMensuales() {
    // Cambio entre consultorio y área
    document.querySelectorAll('input[name="tipo-informe"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const tipo = this.value;
            document.getElementById('consultorio-informe-container').classList.toggle('hidden', tipo !== 'consultorio');
            document.getElementById('area-informe-container').classList.toggle('hidden', tipo !== 'area');
        });
    });
}

function configurarInformesCompletos() {
    // Selección de tipo de informe completo
    document.querySelectorAll('.tipo-informe-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.tipo-informe-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            tipoInformeCompletoSeleccionado = this.getAttribute('data-tipo');
            actualizarInfoInformeCompleto();
        });
    });

    // Inicializar información del informe
    actualizarInfoInformeCompleto();
}

function actualizarInfoInformeCompleto() {
    const titulo = document.getElementById('titulo-informe-completo');
    const descripcion = document.getElementById('descripcion-informe-completo');
    
    const info = {
        'todos-consultorios': {
            titulo: 'Informe de Todos los Consultorios',
            descripcion: 'Incluye todos los chequeos de consultorios del mes seleccionado'
        },
        'todas-areas': {
            titulo: 'Informe de Todas las Áreas Especiales',
            descripcion: 'Incluye todos los chequeos de áreas especiales del mes seleccionado'
        },
        'completo': {
            titulo: 'Informe Completo Mensual',
            descripcion: 'Incluye todos los chequeos (consultorios + áreas) del mes seleccionado'
        }
    };

    const infoSeleccionada = info[tipoInformeCompletoSeleccionado] || info.completo;
    titulo.textContent = infoSeleccionada.titulo;
    descripcion.textContent = infoSeleccionada.descripcion;
}

// ========================= FUNCIONES AUXILIARES =========================

function obtenerNombreArea(area) {
    const areas = {
        'espirometria': 'Espirometría',
        'audiometria': 'Audiometría', 
        'optometria': 'Optometría',
        'psicologia': 'Psicología'
    };
    return areas[area] || area;
}

function resetearFormulario(tipo) {
    if (tipo === 'consultorio') {
        document.getElementById('responsable-chequeo').value = '';
        document.getElementById('validado-por').value = '';
        document.getElementById('observaciones-generales').value = '';
        
        document.querySelectorAll('#lista-chequeo-consultorio input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = true;
            checkbox.closest('.checkbox-item').classList.add('checked');
        });
        
    } else {
        document.getElementById('responsable-chequeo-area').value = '';
        document.getElementById('validado-por-area').value = '';
        document.getElementById('observaciones-generales-area').value = '';
        
        document.querySelectorAll('#lista-chequeo-area input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = true;
            checkbox.closest('.checkbox-item').classList.add('checked');
        });
    }
}

function mostrarMensaje(texto, esError = false) {
    const mensajesExistentes = document.querySelectorAll('.status-message');
    mensajesExistentes.forEach(msg => msg.remove());

    const mensaje = document.createElement('div');
    mensaje.className = `status-message ${esError ? 'status-error' : 'status-success'}`;
    mensaje.textContent = texto;

    document.body.appendChild(mensaje);

    setTimeout(() => {
        if (mensaje.parentNode) {
            mensaje.parentNode.removeChild(mensaje);
        }
    }, 3000);
}

// ========================= FUNCIONES DE HISTORIAL =========================

// En cargarHistorialEnTabla, modifica para agrupar por día
function cargarHistorialEnTabla() {
    const tbody = document.getElementById('historial-chequeos-body');
    
    if (!tbody) return;

    if (!sedeSeleccionada) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    Selecciona una sede para ver el historial
                </td>
            </tr>
        `;
        return;
    }

    // Agrupar chequeos por día y área/consultorio
    const historialAgrupado = {};
    
    historialChequeos.forEach(chequeo => {
        if (chequeo.sede_id !== sedeSeleccionada.id) return;
        
        const fechaDia = chequeo.fecha_dia || chequeo.fecha.split('T')[0];
        const clave = `${fechaDia}-${chequeo.nombre}`;
        
        if (!historialAgrupado[clave]) {
            historialAgrupado[clave] = {
                fecha: fechaDia,
                nombre: chequeo.nombre,
                tipo: chequeo.tipo,
                entrada: null,
                salida: null,
                completo: false
            };
        }
        
        if (chequeo.tipo_chequeo === 'entrada') {
            historialAgrupado[clave].entrada = chequeo;
        } else if (chequeo.tipo_chequeo === 'salida') {
            historialAgrupado[clave].salida = chequeo;
        }
        
        historialAgrupado[clave].completo = historialAgrupado[clave].entrada && historialAgrupado[clave].salida;
    });

    // Convertir a array y ordenar por fecha
    const historialArray = Object.values(historialAgrupado).sort((a, b) => 
        new Date(b.fecha) - new Date(a.fecha)
    );

    if (historialArray.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    No hay chequeos registrados en esta sede
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = historialArray.map(item => {
        const fechaFormateada = new Date(item.fecha).toLocaleDateString('es-ES');
        const tipoIcon = item.tipo === 'consultorio' ? 'fa-door-closed' : 'fa-microscope';
        const tipoColor = item.tipo === 'consultorio' ? 'blue' : 'green';
        
        return `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-4 py-3">${fechaFormateada}</td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <i class="fas ${tipoIcon} text-${tipoColor}-500"></i>
                        <span>${item.nombre}</span>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex flex-col gap-1">
                        ${item.entrada ? 
                            `<span class="text-xs text-green-600">✓ Entrada: ${item.entrada.responsable}</span>` : 
                            `<span class="text-xs text-red-600">✗ Sin entrada</span>`}
                        ${item.salida ? 
                            `<span class="text-xs text-green-600">✓ Salida: ${item.salida.responsable}</span>` : 
                            `<span class="text-xs text-red-600">✗ Sin salida</span>`}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <span class="badge-estado ${item.completo ? 'badge-completado' : 'badge-pendiente'}">
                        ${item.completo ? 'Completo' : 'Incompleto'}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex gap-2">
                        ${item.entrada ? 
                            `<button onclick="previsualizarPDF('${item.entrada.archivo_url}')" 
                                    class="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded border border-blue-200 hover:bg-blue-50">
                                <i class="fas fa-eye"></i> Entrada
                            </button>` : ''}
                        ${item.salida ? 
                            `<button onclick="previsualizarPDF('${item.salida.archivo_url}')" 
                                    class="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded border border-green-200 hover:bg-green-50">
                                <i class="fas fa-eye"></i> Salida
                            </button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function mostrarHistorialConsultorio() {
    if (!sedeSeleccionada) {
        mostrarMensaje('❌ Primero selecciona una sede', true);
        return;
    }
    
    if (!consultorioSeleccionado) {
        mostrarMensaje('❌ Selecciona un consultorio primero', true);
        return;
    }
    
    const nombreConsultorio = `Consultorio ${consultorioSeleccionado} - ${sedeSeleccionada.nombre}`;
    const chequeosFiltrados = historialChequeos.filter(chequeo => 
        chequeo.tipo === 'consultorio' && 
        chequeo.nombre === nombreConsultorio &&
        chequeo.sede_id === sedeSeleccionada.id
    );
    
    mostrarHistorialEnModal(chequeosFiltrados, `Historial - ${nombreConsultorio}`);
}

function mostrarHistorialArea() {
    if (!sedeSeleccionada) {
        mostrarMensaje('❌ Primero selecciona una sede', true);
        return;
    }
    
    if (!areaEspecialSeleccionada) {
        mostrarMensaje('❌ Selecciona un área primero', true);
        return;
    }
    
    const nombreArea = `${obtenerNombreArea(areaEspecialSeleccionada)} - ${sedeSeleccionada.nombre}`;
    const chequeosFiltrados = historialChequeos.filter(chequeo => 
        chequeo.tipo === 'area' && 
        chequeo.nombre === nombreArea &&
        chequeo.sede_id === sedeSeleccionada.id
    );
    
    mostrarHistorialEnModal(chequeosFiltrados, `Historial - ${nombreArea}`);
}

function mostrarHistorialEnModal(chequeos, titulo) {
    // Crear modal si no existe
    let modal = document.getElementById('modal-historial');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-historial';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-11/12 max-w-6xl max-h-[90vh] flex flex-col">
                <div class="flex justify-between items-center p-6 border-b">
                    <h3 class="text-xl font-semibold text-gray-800" id="modal-titulo">${titulo}</h3>
                    <button onclick="cerrarModalHistorial()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto flex-1">
                    <div class="mb-4">
                        <p class="text-gray-600" id="modal-subtitulo">
                            ${chequeos.length} registros encontrados
                        </p>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Responsable</th>
                                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Validado Por</th>
                                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Equipos</th>
                                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="modal-historial-body" class="bg-white divide-y divide-gray-200">
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <span class="text-sm text-gray-600" id="modal-contador">
                        Mostrando ${chequeos.length} registros
                    </span>
                    <button onclick="cerrarModalHistorial()" 
                            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Actualizar título y contenido
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-subtitulo').textContent = `${chequeos.length} registros encontrados`;
    
    // Cargar tabla
    cargarTablaModal(chequeos);
    
    // Mostrar modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function cargarTablaModal(chequeos) {
    const tbody = document.getElementById('modal-historial-body');
    const contador = document.getElementById('modal-contador');
    
    if (chequeos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-clipboard-list text-3xl mb-2 block"></i>
                    No hay registros para mostrar
                </td>
            </tr>
        `;
        contador.textContent = 'No hay registros';
        return;
    }

    tbody.innerHTML = chequeos.map(chequeo => {
        const fecha = new Date(chequeo.fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 whitespace-nowrap">${fecha}</td>
                <td class="px-4 py-3">${chequeo.responsable}</td>
                <td class="px-4 py-3">${chequeo.validado_por || 'No especificado'}</td>
                <td class="px-4 py-3">
                    <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                        ${chequeo.equipos_chequeados} equipos
                    </span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex gap-2">
                        <button onclick="previsualizarPDF('${chequeo.archivo_url}')" 
                                class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button onclick="descargarChequeo('${chequeo.archivo_url}', 'chequeo_${chequeo.tipo}_${chequeo.id}.pdf')" 
                                class="text-green-600 hover:text-green-800 text-sm flex items-center gap-1 px-3 py-1 rounded border border-green-200 hover:bg-green-50 transition-colors">
                            <i class="fas fa-download"></i> Descargar
                        </button>
                        <button onclick="eliminarChequeoModal(${chequeo.id})" 
                                class="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 px-3 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    contador.textContent = `Mostrando ${chequeos.length} registros`;
}

async function eliminarChequeoModal(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este chequeo?')) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/chequeos/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            throw new Error('Error al eliminar chequeo');
        }

        // Actualizar historial global
        historialChequeos = historialChequeos.filter(chequeo => chequeo.id !== id);
        
        // Cerrar modal y mostrar mensaje
        cerrarModalHistorial();
        cargarHistorialEnTabla();
        
        mostrarMensaje('✅ Chequeo eliminado correctamente', false);
        
    } catch (err) {
        console.error('❌ Error eliminando chequeo:', err);
        mostrarMensaje('Error al eliminar chequeo', true);
    }
}

function cerrarModalHistorial() {
    const modal = document.getElementById('modal-historial');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// ========================= FUNCIONES DE PDF =========================

function previsualizarPDF(url) {
    window.open(url, '_blank');
}

async function descargarChequeo(url, nombreArchivo) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        mostrarMensaje('✅ Chequeo descargado', false);
        
    } catch (error) {
        console.error('❌ Error descargando:', error);
        mostrarMensaje('❌ Error al descargar', true);
    }
}

function obtenerDatosEquiposCompletos(tipo) {
    const contenedor = tipo === 'consultorio' ? 
        document.getElementById('lista-chequeo-consultorio') : 
        document.getElementById('lista-chequeo-area');
    
    const equiposData = [];
    const items = contenedor.querySelectorAll('.checkbox-item');
    
    items.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const label = item.querySelector('label').textContent;
        const estado = item.querySelector('.estado-equipo').value;
        const observaciones = item.querySelector('.observaciones').value;
        
        equiposData.push({
            equipo: label,
            estado: estado,
            observaciones: observaciones || 'Sin observaciones',
            chequeado: checkbox.checked
        });
    });
    
    return equiposData;
}

async function generarYSubirPDFConsultorio() {
    if (!sedeSeleccionada) {
        mostrarMensaje('❌ Primero selecciona una sede', true);
        return;
    }
    
    if (!consultorioSeleccionado) {
        mostrarMensaje('❌ Selecciona un consultorio primero', true);
        return;
    }

    // Validar si se puede hacer el chequeo
    const validacion = await verificarChequeoEntrada('consultorio', consultorioSeleccionado);
    if (!validacion.permitido) {
        mostrarMensaje(`❌ ${validacion.motivo}`, true);
        return;
    }

    const responsable = document.getElementById('responsable-chequeo').value;
    const validadoPor = document.getElementById('validado-por').value;

    if (!responsable || !validadoPor) {
        mostrarMensaje('❌ Completa todos los campos requeridos', true);
        return;
    }

    try {
        mostrarMensaje('📄 Generando PDF...', false);
        
        const equiposData = obtenerDatosEquiposCompletos('consultorio');
        const pdfBlob = await generarPDFConsultorioBlob();
        await subirPDFCompletado(pdfBlob, 'consultorio', equiposData);
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('❌ Error al procesar: ' + error.message, true);
    }
}

async function generarYSubirPDFArea() {
    if (!sedeSeleccionada) {
        mostrarMensaje('❌ Primero selecciona una sede', true);
        return;
    }
    
    if (!areaEspecialSeleccionada) {
        mostrarMensaje('❌ Selecciona un área primero', true);
        return;
    }

    // Validar si se puede hacer el chequeo
    const validacion = await verificarChequeoEntrada('area', areaEspecialSeleccionada);
    if (!validacion.permitido) {
        mostrarMensaje(`❌ ${validacion.motivo}`, true);
        return;
    }

    const responsable = document.getElementById('responsable-chequeo-area').value;
    const validadoPor = document.getElementById('validado-por-area').value;

    if (!responsable || !validadoPor) {
        mostrarMensaje('❌ Completa todos los campos requeridos', true);
        return;
    }

    try {
        mostrarMensaje('📄 Generando PDF...', false);
        
        const equiposData = obtenerDatosEquiposCompletos('area');
        const pdfBlob = await generarPDFAreaBlob();
        await subirPDFCompletado(pdfBlob, 'area', equiposData);
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('❌ Error al procesar: ' + error.message, true);
    }
}

async function generarYSubirPDFArea() {
    if (!sedeSeleccionada) {
        mostrarMensaje('❌ Primero selecciona una sede', true);
        return;
    }
    
    if (!areaEspecialSeleccionada) {
        mostrarMensaje('❌ Selecciona un área primero', true);
        return;
    }

    const responsable = document.getElementById('responsable-chequeo-area').value;
    const validadoPor = document.getElementById('validado-por-area').value;

    if (!responsable || !validadoPor) {
        mostrarMensaje('❌ Completa todos los campos requeridos', true);
        return;
    }

    try {
        mostrarMensaje('📄 Generando PDF...', false);
        
        const equiposData = obtenerDatosEquiposCompletos('area');
        const pdfBlob = await generarPDFAreaBlob();
        await subirPDFCompletado(pdfBlob, 'area', equiposData);
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('❌ Error al procesar: ' + error.message, true);
    }
}

async function generarPDFConsultorioBlob() {
    const responsable = document.getElementById('responsable-chequeo').value;
    const validadoPor = document.getElementById('validado-por').value;
    const observaciones = document.getElementById('observaciones-generales').value;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // Encabezado con información de la sede
    doc.setFillColor(1, 152, 59);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA DE CHEQUEO DIARIO - CONSULTORIO', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Sede: ${sedeSeleccionada.nombre}`, pageWidth / 2, 17, { align: 'center' });
    
    // Obtener nombre del consultorio
    const nombreConsultorio = document.querySelector(`.consultorio-card[data-consultorio="${consultorioSeleccionado}"]`)?.dataset.consultorioNombre || `Consultorio ${consultorioSeleccionado}`;
    doc.text(`${nombreConsultorio}`, pageWidth / 2, 22, { align: 'center' });

    // Agregar tipo de chequeo (entrada/salida)
const ahora = new Date();
const tipoChequeo = ahora.getHours() < 12 ? 'ENTRADA' : 'SALIDA';
doc.text(`Tipo de Chequeo: ${tipoChequeo}`, pageWidth / 2, 27, { align: 'center' });

    yPosition = 32;

    // Información adicional
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 15, yPosition);
    doc.text(`Hora: ${new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}`, pageWidth - 15, yPosition, { align: 'right' });

    yPosition += 10;

    // Información del responsable y validado por
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN GENERAL:', 15, yPosition);

    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Responsable: ${responsable}`, 20, yPosition);

    yPosition += 5;
    doc.text(`Validado por: ${validadoPor}`, 20, yPosition);

    yPosition += 5;
    if (observaciones) {
        doc.text(`Observaciones: ${observaciones}`, 20, yPosition);
        yPosition += 7;
    } else {
        yPosition += 2;
    }

    // Tabla de equipos
    const headers = [['Equipo', 'Estado', 'Observaciones', 'Chequeado']];
    const rows = [];

    const equipos = document.querySelectorAll('#lista-chequeo-consultorio .checkbox-item');
    equipos.forEach(item => {
        const label = item.querySelector('label').textContent;
        const estado = item.querySelector('.estado-equipo').value;
        const observaciones = item.querySelector('.observaciones').value || '-';
        const checked = item.querySelector('input[type="checkbox"]').checked;

        rows.push([
            label,
            estado.toUpperCase(),
            observaciones,
            checked ? 'SÍ' : 'NO'
        ]);
    });

    // Agregar tabla
    doc.autoTable({
        startY: yPosition + 5,
        head: headers,
        body: rows,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [1, 152, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        margin: { left: 15, right: 15 }
    });

    // Pie de página
    const finalY = doc.lastAutoTable.finalY + 10;
    if (finalY < pageHeight - 20) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado el: ${new Date().toLocaleString('es-ES')} - Sistema de Gestión de Inventarios IPS Progresando - Sede: ${sedeSeleccionada.nombre}`,
            pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    return doc.output('blob');
}

async function generarPDFAreaBlob() {
    const responsable = document.getElementById('responsable-chequeo-area').value;
    const validadoPor = document.getElementById('validado-por-area').value;
    const observaciones = document.getElementById('observaciones-generales-area').value;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // Encabezado con información de la sede
    doc.setFillColor(99, 154, 51);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA DE CHEQUEO DIARIO - ÁREA ESPECIAL', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Sede: ${sedeSeleccionada.nombre}`, pageWidth / 2, 17, { align: 'center' });
    
    // Obtener nombre del área
    const nombreArea = document.querySelector(`.area-card[data-area="${areaEspecialSeleccionada}"]`)?.dataset.areaNombre || obtenerNombreArea(areaEspecialSeleccionada);
    doc.text(`Área: ${nombreArea}`, pageWidth / 2, 22, { align: 'center' });

    const ahora = new Date();
const tipoChequeo = ahora.getHours() < 12 ? 'ENTRADA' : 'SALIDA';
doc.text(`Tipo de Chequeo: ${tipoChequeo}`, pageWidth / 2, 27, { align: 'center' });

    yPosition = 32;

    // Información adicional
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 15, yPosition);
    doc.text(`Hora: ${new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}`, pageWidth - 15, yPosition, { align: 'right' });

    yPosition += 10;

    // Información del responsable y validado por
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN GENERAL:', 15, yPosition);

    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Responsable: ${responsable}`, 20, yPosition);

    yPosition += 5;
    doc.text(`Validado por: ${validadoPor}`, 20, yPosition);

    yPosition += 5;
    if (observaciones) {
        doc.text(`Observaciones: ${observaciones}`, 20, yPosition);
        yPosition += 7;
    } else {
        yPosition += 2;
    }

    // Tabla de equipos
    const headers = [['Equipo', 'Estado', 'Observaciones', 'Chequeado']];
    const rows = [];

    const equipos = document.querySelectorAll('#lista-chequeo-area .checkbox-item');
    equipos.forEach(item => {
        const label = item.querySelector('label').textContent;
        const estado = item.querySelector('.estado-equipo').value;
        const observaciones = item.querySelector('.observaciones').value || '-';
        const checked = item.querySelector('input[type="checkbox"]').checked;

        rows.push([
            label,
            estado.toUpperCase(),
            observaciones,
            checked ? 'SÍ' : 'NO'
        ]);
    });

    // Agregar tabla
    doc.autoTable({
        startY: yPosition + 5,
        head: headers,
        body: rows,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [99, 154, 51],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        margin: { left: 15, right: 15 }
    });

    // Pie de página
    const finalY = doc.lastAutoTable.finalY + 10;
    if (finalY < pageHeight - 20) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado el: ${new Date().toLocaleString('es-ES')} - Sistema de Gestión de Inventarios IPS Progresando - Sede: ${sedeSeleccionada.nombre}`,
            pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    return doc.output('blob');
}

// ========================= FUNCIONES DE INFORMES MENSUALES =========================

function inicializarSelectsFechas() {
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Llenar selects de meses
    document.querySelectorAll('#select-mes-informe, #select-mes-informe-completo').forEach(select => {
        select.innerHTML = '';
        meses.forEach((mes, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = mes;
            option.selected = (index + 1) === (new Date().getMonth() + 1);
            select.appendChild(option);
        });
    });

    // Llenar selects de años
    llenarSelectAnios('select-anio-informe');
    llenarSelectAnios('select-anio-informe-completo');
}



// Agregar esta función para mostrar badges de estado
async function actualizarEstadoChequeos() {
    if (!sedeSeleccionada) return;
    
    const hoy = new Date().toISOString().split('T')[0];
    
    try {
        // Actualizar estado de consultorios
        const consultorios = document.querySelectorAll('.consultorio-card');
        for (const card of consultorios) {
            const consultorioId = card.dataset.consultorio;
            const consultorioNombre = card.dataset.consultorioNombre;
            
            // Filtrar chequeos para este consultorio hoy
            const chequeosHoy = historialChequeos.filter(chequeo => {
                const fechaChequeo = chequeo.fecha_dia || chequeo.fecha.split('T')[0];
                return fechaChequeo === hoy && 
                       chequeo.sede_id === sedeSeleccionada.id &&
                       chequeo.tipo === 'consultorio' &&
                       chequeo.nombre.includes(consultorioNombre || consultorioId);
            });
            
            // Buscar elemento para mostrar estado
            let estadoElement = card.querySelector('.estado-chequeo');
            if (!estadoElement) {
                estadoElement = document.createElement('div');
                estadoElement.className = 'estado-chequeo mt-2';
                card.appendChild(estadoElement);
            }
            
            if (chequeosHoy.length === 0) {
                estadoElement.innerHTML = '<span class="badge-estado badge-pendiente">Pendiente</span>';
            } else if (chequeosHoy.length === 1) {
                const tipo = chequeosHoy[0].tipo_chequeo;
                const badgeClass = tipo === 'entrada' ? 'badge-entrada' : 'badge-salida';
                estadoElement.innerHTML = `<span class="badge-estado ${badgeClass}">${tipo}</span>`;
            } else if (chequeosHoy.length === 2) {
                estadoElement.innerHTML = '<span class="badge-estado badge-completado">Completo</span>';
            }
        }
        
        // Actualizar estado de áreas (similar)
        const areas = document.querySelectorAll('.area-card');
        for (const card of areas) {
            const areaId = card.dataset.area;
            const areaNombre = card.dataset.areaNombre;
            
            const chequeosHoy = historialChequeos.filter(chequeo => {
                const fechaChequeo = chequeo.fecha_dia || chequeo.fecha.split('T')[0];
                return fechaChequeo === hoy && 
                       chequeo.sede_id === sedeSeleccionada.id &&
                       chequeo.tipo === 'area' &&
                       chequeo.nombre.includes(areaNombre || areaId);
            });
            
            let estadoElement = card.querySelector('.estado-chequeo');
            if (!estadoElement) {
                estadoElement = document.createElement('div');
                estadoElement.className = 'estado-chequeo mt-2';
                card.appendChild(estadoElement);
            }
            
            if (chequeosHoy.length === 0) {
                estadoElement.innerHTML = '<span class="badge-estado badge-pendiente">Pendiente</span>';
            } else if (chequeosHoy.length === 1) {
                const tipo = chequeosHoy[0].tipo_chequeo;
                const badgeClass = tipo === 'entrada' ? 'badge-entrada' : 'badge-salida';
                estadoElement.innerHTML = `<span class="badge-estado ${badgeClass}">${tipo}</span>`;
            } else if (chequeosHoy.length === 2) {
                estadoElement.innerHTML = '<span class="badge-estado badge-completado">Completo</span>';
            }
        }
        
    } catch (error) {
        console.error('Error actualizando estado:', error);
    }
}

// Llamar a esta función después de cargar datos y periódicamente
setInterval(actualizarEstadoChequeos, 30000); // Cada 30 segundos
function llenarSelectAnios(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Obtener años únicos del historial filtrados por sede
    const añosUnicos = [...new Set(historialChequeos
        .filter(chequeo => chequeo.sede_id === sedeSeleccionada?.id)
        .map(chequeo => chequeo.año)
    )];
    
    if (añosUnicos.length === 0) {
        añosUnicos.push(new Date().getFullYear());
    }

    añosUnicos.sort((a, b) => b - a);

    select.innerHTML = '';
    añosUnicos.forEach(año => {
        const option = document.createElement('option');
        option.value = año;
        option.textContent = año;
        option.selected = año === new Date().getFullYear();
        select.appendChild(option);
    });
}

async function generarPDFInformeMensual() {
    try {
        if (!sedeSeleccionada) {
            mostrarMensaje('❌ Primero selecciona una sede', true);
            return;
        }
        
        const tipo = document.querySelector('input[name="tipo-informe"]:checked').value;
        const mes = parseInt(document.getElementById('select-mes-informe').value);
        const año = parseInt(document.getElementById('select-anio-informe').value);
        
        let nombre = '';
        let nombreMostrar = '';
        
        if (tipo === 'consultorio') {
            const consultorioId = document.getElementById('select-consultorio-informe').value;
            const consultorio = document.querySelector(`.consultorio-card[data-consultorio="${consultorioId}"]`);
            nombreMostrar = consultorio?.dataset.consultorioNombre || `Consultorio ${consultorioId}`;
            nombre = `${nombreMostrar} - ${sedeSeleccionada.nombre}`;
        } else {
            const areaId = document.getElementById('select-area-informe').value;
            const area = document.querySelector(`.area-card[data-area="${areaId}"]`);
            nombreMostrar = area?.dataset.areaNombre || obtenerNombreArea(areaId);
            nombre = `${nombreMostrar} - ${sedeSeleccionada.nombre}`;
        }

        if (!nombre || !mes || !año) {
            mostrarMensaje('❌ Completa todos los campos del informe', true);
            return;
        }

        // Obtener chequeos filtrados del historial local
        const chequeosFiltrados = historialChequeos.filter(chequeo => 
            chequeo.tipo === tipo && 
            chequeo.nombre === nombre && 
            chequeo.mes === mes && 
            chequeo.año === año &&
            chequeo.sede_id === sedeSeleccionada.id
        );

        if (chequeosFiltrados.length === 0) {
            mostrarMensaje('❌ No hay chequeos registrados para los filtros seleccionados', true);
            return;
        }

        mostrarMensaje('📊 Uniendo PDFs del informe...', false);

        // Crear PDF unido usando PDF-Lib
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        // Descargar y unir cada PDF
        for (let i = 0; i < chequeosFiltrados.length; i++) {
            const chequeo = chequeosFiltrados[i];
            try {
                mostrarMensaje(`📥 Descargando PDF ${i + 1} de ${chequeosFiltrados.length}...`, false);

                // Descargar el PDF
                const response = await fetch(chequeo.archivo_url);
                const pdfBytes = await response.arrayBuffer();

                // Cargar el PDF
                const pdf = await PDFDocument.load(pdfBytes);

                // Copiar todas las páginas al PDF unido
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));

            } catch (error) {
                console.error(`Error procesando PDF ${i + 1}:`, error);
                mostrarMensaje(`⚠️ Error con PDF ${i + 1}, continuando...`, true);
            }
        }

        // Guardar el PDF unido
        const mergedPdfBytes = await mergedPdf.save();

        // Crear blob y descargar
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const nombreArchivo = `informe_${nombreMostrar.replace(/\s+/g, '_')}_${sedeSeleccionada.nombre.replace(/\s+/g, '_')}_${mes}_${año}.pdf`;
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpiar URL
        setTimeout(() => URL.revokeObjectURL(url), 100);

        mostrarMensaje(`✅ PDF unido generado con ${chequeosFiltrados.length} listas de chequeo`, false);

    } catch (error) {
        console.error('❌ Error uniendo PDFs:', error);
        mostrarMensaje('❌ Error al unir PDFs: ' + error.message, true);
    }
}

async function generarInformeMensualCompleto() {
    try {
        if (!sedeSeleccionada) {
            mostrarMensaje('❌ Primero selecciona una sede', true);
            return;
        }
        
        const mes = parseInt(document.getElementById('select-mes-informe-completo').value);
        const año = parseInt(document.getElementById('select-anio-informe-completo').value);

        if (!mes || !año) {
            mostrarMensaje('❌ Selecciona mes y año', true);
            return;
        }

        // Obtener todos los chequeos del mes y sede
        const todosChequeos = historialChequeos.filter(chequeo => 
            chequeo.mes === mes && chequeo.año === año && chequeo.sede_id === sedeSeleccionada.id
        );

        if (todosChequeos.length === 0) {
            mostrarMensaje('❌ No hay chequeos registrados para el mes seleccionado', true);
            return;
        }

        // Filtrar según el tipo de informe completo seleccionado
        let chequeosFiltrados = [];
        let nombreArchivo = '';

        switch (tipoInformeCompletoSeleccionado) {
            case 'todos-consultorios':
                chequeosFiltrados = todosChequeos.filter(chequeo => chequeo.tipo === 'consultorio');
                nombreArchivo = `informe_consultorios_${sedeSeleccionada.nombre.replace(/\s+/g, '_')}_${mes}_${año}.pdf`;
                break;
            case 'todas-areas':
                chequeosFiltrados = todosChequeos.filter(chequeo => chequeo.tipo === 'area');
                nombreArchivo = `informe_areas_${sedeSeleccionada.nombre.replace(/\s+/g, '_')}_${mes}_${año}.pdf`;
                break;
            case 'completo':
                chequeosFiltrados = todosChequeos;
                nombreArchivo = `informe_completo_${sedeSeleccionada.nombre.replace(/\s+/g, '_')}_${mes}_${año}.pdf`;
                break;
        }

        if (chequeosFiltrados.length === 0) {
            mostrarMensaje('❌ No hay datos para el tipo de informe seleccionado', true);
            return;
        }

        mostrarMensaje('📊 Uniendo PDFs del informe completo...', false);

        // Crear PDF unido usando PDF-Lib
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        // Descargar y unir cada PDF
        for (let i = 0; i < chequeosFiltrados.length; i++) {
            const chequeo = chequeosFiltrados[i];
            try {
                mostrarMensaje(`📥 Descargando PDF ${i + 1} de ${chequeosFiltrados.length}...`, false);

                // Descargar el PDF
                const response = await fetch(chequeo.archivo_url);
                const pdfBytes = await response.arrayBuffer();

                // Cargar el PDF
                const pdf = await PDFDocument.load(pdfBytes);

                // Copiar todas las páginas al PDF unido
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));

            } catch (error) {
                console.error(`Error procesando PDF ${i + 1}:`, error);
                mostrarMensaje(`⚠️ Error con PDF ${i + 1}, continuando...`, true);
            }
        }

        // Guardar el PDF unido
        const mergedPdfBytes = await mergedPdf.save();

        // Crear blob y descargar
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpiar URL
        setTimeout(() => URL.revokeObjectURL(url), 100);

        mostrarMensaje(`✅ PDF unido generado con ${chequeosFiltrados.length} listas de chequeo`, false);

    } catch (error) {
        console.error('❌ Error uniendo PDFs:', error);
        mostrarMensaje('❌ Error al unir PDFs: ' + error.message, true);
    }
}

// ========================= EXPORTAR FUNCIONES GLOBALES =========================

window.generarYSubirPDFConsultorio = generarYSubirPDFConsultorio;
window.generarYSubirPDFArea = generarYSubirPDFArea;
window.eliminarChequeo = eliminarChequeo;
window.previsualizarPDF = previsualizarPDF;
window.descargarChequeo = descargarChequeo;
window.generarPDFInformeMensual = generarPDFInformeMensual;
window.generarInformeMensualCompleto = generarInformeMensualCompleto;
window.mostrarHistorialConsultorio = mostrarHistorialConsultorio;
window.mostrarHistorialArea = mostrarHistorialArea;
window.cerrarModalHistorial = cerrarModalHistorial;
window.eliminarChequeoModal = eliminarChequeoModal;
window.cambiarSede = cambiarSede;