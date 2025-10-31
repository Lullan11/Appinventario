// Configuración CLOUDINARY
const CLOUDINARY_CONFIG = {
    cloudName: 'dzkccjhn9',
    uploadPreset: 'inventario'
};

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}`;
const CLOUDINARY_RAW_UPLOAD = `${CLOUDINARY_UPLOAD_URL}/raw/upload`;

// Variables globales
let consultorioSeleccionado = null;
let areaEspecialSeleccionada = null;
let historialChequeos = [];
let tipoInformeCompletoSeleccionado = 'completo';

// Objeto nombresAreas para usar en múltiples funciones
const nombresAreas = {
    'espirometria': 'Espirometría',
    'audiometria': 'Audiometría',
    'optometria': 'Optometría',
    'psicologia': 'Psicología'
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    console.log('🔄 Iniciando sistema de chequeos...');

    try {
        cargarFechaActual();
        configurarEventos();
        configurarTabs();
        cargarHistorialChequeos();
        configurarEventosInformes();
        inicializarSelectsInformes();
        inicializarSelectsInformesCompletos();
        cargarHistorialEnTabla();
        mostrarMensaje('✅ Sistema de chequeos listo', false);
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        mostrarMensaje('❌ Error al cargar el sistema de chequeos', true);
    }
});

// Configurar sistema de tabs - MEJORADO CON INDICADOR VISUAL
function configurarTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Remover clase active de todos los botones y paneles
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.color = '';
            });
            tabPanels.forEach(panel => panel.classList.add('hidden'));

            // Activar el botón y panel actual
            button.classList.add('active');

            // Cambiar color según el tab activo
            if (targetTab === 'consultorios') {
                button.style.color = '#01983B';
            } else if (targetTab === 'areas-especiales') {
                button.style.color = '#639A33';
            } else if (targetTab === 'historial-chequeos') {
                button.style.color = '#8B5CF6';
            }

            const targetPanel = document.getElementById(`tab-${targetTab}`);
            if (targetPanel) {
                targetPanel.classList.remove('hidden');

                // Si es el tab de historial, actualizar la tabla
                if (targetTab === 'historial-chequeos') {
                    cargarHistorialEnTabla();
                }
            }

            console.log(`📊 Cambiando a tab: ${targetTab}`);
        });
    });
}

// Configurar eventos para informes
function configurarEventosInformes() {
    // Eventos para radio buttons de tipo de informe
    const radiosTipoInforme = document.querySelectorAll('input[name="tipo-informe"]');
    radiosTipoInforme.forEach(radio => {
        radio.addEventListener('change', function () {
            const consultorioContainer = document.getElementById('consultorio-informe-container');
            const areaContainer = document.getElementById('area-informe-container');

            if (this.value === 'consultorio') {
                consultorioContainer.classList.remove('hidden');
                areaContainer.classList.add('hidden');
            } else {
                consultorioContainer.classList.add('hidden');
                areaContainer.classList.remove('hidden');
            }
        });
    });

    // Eventos para tipos de informe completo
    const tipoInformeCards = document.querySelectorAll('.tipo-informe-card');
    tipoInformeCards.forEach(card => {
        card.addEventListener('click', function () {
            tipoInformeCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');

            tipoInformeCompletoSeleccionado = this.getAttribute('data-tipo');
            actualizarInfoInformeCompleto();
        });
    });

    // Eventos para selects de fecha
    document.getElementById('select-mes-informe-completo').addEventListener('change', actualizarInfoInformeCompleto);
    document.getElementById('select-anio-informe-completo').addEventListener('change', actualizarInfoInformeCompleto);
}

// Actualizar información del informe completo
function actualizarInfoInformeCompleto() {
    const mes = document.getElementById('select-mes-informe-completo').value;
    const año = document.getElementById('select-anio-informe-completo').value;

    if (!mes || !año) return;

    const titulo = document.getElementById('titulo-informe-completo');
    const descripcion = document.getElementById('descripcion-informe-completo');

    const nombreMes = obtenerNombreMes(parseInt(mes));

    switch (tipoInformeCompletoSeleccionado) {
        case 'todos-consultorios':
            titulo.textContent = `Informe de Todos los Consultorios - ${nombreMes} ${año}`;
            descripcion.textContent = `Este informe incluirá todos los chequeos de los 6 consultorios realizados durante ${nombreMes} de ${año}`;
            break;
        case 'todas-areas':
            titulo.textContent = `Informe de Todas las Áreas - ${nombreMes} ${año}`;
            descripcion.textContent = `Este informe incluirá todos los chequeos de las 4 áreas especiales realizados durante ${nombreMes} de ${año}`;
            break;
        case 'completo':
            titulo.textContent = `Informe Completo - ${nombreMes} ${año}`;
            descripcion.textContent = `Este informe incluirá todos los chequeos de consultorios y áreas especiales realizados durante ${nombreMes} de ${año}`;
            break;
    }
}

// Configurar eventos
function configurarEventos() {
    // Eventos para selección de consultorios
    const consultorioCards = document.querySelectorAll('.consultorio-card');
    consultorioCards.forEach(card => {
        card.addEventListener('click', () => {
            consultorioCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            consultorioSeleccionado = card.getAttribute('data-consultorio');
            mostrarListaChequeoConsultorio();
        });
    });

    // Eventos para selección de áreas especiales
    const areaCards = document.querySelectorAll('.area-card');
    areaCards.forEach(card => {
        card.addEventListener('click', () => {
            areaCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            areaEspecialSeleccionada = card.getAttribute('data-area');
            mostrarListaChequeoArea();
        });
    });

    // Eventos para checkboxes
    document.addEventListener('change', function (e) {
        if (e.target.type === 'checkbox') {
            const checkboxItem = e.target.closest('.checkbox-item');
            if (checkboxItem) {
                if (e.target.checked) {
                    checkboxItem.classList.add('checked');
                } else {
                    checkboxItem.classList.remove('checked');
                }
            }
        }
    });

    // Botones de generación y subida automática de PDF
    const btnGenerarPDF = document.getElementById('btn-generar-pdf');
    if (btnGenerarPDF) {
        btnGenerarPDF.addEventListener('click', generarYSubirPDFConsultorio);
    }

    const btnGenerarPDFArea = document.getElementById('btn-generar-pdf-area');
    if (btnGenerarPDFArea) {
        btnGenerarPDFArea.addEventListener('click', generarYSubirPDFArea);
    }

    // Botones de historial específico
    const btnVerHistorialConsultorio = document.getElementById('btn-ver-historial-consultorio');
    if (btnVerHistorialConsultorio) {
        btnVerHistorialConsultorio.addEventListener('click', mostrarHistorialConsultorio);
    }

    const btnVerHistorialArea = document.getElementById('btn-ver-historial-area');
    if (btnVerHistorialArea) {
        btnVerHistorialArea.addEventListener('click', mostrarHistorialArea);
    }
}

// Cargar fecha actual
function cargarFechaActual() {
    const fecha = new Date();
    const opciones = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    };
    const fechaFormateada = fecha.toLocaleDateString('es-ES', opciones);

    const elementosFecha = document.querySelectorAll('#fecha-actual, #fecha-actual-area');
    elementosFecha.forEach(elemento => {
        elemento.textContent = fechaFormateada;
    });
}

// Mostrar lista de chequeo para consultorio
function mostrarListaChequeoConsultorio() {
    const listaContainer = document.getElementById('lista-chequeo-consultorio');
    const consultorioSeleccionadoElement = document.getElementById('consultorio-seleccionado');

    if (listaContainer && consultorioSeleccionadoElement) {
        consultorioSeleccionadoElement.textContent = `Consultorio ${consultorioSeleccionado}`;
        listaContainer.classList.remove('hidden');

        // Resetear formulario
        document.getElementById('responsable-chequeo').value = '';
        document.getElementById('validado-por').value = '';
        document.getElementById('observaciones-generales').value = '';

        // Resetear checkboxes y selects
        const checkboxes = listaContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.closest('.checkbox-item').classList.remove('checked');
        });

        const selects = listaContainer.querySelectorAll('.estado-equipo');
        selects.forEach(select => {
            select.value = 'optimo';
        });

        const observaciones = listaContainer.querySelectorAll('.observaciones');
        observaciones.forEach(input => {
            input.value = '';
        });
    }
}

// Mostrar lista de chequeo para área especial
function mostrarListaChequeoArea() {
    const listaContainer = document.getElementById('lista-chequeo-area');
    const areaSeleccionadaElement = document.getElementById('area-seleccionada');
    const equiposContainer = document.getElementById('equipos-area-container');

    if (listaContainer && areaSeleccionadaElement && equiposContainer) {
        areaSeleccionadaElement.textContent = nombresAreas[areaEspecialSeleccionada] || areaEspecialSeleccionada;
        listaContainer.classList.remove('hidden');

        // Resetear formulario - AHORA CON 3 CAMPOS
        document.getElementById('responsable-chequeo-area').value = '';
        document.getElementById('validado-por-area').value = '';
        document.getElementById('observaciones-generales-area').value = '';

        // Cargar equipos específicos del área
        cargarEquiposAreaEspecial(areaEspecialSeleccionada, equiposContainer);
    }
}

// Cargar equipos específicos por área especial
function cargarEquiposAreaEspecial(area, container) {
    const equiposPorArea = {
        'espirometria': [
            'Espirómetro'
        ],
        'audiometria': [
            'Audiómetro',
            'Cabina Audiométrica',
            'Equipo de organos'
        ],
        'optometria': [
            'Autorref-Keratómetro',
            'Forópter',
            'Lámpara de Hendidura',
            'Lensómetro',
            'Oftalmoscopio',
            'Pantalla Tangente',
            'Proyector Opto Tipos',
            'Retinoscopio',
            'Test Ishihara',
            'Transluminador',
            'Unidad de Refracción',
            'Visiómetro',
            'Caja de lentes de prueba'
        ],
        'psicologia': [
            'Polireactímetro 1',
            'Polireactímetro 2'
        ]
    };

    const equipos = equiposPorArea[area] || [];

    let html = `<h4 class="font-semibold text-gray-800 mb-4 text-lg">Equipos del Área</h4>
                        <div class="space-y-3">`;

    equipos.forEach(equipo => {
        html += `
                    <div class="checkbox-item bg-white border border-gray-200 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <input type="checkbox" id="${equipo.toLowerCase().replace(/\s+/g, '-')}" 
                                       class="h-5 w-5 text-[#639A33] focus:ring-[#639A33] rounded">
                                <label for="${equipo.toLowerCase().replace(/\s+/g, '-')}" class="text-gray-700 font-medium">${equipo}</label>
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

// Obtener datos COMPLETOS de equipos (sin filtrar por checkbox)
function obtenerDatosEquiposCompletos(tipo) {
    let contenedor;
    if (tipo === 'consultorio') {
        contenedor = document.getElementById('lista-chequeo-consultorio');
    } else {
        contenedor = document.getElementById('lista-chequeo-area');
    }

    const equiposData = [];
    const checkboxItems = contenedor.querySelectorAll('.checkbox-item');

    checkboxItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const label = item.querySelector('label').textContent;
        const estado = item.querySelector('.estado-equipo').value;
        const observaciones = item.querySelector('.observaciones').value;

        // INCLUIR TODOS LOS EQUIPOS, NO SOLO LOS CHEQUEADOS
        equiposData.push({
            equipo: label,
            estado: estado,
            observaciones: observaciones || 'Sin observaciones',
            chequeado: checkbox.checked // Mantener esta info pero no filtrar
        });
    });

    return equiposData;
}

// Generar y subir PDF para consultorio (todo en uno)
async function generarYSubirPDFConsultorio() {
    if (!consultorioSeleccionado) {
        mostrarMensaje('❌ Selecciona un consultorio primero', true);
        return;
    }

    const responsable = document.getElementById('responsable-chequeo').value;
    const validadoPor = document.getElementById('validado-por').value;

    if (!responsable || !validadoPor) {
        mostrarMensaje('❌ Completa todos los campos requeridos', true);
        return;
    }

    try {
        mostrarMensaje('📄 Generando y subiendo PDF...', false);

        // Obtener datos COMPLETOS de equipos
        const equiposData = obtenerDatosEquiposCompletos('consultorio');

        // Primero generar el PDF
        const pdfBlob = await generarPDFConsultorioBlob();

        // Luego subirlo a Cloudinary
        await subirPDFCompletado(pdfBlob, 'consultorio', equiposData);

        mostrarMensaje('✅ PDF generado y subido correctamente', false);

    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('❌ Error al procesar PDF: ' + error.message, true);
    }
}

// Generar y subir PDF para área especial (todo en uno)
async function generarYSubirPDFArea() {
    if (!areaEspecialSeleccionada) {
        mostrarMensaje('❌ Selecciona un área especial primero', true);
        return;
    }

    const responsable = document.getElementById('responsable-chequeo-area').value;
    const validadoPor = document.getElementById('validado-por-area').value;

    if (!responsable || !validadoPor) {
        mostrarMensaje('❌ Completa todos los campos requeridos', true);
        return;
    }

    try {
        mostrarMensaje('📄 Generando y subiendo PDF...', false);

        // Obtener datos COMPLETOS de equipos
        const equiposData = obtenerDatosEquiposCompletos('area');

        // Primero generar el PDF
        const pdfBlob = await generarPDFAreaBlob();

        // Luego subirlo a Cloudinary
        await subirPDFCompletado(pdfBlob, 'area', equiposData);

        mostrarMensaje('✅ PDF generado y subido correctamente', false);

    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('❌ Error al procesar PDF: ' + error.message, true);
    }
}

// Generar PDF para consultorio y devolver como Blob - CORREGIDO: MOSTRAR TODOS LOS EQUIPOS
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

    // Configuración inicial
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // Encabezado
    doc.setFillColor(1, 152, 59); // #01983B
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA DE CHEQUEO DIARIO - COMPLETA', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Consultorio ${consultorioSeleccionado}`, pageWidth / 2, 18, { align: 'center' });
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, 23, { align: 'center' });

    yPosition = 35;

    // Información del responsable y validado por
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
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

    // Tabla de equipos - MOSTRAR TODOS LOS EQUIPOS, NO SOLO LOS CHEQUEADOS
    const headers = [['Equipo', 'Estado', 'Observaciones', 'Chequeado']];
    const rows = [];

    const equipos = document.querySelectorAll('#lista-chequeo-consultorio .checkbox-item');
    equipos.forEach(item => {
        const label = item.querySelector('label').textContent;
        const estado = item.querySelector('.estado-equipo').value;
        const observaciones = item.querySelector('.observaciones').value || '-';
        const checked = item.querySelector('input[type="checkbox"]').checked;

        // INCLUIR TODOS LOS EQUIPOS SIN FILTRAR
        rows.push([
            label,
            estado.toUpperCase(),
            observaciones,
            checked ? 'SÍ' : 'NO' // Agregar columna para indicar si fue chequeado
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
        doc.text(`Generado el: ${new Date().toLocaleString('es-ES')} - Sistema de Gestión de Inventarios IPS Progresando`,
            pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Devolver como Blob
    return doc.output('blob');
}

// Generar PDF para área especial y devolver como Blob - CORREGIDO: MOSTRAR TODOS LOS EQUIPOS
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

    // Configuración inicial
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // Encabezado
    doc.setFillColor(99, 154, 51); // #639A33
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA DE CHEQUEO DIARIO - COMPLETA', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Área: ${nombresAreas[areaEspecialSeleccionada]}`, pageWidth / 2, 18, { align: 'center' });
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, 23, { align: 'center' });

    yPosition = 35;

    // Información del responsable y validado por
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
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

    // Tabla de equipos - MOSTRAR TODOS LOS EQUIPOS, NO SOLO LOS CHEQUEADOS
    const headers = [['Equipo', 'Estado', 'Observaciones', 'Chequeado']];
    const rows = [];

    const equipos = document.querySelectorAll('#lista-chequeo-area .checkbox-item');
    equipos.forEach(item => {
        const label = item.querySelector('label').textContent;
        const estado = item.querySelector('.estado-equipo').value;
        const observaciones = item.querySelector('.observaciones').value || '-';
        const checked = item.querySelector('input[type="checkbox"]').checked;

        // INCLUIR TODOS LOS EQUIPOS SIN FILTRAR
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
        doc.text(`Generado el: ${new Date().toLocaleString('es-ES')} - Sistema de Gestión de Inventarios IPS Progresando`,
            pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Devolver como Blob
    return doc.output('blob');
}

// Subir PDF completado a Cloudinary CON DATOS COMPLETOS
async function subirPDFCompletado(pdfBlob, tipo, equiposData) {
    try {
        mostrarMensaje('📤 Subiendo PDF a Cloudinary...', false);

        // Convertir blob a File
        const archivo = new File([pdfBlob], `chequeo_${tipo}_${Date.now()}.pdf`, { type: 'application/pdf' });

        const formData = new FormData();
        formData.append('file', archivo);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('resource_type', 'raw');

        const response = await fetch(CLOUDINARY_RAW_UPLOAD, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error al subir el archivo');
        }

        const data = await response.json();

        // Guardar información del chequeo CON DATOS COMPLETOS
        const nombre = tipo === 'consultorio' ? `Consultorio ${consultorioSeleccionado}` :
            nombresAreas[areaEspecialSeleccionada] || areaEspecialSeleccionada;

        const responsable = tipo === 'consultorio' ?
            document.getElementById('responsable-chequeo').value :
            document.getElementById('responsable-chequeo-area').value;

        const validadoPor = tipo === 'consultorio' ?
            document.getElementById('validado-por').value :
            document.getElementById('validado-por-area').value;

        const observaciones = tipo === 'consultorio' ?
            document.getElementById('observaciones-generales').value :
            document.getElementById('observaciones-generales-area').value;

        const chequeo = {
            id: Date.now(),
            tipo: tipo,
            nombre: nombre,
            fecha: new Date().toISOString(),
            responsable: responsable,
            validadoPor: validadoPor,
            archivoUrl: data.secure_url,
            archivoPublicId: data.public_id,
            observaciones: observaciones,
            equiposChequeados: equiposData.filter(e => e.chequeado).length,
            equiposData: equiposData, // GUARDAR DATOS COMPLETOS DE EQUIPOS
            mes: new Date().getMonth() + 1,
            año: new Date().getFullYear()
        };

        // Agregar al historial local
        historialChequeos.unshift(chequeo);
        guardarHistorialLocal();

        // Actualizar tabla de historial si está visible
        if (document.getElementById('tab-historial-chequeos') &&
            !document.getElementById('tab-historial-chequeos').classList.contains('hidden')) {
            cargarHistorialEnTabla();
        }

        // Resetear formulario después de subir
        if (tipo === 'consultorio') {
            document.getElementById('responsable-chequeo').value = '';
            document.getElementById('validado-por').value = '';
            document.getElementById('observaciones-generales').value = '';

            const checkboxes = document.querySelectorAll('#lista-chequeo-consultorio input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                checkbox.closest('.checkbox-item').classList.remove('checked');
            });

            const selects = document.querySelectorAll('#lista-chequeo-consultorio .estado-equipo');
            selects.forEach(select => {
                select.value = 'optimo';
            });

            const obsInputs = document.querySelectorAll('#lista-chequeo-consultorio .observaciones');
            obsInputs.forEach(input => {
                input.value = '';
            });
        } else {
            document.getElementById('responsable-chequeo-area').value = '';
            document.getElementById('validado-por-area').value = '';
            document.getElementById('observaciones-generales-area').value = '';

            const checkboxes = document.querySelectorAll('#lista-chequeo-area input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                checkbox.closest('.checkbox-item').classList.remove('checked');
            });

            const selects = document.querySelectorAll('#lista-chequeo-area .estado-equipo');
            selects.forEach(select => {
                select.value = 'optimo';
            });

            const obsInputs = document.querySelectorAll('#lista-chequeo-area .observaciones');
            obsInputs.forEach(input => {
                input.value = '';
            });
        }

        mostrarMensaje('✅ PDF subido correctamente al historial', false);

    } catch (error) {
        console.error('❌ Error subiendo PDF:', error);
        throw error;
    }
}

// Mostrar historial específico del consultorio
function mostrarHistorialConsultorio() {
    if (!consultorioSeleccionado) {
        mostrarMensaje('❌ Selecciona un consultorio primero', true);
        return;
    }

    const nombreConsultorio = `Consultorio ${consultorioSeleccionado}`;
    const historialFiltrado = historialChequeos.filter(chequeo =>
        chequeo.tipo === 'consultorio' && chequeo.nombre === nombreConsultorio
    );

    mostrarModalHistorial(historialFiltrado, nombreConsultorio);
}

// Mostrar historial específico del área
function mostrarHistorialArea() {
    if (!areaEspecialSeleccionada) {
        mostrarMensaje('❌ Selecciona un área especial primero', true);
        return;
    }

    const nombreArea = nombresAreas[areaEspecialSeleccionada] || areaEspecialSeleccionada;
    const historialFiltrado = historialChequeos.filter(chequeo =>
        chequeo.tipo === 'area' && chequeo.nombre === nombreArea
    );

    mostrarModalHistorial(historialFiltrado, nombreArea);
}

// Mostrar modal de historial
function mostrarModalHistorial(historial, titulo) {
    // Crear modal dinámicamente
    let modal = document.getElementById('modal-historial-especifico');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-historial-especifico';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50';
        modal.innerHTML = `
                    <div class="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-96 overflow-hidden flex flex-col">
                        <h3 class="text-xl font-semibold text-gray-800 mb-4 flex justify-between items-center">
                            <span>Historial de Chequeos - <span id="historial-titulo"></span></span>
                            <button onclick="cerrarModalHistorial()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </h3>
                        <div class="overflow-y-auto flex-1">
                            <table class="w-full">
                                <thead class="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th class="px-4 py-2 text-left">Fecha</th>
                                        <th class="px-4 py-2 text-left">Responsable</th>
                                        <th class="px-4 py-2 text-left">Validado por</th>
                                        <th class="px-4 py-2 text-left">Equipos</th>
                                        <th class="px-4 py-2 text-left">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="historial-especifico-body">
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
        document.body.appendChild(modal);
    }

    // Llenar con datos
    document.getElementById('historial-titulo').textContent = titulo;
    const tbody = document.getElementById('historial-especifico-body');

    if (historial.length === 0) {
        tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                            No hay chequeos registrados
                        </td>
                    </tr>
                `;
    } else {
        tbody.innerHTML = historial.map(chequeo => {
            const fecha = new Date(chequeo.fecha).toLocaleDateString('es-ES');
            return `
                        <tr class="border-b border-gray-200 hover:bg-gray-50">
                            <td class="px-4 py-3">${fecha}</td>
                            <td class="px-4 py-3">${chequeo.responsable}</td>
                            <td class="px-4 py-3">${chequeo.validadoPor}</td>
                            <td class="px-4 py-3">
                                <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                    ${chequeo.equiposChequeados} equipos
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <div class="pdf-actions flex gap-2">
                                    <button onclick="previsualizarPDF('${chequeo.archivoUrl}')" 
                                            class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50">
                                        <i class="fas fa-eye"></i> Ver
                                    </button>
                                    <button onclick="descargarChequeo('${chequeo.archivoUrl}', 'chequeo_${chequeo.id}.pdf')" 
                                            class="text-green-600 hover:text-green-800 text-sm flex items-center gap-1 px-2 py-1 rounded border border-green-200 hover:bg-green-50">
                                        <i class="fas fa-download"></i> Descargar
                                    </button>
                                    <button onclick="eliminarChequeo(${chequeo.id})" 
                                            class="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 px-2 py-1 rounded border border-red-200 hover:bg-red-50">
                                        <i class="fas fa-trash"></i> Eliminar
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
        }).join('');
    }

    modal.classList.remove('hidden');
}

// Cerrar modal de historial
function cerrarModalHistorial() {
    const modal = document.getElementById('modal-historial-especifico');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Cargar historial en la tabla del tab de historial - ACTUALIZADO CON NUEVAS ACCIONES
function cargarHistorialEnTabla() {
    const tbody = document.getElementById('historial-chequeos-body');

    if (historialChequeos.length === 0) {
        tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                            <i class="fas fa-clipboard-list text-3xl mb-2 block"></i>
                            No hay chequeos registrados
                        </td>
                    </tr>
                `;
    } else {
        tbody.innerHTML = historialChequeos.map(chequeo => {
            const fecha = new Date(chequeo.fecha).toLocaleDateString('es-ES');
            const tipoColor = chequeo.tipo === 'consultorio' ? 'blue' : 'green';
            const tipoIcon = chequeo.tipo === 'consultorio' ? 'fa-door-closed' : 'fa-microscope';

            return `
                        <tr class="border-b border-gray-200 hover:bg-gray-50">
                            <td class="px-4 py-3">${fecha}</td>
                            <td class="px-4 py-3">
                                <div class="flex items-center gap-2">
                                    <i class="fas ${tipoIcon} text-${tipoColor}-500"></i>
                                    <span>${chequeo.nombre}</span>
                                </div>
                            </td>
                            <td class="px-4 py-3">${chequeo.responsable}</td>
                            <td class="px-4 py-3">
                                <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                    ${chequeo.equiposChequeados} equipos
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <div class="pdf-actions flex gap-2">
                                    <button onclick="previsualizarPDF('${chequeo.archivoUrl}')" 
                                            class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50">
                                        <i class="fas fa-eye"></i> Ver
                                    </button>
                                    <button onclick="descargarChequeo('${chequeo.archivoUrl}', 'chequeo_${chequeo.id}.pdf')" 
                                            class="text-green-600 hover:text-green-800 text-sm flex items-center gap-1 px-2 py-1 rounded border border-green-200 hover:bg-green-50">
                                        <i class="fas fa-download"></i> Descargar
                                    </button>
                                    <button onclick="eliminarChequeo(${chequeo.id})" 
                                            class="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 px-2 py-1 rounded border border-red-200 hover:bg-red-50">
                                        <i class="fas fa-trash"></i> Eliminar
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
        }).join('');
    }
}

// Previsualizar PDF en nueva pestaña - CORREGIDO
function previsualizarPDF(url) {
    // Abrir el PDF en una nueva pestaña
    window.open(url, '_blank');
}

// Eliminar chequeo del historial
function eliminarChequeo(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este chequeo del historial?')) {
        return;
    }

    try {
        // Encontrar y eliminar el chequeo
        const index = historialChequeos.findIndex(chequeo => chequeo.id === id);
        if (index !== -1) {
            const chequeoEliminado = historialChequeos.splice(index, 1)[0];

            // Actualizar localStorage
            guardarHistorialLocal();

            // Actualizar la tabla de historial
            cargarHistorialEnTabla();

            // Cerrar modal si está abierto
            cerrarModalHistorial();

            mostrarMensaje('✅ Chequeo eliminado correctamente', false);
        }
    } catch (error) {
        console.error('❌ Error eliminando chequeo:', error);
        mostrarMensaje('❌ Error al eliminar el chequeo', true);
    }
}

// =============================================
// FUNCIONES PARA UNIR PDFs - TODOS LOS INFORMES
// =============================================

// Función principal para unir PDFs del mes (Informe Completo)
async function generarInformeMensualCompleto() {
    const mes = parseInt(document.getElementById('select-mes-informe-completo').value);
    const año = parseInt(document.getElementById('select-anio-informe-completo').value);

    if (!mes || !año) {
        mostrarMensaje('❌ Selecciona mes y año', true);
        return;
    }

    try {
        mostrarMensaje('📊 Uniendo PDFs del mes...', false);

        // Filtrar chequeos según el tipo seleccionado
        let chequeosDelMes = [];
        let nombreArchivo = '';

        switch (tipoInformeCompletoSeleccionado) {
            case 'todos-consultorios':
                chequeosDelMes = historialChequeos.filter(chequeo => 
                    chequeo.tipo === 'consultorio' && 
                    chequeo.mes === mes && 
                    chequeo.año === año
                );
                nombreArchivo = `informe_consultorios_${mes}_${año}.pdf`;
                break;
                
            case 'todas-areas':
                chequeosDelMes = historialChequeos.filter(chequeo => 
                    chequeo.tipo === 'area' && 
                    chequeo.mes === mes && 
                    chequeo.año === año
                );
                nombreArchivo = `informe_areas_${mes}_${año}.pdf`;
                break;
                
            case 'completo':
                chequeosDelMes = historialChequeos.filter(chequeo => 
                    chequeo.mes === mes && 
                    chequeo.año === año
                );
                nombreArchivo = `informe_completo_${mes}_${año}.pdf`;
                break;
        }

        if (chequeosDelMes.length === 0) {
            mostrarMensaje('❌ No hay chequeos registrados para este período', true);
            return;
        }

        // Ordenar por fecha
        chequeosDelMes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        // Crear PDF unido
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        // Descargar y unir cada PDF
        for (let i = 0; i < chequeosDelMes.length; i++) {
            const chequeo = chequeosDelMes[i];
            try {
                mostrarMensaje(`📥 Descargando lista ${i + 1} de ${chequeosDelMes.length}...`, false);
                
                // Descargar el PDF
                const response = await fetch(chequeo.archivoUrl);
                const pdfBytes = await response.arrayBuffer();
                
                // Cargar el PDF
                const pdf = await PDFDocument.load(pdfBytes);
                
                // Copiar todas las páginas al PDF unido
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
                
            } catch (error) {
                console.error(`Error procesando PDF ${i + 1}:`, error);
                mostrarMensaje(`⚠️ Error con lista ${i + 1}, continuando...`, true);
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

        mostrarMensaje(`✅ PDF unido generado con ${chequeosDelMes.length} listas de chequeo`, false);

    } catch (error) {
        console.error('❌ Error uniendo PDFs:', error);
        mostrarMensaje('❌ Error al unir PDFs: ' + error.message, true);
    }
}

// Función para unir PDFs de informe mensual específico (Consultorio/Área individual)
async function generarPDFInformeMensual() {
    const tipo = document.querySelector('input[name="tipo-informe"]:checked').value;
    const nombre = tipo === 'consultorio' ?
        document.getElementById('select-consultorio-informe').value :
        document.getElementById('select-area-informe').value;
    const mes = parseInt(document.getElementById('select-mes-informe').value);
    const año = parseInt(document.getElementById('select-anio-informe').value);

    if (!nombre || !mes || !año) {
        mostrarMensaje('❌ Completa todos los campos del informe', true);
        return;
    }

    try {
        mostrarMensaje('📊 Uniendo PDFs del mes...', false);

        // Filtrar chequeos del mes específico
        const historialFiltrado = historialChequeos.filter(chequeo =>
            chequeo.tipo === tipo &&
            chequeo.nombre === nombre &&
            chequeo.mes === mes &&
            chequeo.año === año
        );

        if (historialFiltrado.length === 0) {
            mostrarMensaje('❌ No hay chequeos registrados para este período', true);
            return;
        }

        // Ordenar por fecha
        historialFiltrado.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        // Crear PDF unido
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        // Descargar y unir cada PDF
        for (let i = 0; i < historialFiltrado.length; i++) {
            const chequeo = historialFiltrado[i];
            try {
                mostrarMensaje(`📥 Descargando lista ${i + 1} de ${historialFiltrado.length}...`, false);
                
                // Descargar el PDF
                const response = await fetch(chequeo.archivoUrl);
                const pdfBytes = await response.arrayBuffer();
                
                // Cargar el PDF
                const pdf = await PDFDocument.load(pdfBytes);
                
                // Copiar todas las páginas al PDF unido
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
                
            } catch (error) {
                console.error(`Error procesando PDF ${i + 1}:`, error);
                mostrarMensaje(`⚠️ Error con lista ${i + 1}, continuando...`, true);
            }
        }

        // Guardar el PDF unido
        const mergedPdfBytes = await mergedPdf.save();
        
        // Crear blob y descargar
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const nombreArchivo = `informe_${nombre.toLowerCase().replace(/\s+/g, '_')}_${mes}_${año}.pdf`;
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar URL
        setTimeout(() => URL.revokeObjectURL(url), 100);

        mostrarMensaje(`✅ PDF unido generado con ${historialFiltrado.length} listas de chequeo`, false);

    } catch (error) {
        console.error('❌ Error uniendo PDFs:', error);
        mostrarMensaje('❌ Error al unir PDFs: ' + error.message, true);
    }
}

// Función auxiliar para obtener nombre del mes
function obtenerNombreMes(mes) {
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1];
}

// Cargar historial de chequeos
function cargarHistorialChequeos() {
    const historialGuardado = localStorage.getItem('historialChequeos');
    if (historialGuardado) {
        historialChequeos = JSON.parse(historialGuardado);
    }
}

// Guardar historial localmente
function guardarHistorialLocal() {
    localStorage.setItem('historialChequeos', JSON.stringify(historialChequeos));
}

// Descargar chequeo del historial
async function descargarChequeo(url, nombreArchivo) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = nombreArchivo;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpiar
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

        mostrarMensaje('✅ Chequeo descargado correctamente', false);
    } catch (error) {
        console.error('❌ Error descargando chequeo:', error);
        mostrarMensaje('❌ Error al descargar chequeo', true);
    }
}

// Función unificada para llenar selects de años - SIN LÍMITES
function llenarSelectAnios(selectId, añoSeleccionado = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const añoActual = new Date().getFullYear();
    
    select.innerHTML = '<option value="">Seleccionar año</option>';
    
    // Obtener todos los años únicos del historial
    const añosExistentes = [...new Set(historialChequeos.map(chequeo => chequeo.año))];
    
    // Si no hay años en el historial, usar solo el año actual
    if (añosExistentes.length === 0) {
        añosExistentes.push(añoActual);
    }
    
    // Ordenar años de más reciente a más antiguo
    añosExistentes.sort((a, b) => b - a);
    
    // Agregar los años del historial
    añosExistentes.forEach(año => {
        select.innerHTML += `<option value="${año}">${año}</option>`;
    });
    
    // Si el año actual no está en las opciones, agregarlo
    if (!añosExistentes.includes(añoActual)) {
        select.innerHTML += `<option value="${añoActual}">${añoActual}</option>`;
    }
    
    // Establecer el año seleccionado
    if (añoSeleccionado && añosExistentes.includes(añoSeleccionado)) {
        select.value = añoSeleccionado;
    } else {
        select.value = añoActual;
    }
}

// Inicializar selects del formulario de informes - CORREGIDO: SIN LÍMITES DE AÑOS
function inicializarSelectsInformes() {
    // Llenar select de consultorios
    const selectConsultorio = document.getElementById('select-consultorio-informe');
    if (selectConsultorio) {
        selectConsultorio.innerHTML = '<option value="">Seleccionar consultorio</option>';
        for (let i = 1; i <= 6; i++) {
            selectConsultorio.innerHTML += `<option value="Consultorio ${i}">Consultorio ${i}</option>`;
        }
    }

    // Llenar select de áreas
    const selectArea = document.getElementById('select-area-informe');
    if (selectArea) {
        selectArea.innerHTML = `
                    <option value="">Seleccionar área</option>
                    <option value="Espirometría">Espirometría</option>
                    <option value="Audiometría">Audiometría</option>
                    <option value="Optometría">Optometría</option>
                    <option value="Psicología">Psicología</option>
                `;
    }

    // Llenar select de meses
    const selectMes = document.getElementById('select-mes-informe');
    if (selectMes) {
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        selectMes.innerHTML = '<option value="">Seleccionar mes</option>';
        meses.forEach((mes, index) => {
            selectMes.innerHTML += `<option value="${index + 1}">${mes}</option>`;
        });
    }

    // Llenar select de años - CORREGIDO: SIN LÍMITES
    llenarSelectAnios('select-anio-informe');
}

// Inicializar selects de informes completos - CORREGIDO: SIN LÍMITES DE AÑOS
function inicializarSelectsInformesCompletos() {
    // Llenar select de meses
    const selectMes = document.getElementById('select-mes-informe-completo');
    if (selectMes) {
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        selectMes.innerHTML = '<option value="">Seleccionar mes</option>';
        meses.forEach((mes, index) => {
            selectMes.innerHTML += `<option value="${index + 1}">${mes}</option>`;
        });
        selectMes.value = new Date().getMonth() + 1;
    }

    // Llenar select de años - CORREGIDO: SIN LÍMITES
    llenarSelectAnios('select-anio-informe-completo');

    // Actualizar información inicial
    actualizarInfoInformeCompleto();
}

// Función para mostrar mensajes
function mostrarMensaje(texto, esError = false) {
    let mensajeContainer = document.getElementById('mensaje-chequeos');

    if (!mensajeContainer) {
        mensajeContainer = document.createElement('div');
        mensajeContainer.id = 'mensaje-chequeos';
        mensajeContainer.className = 'fixed top-4 right-4 z-50 max-w-sm';
        document.body.appendChild(mensajeContainer);
    }

    const mensaje = document.createElement('div');
    mensaje.className = `p-4 rounded-lg shadow-lg border-l-4 ${esError
        ? 'bg-red-50 border-red-500 text-red-700'
        : 'bg-green-50 border-green-500 text-green-700'
        } mb-2`;

    mensaje.innerHTML = `
                <div class="flex items-center">
                    <i class="fas ${esError ? 'fa-exclamation-triangle' : 'fa-check-circle'} mr-2"></i>
                    <span class="font-medium">${texto}</span>
                </div>
            `;

    mensajeContainer.appendChild(mensaje);

    setTimeout(() => {
        if (mensaje.parentNode) {
            mensaje.parentNode.removeChild(mensaje);
        }
    }, 5000);
}

// =============================================
// EXPORTAR FUNCIONES AL SCOPE GLOBAL - CORREGIDO
// =============================================

window.generarYSubirPDFConsultorio = generarYSubirPDFConsultorio;
window.generarYSubirPDFArea = generarYSubirPDFArea;
window.mostrarHistorialConsultorio = mostrarHistorialConsultorio;
window.mostrarHistorialArea = mostrarHistorialArea;
window.cerrarModalHistorial = cerrarModalHistorial;
window.generarPDFInformeMensual = generarPDFInformeMensual;
window.generarInformeMensualCompleto = generarInformeMensualCompleto;
window.descargarChequeo = descargarChequeo;
window.previsualizarPDF = previsualizarPDF;
window.eliminarChequeo = eliminarChequeo;