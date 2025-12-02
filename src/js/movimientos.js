// src/js/movimientos.js
const API_URL = "https://inventario-api-gw73.onrender.com";

class MovimientosManager {
    constructor() {
        this.currentUser = null;
        this.sedes = [];
        this.equipos = [];
        this.usuarios = [];
        this.tiposMovimiento = [];
        this.movimientos = [];
        this.notificaciones = [];
        
        this.initialize();
    }

    async initialize() {
        // Cargar datos del usuario actual
        await this.loadCurrentUser();
        
        // Cargar datos iniciales
        await this.loadInitialData();
        
        // Cargar notificaciones
        await this.loadNotifications();
        
        // Inicializar event listeners
        this.initializeEventListeners();
        
        // Configurar actualizaciones automáticas
        this.setupAutoRefresh();
    }

    async loadCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                console.log('Usuario cargado:', this.currentUser);
            }
        } catch (error) {
            console.error('Error cargando usuario:', error);
        }
    }

    async loadInitialData() {
        try {
            console.log('📊 Cargando datos iniciales para movimientos...');
            
            // Cargar todos los datos en paralelo
            const [sedesRes, usuariosRes, tiposRes, movimientosRes] = await Promise.all([
                fetch(`${API_URL}/sedes`),
                fetch(`${API_URL}/usuarios`),
                fetch(`${API_URL}/tipos-movimiento`),
                fetch(`${API_URL}/movimientos-equipos`)
            ]);

            // Verificar respuestas
            if (!sedesRes.ok) throw new Error("Error al cargar sedes");
            if (!usuariosRes.ok) throw new Error("Error al cargar usuarios");
            if (!tiposRes.ok) throw new Error("Error al cargar tipos de movimiento");

            // Procesar datos
            this.sedes = await sedesRes.json();
            this.usuarios = await usuariosRes.json();
            this.tiposMovimiento = await tiposRes.json();
            
            if (movimientosRes.ok) {
                this.movimientos = await movimientosRes.json();
            }

            console.log('✅ Datos iniciales cargados:', {
                sedes: this.sedes.length,
                usuarios: this.usuarios.length,
                tiposMovimiento: this.tiposMovimiento.length,
                movimientos: this.movimientos.length
            });

            // Inicializar selects si existen
            this.initializeSelects();

        } catch (error) {
            console.error('❌ Error cargando datos iniciales:', error);
            this.showError('Error al cargar datos iniciales: ' + error.message);
        }
    }

    async loadEquiposPorSede(sedeId) {
        try {
            console.log(`📦 Cargando equipos para sede ${sedeId}...`);
            
            const response = await fetch(`${API_URL}/equipos/sede/${sedeId}`);
            
            if (!response.ok) {
                throw new Error(`Error al cargar equipos de la sede ${sedeId}`);
            }
            
            this.equipos = await response.json();
            console.log(`✅ ${this.equipos.length} equipos cargados`);
            
            // Actualizar select de equipos
            this.updateEquiposSelect();
            
            return this.equipos;
            
        } catch (error) {
            console.error('❌ Error cargando equipos:', error);
            this.showError('Error al cargar equipos: ' + error.message);
            return [];
        }
    }

    async loadNotifications() {
        if (!this.currentUser?.id) return;
        
        try {
            const response = await fetch(`${API_URL}/notificaciones/usuario/${this.currentUser.id}`);
            
            if (response.ok) {
                this.notificaciones = await response.json();
                this.updateNotificationBadge();
            }
        } catch (error) {
            console.error('Error cargando notificaciones:', error);
        }
    }

    initializeSelects() {
        // Inicializar select de sedes
        const sedeSelect = document.getElementById('sede-select');
        if (sedeSelect) {
            sedeSelect.innerHTML = '<option value="">Seleccionar sede</option>' +
                this.sedes.map(sede => 
                    `<option value="${sede.id}">${sede.nombre}</option>`
                ).join('');
            
            // Agregar event listener para cambio de sede
            sedeSelect.addEventListener('change', (e) => {
                const sedeId = e.target.value;
                if (sedeId) {
                    this.loadEquiposPorSede(sedeId);
                } else {
                    this.equipos = [];
                    this.updateEquiposSelect();
                }
            });
        }

        // Inicializar select de responsables
        const responsableSelects = [
            'responsable-envio-select',
            'responsable-recepcion-select'
        ];
        
        responsableSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Seleccionar responsable</option>' +
                    this.usuarios.map(user => 
                        `<option value="${user.id}">${user.nombre} (${user.documento})</option>`
                    ).join('');
            }
        });

        // Inicializar select de tipos de movimiento
        const tipoMovimientoSelect = document.getElementById('tipo-movimiento-select');
        if (tipoMovimientoSelect) {
            tipoMovimientoSelect.innerHTML = '<option value="">Seleccionar tipo</option>' +
                this.tiposMovimiento.map(tipo => 
                    `<option value="${tipo.id}">${tipo.nombre.toUpperCase()}</option>`
                ).join('');
        }

        // Inicializar select de sedes destino
        const sedeDestinoSelect = document.getElementById('sede-destino-select');
        if (sedeDestinoSelect) {
            sedeDestinoSelect.innerHTML = '<option value="">Seleccionar sede destino</option>' +
                this.sedes.map(sede => 
                    `<option value="${sede.id}">${sede.nombre}</option>`
                ).join('');
        }
    }

    updateEquiposSelect() {
        const equipoSelect = document.getElementById('equipo-select');
        if (equipoSelect) {
            if (this.equipos.length === 0) {
                equipoSelect.innerHTML = '<option value="">No hay equipos disponibles</option>';
                equipoSelect.disabled = true;
            } else {
                equipoSelect.disabled = false;
                equipoSelect.innerHTML = '<option value="">Seleccionar equipo</option>' +
                    this.equipos.map(equipo => 
                        `<option value="${equipo.id}" 
                         data-codigo="${equipo.codigo_interno}"
                         data-responsable="${equipo.responsable_nombre}"
                         data-documento="${equipo.responsable_documento}">
                            ${equipo.nombre} (${equipo.codigo_interno})
                        </option>`
                    ).join('');
                
                // Agregar event listener para mostrar detalles del equipo
                equipoSelect.addEventListener('change', (e) => {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    if (selectedOption.value) {
                        this.showEquipoDetails(selectedOption);
                    }
                });
            }
        }
    }

    showEquipoDetails(selectedOption) {
        const detallesDiv = document.getElementById('equipo-details');
        if (detallesDiv) {
            detallesDiv.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg mt-2">
                    <h4 class="font-semibold text-gray-700 mb-2">Detalles del equipo:</h4>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div><span class="font-medium">Código:</span> ${selectedOption.dataset.codigo}</div>
                        <div><span class="font-medium">Responsable actual:</span> ${selectedOption.dataset.responsable}</div>
                        <div><span class="font-medium">Documento:</span> ${selectedOption.dataset.documento}</div>
                    </div>
                </div>
            `;
            detallesDiv.classList.remove('hidden');
        }
    }

    initializeEventListeners() {
        // Formulario de creación de movimiento
        const form = document.getElementById('movimiento-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createMovimiento();
            });
        }

        // Botón para generar documento
        const generateDocBtn = document.getElementById('generate-document-btn');
        if (generateDocBtn) {
            generateDocBtn.addEventListener('click', () => {
                this.generateDocument();
            });
        }

        // Botón para actualizar estado
        const updateStatusBtns = document.querySelectorAll('.update-status-btn');
        updateStatusBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const movimientoId = e.target.dataset.id;
                const nuevoEstado = e.target.dataset.estado;
                this.updateMovimientoStatus(movimientoId, nuevoEstado);
            });
        });

        // Modal de notificaciones
        const notificationBell = document.getElementById('notification-bell');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                this.showNotificationsModal();
            });
        }
    }

    async createMovimiento() {
        try {
            const form = document.getElementById('movimiento-form');
            const formData = new FormData(form);
            
            // Validar campos requeridos
            const requiredFields = [
                'id_equipo', 'id_tipo_movimiento', 'id_sede_origen',
                'id_sede_destino', 'id_responsable_envio', 'motivo'
            ];
            
            for (const field of requiredFields) {
                if (!formData.get(field)) {
                    throw new Error(`El campo ${field.replace('id_', '').replace('_', ' ')} es requerido`);
                }
            }

            // Preparar datos para enviar
            const movimientoData = {
                id_equipo: parseInt(formData.get('id_equipo')),
                id_tipo_movimiento: parseInt(formData.get('id_tipo_movimiento')),
                id_sede_origen: parseInt(formData.get('id_sede_origen')),
                id_sede_destino: parseInt(formData.get('id_sede_destino')),
                id_responsable_envio: parseInt(formData.get('id_responsable_envio')),
                id_responsable_recepcion: parseInt(formData.get('id_responsable_recepcion')),
                fecha_salida: formData.get('fecha_salida'),
                motivo: formData.get('motivo'),
                condicion_salida: formData.get('condicion_salida'),
                observaciones: formData.get('observaciones'),
                accesorios: formData.get('accesorios'),
                transporte: formData.get('transporte'),
                embalaje: formData.get('embalaje'),
                compromiso_retorno: formData.get('compromiso_retorno')
            };

            console.log('Enviando datos del movimiento:', movimientoData);

            // Enviar solicitud
            const response = await fetch(`${API_URL}/movimientos-equipos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(movimientoData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear movimiento');
            }

            const result = await response.json();
            
            // Mostrar mensaje de éxito
            this.showSuccess('Movimiento creado exitosamente');
            
            // Limpiar formulario
            form.reset();
            
            // Ocultar detalles del equipo
            const detallesDiv = document.getElementById('equipo-details');
            if (detallesDiv) {
                detallesDiv.classList.add('hidden');
            }
            
            // Recargar lista de movimientos
            await this.loadMovimientos();
            
            // Generar documento automáticamente
            setTimeout(() => {
                this.generateDocument(result.movimiento.id, 'salida');
            }, 1000);

        } catch (error) {
            console.error('❌ Error creando movimiento:', error);
            this.showError('Error al crear movimiento: ' + error.message);
        }
    }

    async updateMovimientoStatus(movimientoId, nuevoEstado) {
        try {
            const confirmMessage = nuevoEstado === 'cancelado' 
                ? '¿Está seguro de cancelar este movimiento?' 
                : `¿Confirmar que el equipo ha sido ${nuevoEstado}?`;
            
            if (!confirm(confirmMessage)) {
                return;
            }

            const updateData = {
                estado: nuevoEstado,
                fecha_recepcion: nuevoEstado === 'recibido' ? new Date().toISOString().split('T')[0] : null
            };

            const response = await fetch(`${API_URL}/movimientos-equipos/${movimientoId}/estado`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar estado');
            }

            const result = await response.result();
            
            this.showSuccess(`Movimiento ${nuevoEstado} exitosamente`);
            
            // Recargar movimientos
            await this.loadMovimientos();
            
            // Si se marcó como recibido, generar documento de entrada
            if (nuevoEstado === 'recibido') {
                setTimeout(() => {
                    this.generateDocument(movimientoId, 'entrada');
                }, 1000);
            }

        } catch (error) {
            console.error('❌ Error actualizando estado:', error);
            this.showError('Error al actualizar estado: ' + error.message);
        }
    }

    async generateDocument(movimientoId, tipoDocumento = 'salida') {
        try {
            const response = await fetch(`${API_URL}/movimientos-equipos/${movimientoId}/generar-documento`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tipo_documento: tipoDocumento })
            });

            if (!response.ok) {
                throw new Error('Error al generar documento');
            }

            const result = await response.json();
            
            // Mostrar modal con el documento
            this.showDocumentModal(result.datos, result.movimiento);
            
        } catch (error) {
            console.error('❌ Error generando documento:', error);
            this.showError('Error al generar documento: ' + error.message);
        }
    }

    showDocumentModal(documentData, movimiento) {
        // Crear contenido del documento según el formato requerido
        const documentContent = this.formatDocumentContent(documentData, movimiento);
        
        // Crear modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">ACTA DE MOVIMIENTO - ${documentData.encabezado.tipo_documento}</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="document-content bg-white p-6 border rounded-lg max-h-[70vh] overflow-y-auto">
                    ${documentContent}
                </div>
                
                <div class="mt-6 flex justify-end space-x-3">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                        Cerrar
                    </button>
                    <button onclick="movimientosManager.printDocument()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <i class="fas fa-print mr-2"></i>Imprimir
                    </button>
                    <button onclick="movimientosManager.downloadDocument(${movimiento.id})" 
                            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        <i class="fas fa-download mr-2"></i>Descargar PDF
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    formatDocumentContent(data, movimiento) {
        // Formatear el contenido según el ejemplo proporcionado
        return `
            <div class="text-center mb-6">
                <div class="text-3xl font-bold text-gray-800">S</div>
                <div class="text-sm text-gray-600 mb-2">.</div>
                <div class="text-sm text-gray-600 mb-2">.</div>
                <h1 class="text-2xl font-bold text-gray-800 mb-2">Progresando en Salud I.P.S.</h1>
                <h2 class="text-xl font-semibold text-gray-700 mb-4">SEGURIDAD Y SALUD EN EL TRABAJO</h2>
                <h3 class="text-lg font-bold text-gray-800 border-b-2 border-gray-800 pb-2">
                    ${data.encabezado.tipo_documento}
                </h3>
                <div class="text-sm text-gray-600 mt-1">Código: ${data.encabezado.codigo_movimiento}</div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <p class="text-sm"><strong>Entidad/Área:</strong> ${data.informacion_general.entidad_area}</p>
                    <p class="text-sm"><strong>Sede:</strong> ${data.informacion_general.sede_origen}</p>
                    <p class="text-sm"><strong>Fecha:</strong> ${data.informacion_general.fecha}</p>
                </div>
                <div>
                    <p class="text-sm"><strong>Motivo:</strong> ${data.informacion_general.motivo}</p>
                </div>
            </div>
            
            <div class="mb-6">
                <h4 class="font-bold text-gray-700 mb-2">EQUIPO:</h4>
                <table class="w-full text-sm">
                    <tr>
                        <td class="py-1"><strong>Equipo:</strong> ${data.equipo.nombre}</td>
                        <td class="py-1"><strong>Serial:</strong> ${data.equipo.codigo}</td>
                    </tr>
                    <tr>
                        <td class="py-1" colspan="2"><strong>Condición del Equipo:</strong> 
                            ${this.formatCondicionCheckboxes(data.equipo.condicion_salida)}
                        </td>
                    </tr>
                </table>
                <p class="text-sm mt-2"><strong>Observaciones:</strong> ${data.equipo.observaciones || 'Ninguna'}</p>
                <p class="text-sm"><strong>Accesorios entregados:</strong> ${data.equipo.accesorios || 'Ninguno'}</p>
            </div>
            
            <div class="mb-6">
                <h4 class="font-bold text-gray-700 mb-2">DESTINO/TRANSPORTE:</h4>
                <p class="text-sm"><strong>Destino:</strong> ${data.destino_transporte.destino}</p>
                <p class="text-sm"><strong>Contacto:</strong> ${data.destino_transporte.contacto}</p>
                <p class="text-sm"><strong>Tel:</strong> ${data.destino_transporte.telefono}</p>
                <p class="text-sm"><strong>Transporte:</strong> ${this.formatTransporteCheckboxes(data.destino_transporte.transporte)}</p>
                <p class="text-sm"><strong>Embalaje:</strong> ${this.formatEmbalajeCheckboxes(data.destino_transporte.embalaje)}</p>
                <p class="text-sm"><strong>Compromiso retorno:</strong> ${data.destino_transporte.compromiso_retorno || 'No aplica'}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-8 mb-8">
                <div class="text-center">
                    <h4 class="font-bold text-gray-700 mb-4 border-b pb-1">ENTREGA</h4>
                    <p class="text-sm"><strong>Nombre:</strong> ${data.firmas.entrega.nombre}</p>
                    <p class="text-sm"><strong>Cargo:</strong> ${data.firmas.entrega.cargo}</p>
                    <p class="text-sm"><strong>Doc:</strong> ${data.firmas.entrega.documento}</p>
                    <div class="mt-8 pt-4 border-t">
                        <p class="text-sm text-gray-600">Firma:</p>
                    </div>
                </div>
                
                <div class="text-center">
                    <h4 class="font-bold text-gray-700 mb-4 border-b pb-1">RECIBE</h4>
                    <p class="text-sm"><strong>Nombre:</strong> ${data.firmas.recibe.nombre}</p>
                    <p class="text-sm"><strong>Cargo:</strong> ${data.firmas.recibe.cargo}</p>
                    <p class="text-sm"><strong>Doc:</strong> ${data.firmas.recibe.documento}</p>
                    <div class="mt-8 pt-4 border-t">
                        <p class="text-sm text-gray-600">Firma:</p>
                    </div>
                </div>
            </div>
            
            <div class="text-center text-xs text-gray-600 mt-12">
                <div class="mb-2">
                    <strong>SEDE CUCUTA</strong><br>
                    ${data.pie_pagina.contacto_cucuta}<br>
                    ${data.pie_pagina.direccion_cucuta}
                </div>
                <div class="mb-2">
                    <strong>SEDE OCAÑA</strong><br>
                    ${data.pie_pagina.contacto_ocaña}<br>
                    ${data.pie_pagina.direccion_ocaña}
                </div>
                <div class="mb-2">
                    <strong>SEDE VILLA DEL ROSARIO</strong><br>
                    ${data.pie_pagina.contacto_villa}<br>
                    ${data.pie_pagina.direccion_villa}
                </div>
                <div class="mt-4">
                    ${data.pie_pagina.sitio_web}
                </div>
            </div>
        `;
    }

    formatCondicionCheckboxes(condicion) {
        const condiciones = ['Buena', 'Regular', 'Mala'];
        return condiciones.map(c => 
            `${c} ${condicion === c.toLowerCase() ? 'X' : '○'}`
        ).join(' ');
    }

    formatTransporteCheckboxes(transporte) {
        const tipos = ['Interno', 'Proveedor', 'Especial'];
        return tipos.map(t => 
            `${t} ${transporte === t.toLowerCase() ? 'X' : '○'}`
        ).join(' ');
    }

    formatEmbalajeCheckboxes(embalaje) {
        const tipos = ['Original', 'Adecuado'];
        return tipos.map(t => 
            `${t} ${embalaje === t.toLowerCase() ? 'X' : '○'}`
        ).join(' ');
    }

    async loadMovimientos() {
        try {
            const response = await fetch(`${API_URL}/movimientos-equipos`);
            
            if (response.ok) {
                this.movimientos = await response.json();
                this.renderMovimientosTable();
            }
        } catch (error) {
            console.error('Error cargando movimientos:', error);
        }
    }

    renderMovimientosTable() {
        const tableBody = document.getElementById('movimientos-table-body');
        if (!tableBody) return;

        if (this.movimientos.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-8 text-gray-500">
                        <i class="fas fa-inbox text-3xl mb-2"></i>
                        <p>No hay movimientos registrados</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.movimientos.map(movimiento => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${movimiento.codigo_movimiento}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${movimiento.equipo_nombre}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${movimiento.sede_origen_nombre}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${movimiento.sede_destino_nombre}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${movimiento.fecha_salida_formateada}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${this.getStatusClass(movimiento.estado)}">
                        ${movimiento.estado.toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${movimiento.responsable_envio_nombre || 'No asignado'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${movimiento.responsable_recepcion_nombre || 'No asignado'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${movimiento.creado_en ? new Date(movimiento.creado_en).toLocaleDateString() : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    ${this.renderActionButtons(movimiento)}
                </td>
            </tr>
        `).join('');

        // Re-inicializar event listeners para los botones
        this.initializeActionButtons();
    }

    getStatusClass(status) {
        const classes = {
            'pendiente': 'bg-yellow-100 text-yellow-800',
            'enviado': 'bg-blue-100 text-blue-800',
            'recibido': 'bg-green-100 text-green-800',
            'cancelado': 'bg-red-100 text-red-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    renderActionButtons(movimiento) {
        let buttons = '';
        
        // Botón para ver detalles
        buttons += `
            <button onclick="movimientosManager.viewMovementDetails(${movimiento.id})" 
                    class="text-indigo-600 hover:text-indigo-900 mr-3"
                    title="Ver detalles">
                <i class="fas fa-eye"></i>
            </button>
        `;
        
        // Botón para generar documento
        buttons += `
            <button onclick="movimientosManager.generateDocument(${movimiento.id}, 'salida')" 
                    class="text-blue-600 hover:text-blue-900 mr-3"
                    title="Generar acta">
                <i class="fas fa-file-pdf"></i>
            </button>
        `;
        
        // Botones de estado según el estado actual
        if (movimiento.estado === 'pendiente') {
            buttons += `
                <button onclick="movimientosManager.updateMovimientoStatus(${movimiento.id}, 'enviado')" 
                        class="text-green-600 hover:text-green-900 mr-3 update-status-btn"
                        data-id="${movimiento.id}" 
                        data-estado="enviado"
                        title="Marcar como enviado">
                    <i class="fas fa-paper-plane"></i>
                </button>
                <button onclick="movimientosManager.updateMovimientoStatus(${movimiento.id}, 'cancelado')" 
                        class="text-red-600 hover:text-red-900 update-status-btn"
                        data-id="${movimiento.id}" 
                        data-estado="cancelado"
                        title="Cancelar movimiento">
                    <i class="fas fa-times"></i>
                </button>
            `;
        } else if (movimiento.estado === 'enviado') {
            buttons += `
                <button onclick="movimientosManager.updateMovimientoStatus(${movimiento.id}, 'recibido')" 
                        class="text-green-600 hover:text-green-900 mr-3 update-status-btn"
                        data-id="${movimiento.id}" 
                        data-estado="recibido"
                        title="Marcar como recibido">
                    <i class="fas fa-check"></i>
                </button>
            `;
        }
        
        return buttons;
    }

    initializeActionButtons() {
        const updateStatusBtns = document.querySelectorAll('.update-status-btn');
        updateStatusBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const movimientoId = e.target.closest('button').dataset.id;
                const nuevoEstado = e.target.closest('button').dataset.estado;
                this.updateMovimientoStatus(movimientoId, nuevoEstado);
            });
        });
    }

    async viewMovementDetails(movimientoId) {
        try {
            const response = await fetch(`${API_URL}/movimientos-equipos/${movimientoId}`);
            
            if (response.ok) {
                const movimiento = await response.json();
                this.showMovementDetailsModal(movimiento);
            }
        } catch (error) {
            console.error('Error cargando detalles:', error);
            this.showError('Error al cargar detalles del movimiento');
        }
    }

    showMovementDetailsModal(movimiento) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Detalles del Movimiento</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Código</label>
                            <p class="mt-1 text-sm text-gray-900">${movimiento.codigo_movimiento}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Estado</label>
                            <span class="mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${this.getStatusClass(movimiento.estado)}">
                                ${movimiento.estado.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Equipo</label>
                        <p class="mt-1 text-sm text-gray-900">${movimiento.equipo_nombre} (${movimiento.equipo_codigo})</p>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Sede Origen</label>
                            <p class="mt-1 text-sm text-gray-900">${movimiento.sede_origen_nombre}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Sede Destino</label>
                            <p class="mt-1 text-sm text-gray-900">${movimiento.sede_destino_nombre}</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Responsable Envío</label>
                            <p class="mt-1 text-sm text-gray-900">${movimiento.responsable_envio_nombre || 'No asignado'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Responsable Recepción</label>
                            <p class="mt-1 text-sm text-gray-900">${movimiento.responsable_recepcion_nombre || 'No asignado'}</p>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Motivo</label>
                        <p class="mt-1 text-sm text-gray-900">${movimiento.motivo}</p>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Observaciones</label>
                        <p class="mt-1 text-sm text-gray-900">${movimiento.observaciones || 'Ninguna'}</p>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Fecha Salida</label>
                            <p class="mt-1 text-sm text-gray-900">${movimiento.fecha_salida_formateada}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Fecha Recepción</label>
                            <p class="mt-1 text-sm text-gray-900">${movimiento.fecha_recepcion_formateada || 'Pendiente'}</p>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Accesorios</label>
                        <p class="mt-1 text-sm text-gray-900">${movimiento.accesorios || 'Ninguno'}</p>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Compromiso de Retorno</label>
                        <p class="mt-1 text-sm text-gray-900">${movimiento.compromiso_retorno || 'No aplica'}</p>
                    </div>
                </div>
                
                <div class="mt-6 flex justify-end">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    showNotificationsModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Notificaciones</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="max-h-96 overflow-y-auto">
                    ${this.renderNotifications()}
                </div>
                
                <div class="mt-4 flex justify-end">
                    <button onclick="movimientosManager.markAllNotificationsAsRead()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                        Marcar todas como leídas
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    renderNotifications() {
        if (this.notificaciones.length === 0) {
            return `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-bell-slash text-3xl mb-2"></i>
                    <p>No tienes notificaciones</p>
                </div>
            `;
        }

        return this.notificaciones.map(notif => `
            <div class="p-3 border-b hover:bg-gray-50 ${notif.leido ? '' : 'bg-blue-50'}">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <p class="text-sm font-medium text-gray-900">${notif.equipo_nombre}</p>
                        <p class="text-xs text-gray-600 mt-1">${notif.mensaje}</p>
                        <p class="text-xs text-gray-500 mt-2">
                            ${new Date(notif.creado_en).toLocaleString()}
                        </p>
                    </div>
                    ${!notif.leido ? `
                        <button onclick="movimientosManager.markNotificationAsRead(${notif.id})" 
                                class="ml-2 text-blue-600 hover:text-blue-800"
                                title="Marcar como leída">
                            <i class="fas fa-check-circle"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    async markNotificationAsRead(notificationId) {
        try {
            const response = await fetch(`${API_URL}/notificaciones/${notificationId}/leer`, {
                method: 'PUT'
            });
            
            if (response.ok) {
                // Actualizar lista local
                const notifIndex = this.notificaciones.findIndex(n => n.id === notificationId);
                if (notifIndex !== -1) {
                    this.notificaciones[notifIndex].leido = true;
                }
                
                // Actualizar badge
                this.updateNotificationBadge();
                
                // Recargar notificaciones si el modal está abierto
                await this.loadNotifications();
            }
        } catch (error) {
            console.error('Error marcando notificación:', error);
        }
    }

    async markAllNotificationsAsRead() {
        try {
            for (const notif of this.notificaciones) {
                if (!notif.leido) {
                    await this.markNotificationAsRead(notif.id);
                }
            }
        } catch (error) {
            console.error('Error marcando todas las notificaciones:', error);
        }
    }

    updateNotificationBadge() {
        const unreadCount = this.notificaciones.filter(n => !n.leido).length;
        const badge = document.getElementById('notification-badge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `fixed top-4 right-4 z-50 animate-slide-in`;
        
        const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : 
                       type === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';
        const iconColor = type === 'success' ? 'text-green-600' : 
                         type === 'error' ? 'text-red-600' : 'text-blue-600';
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        
        toast.innerHTML = `
            <div class="${bgColor} border rounded-lg p-4 shadow-lg">
                <div class="flex items-center">
                    <div class="p-2 rounded-md mr-3 ${bgColor.replace('50', '100')}">
                        <i class="fas ${icon} ${iconColor}"></i>
                    </div>
                    <div>
                        <p class="font-medium ${iconColor.replace('600', '800')}">${message}</p>
                    </div>
                    <button onclick="document.getElementById('${toastId}').remove()" 
                            class="ml-4 ${iconColor.replace('600', '400')} hover:${iconColor}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    if (toast && toast.parentNode) toast.remove();
                }, 300);
            }
        }, 5000);
    }

    setupAutoRefresh() {
        // Actualizar notificaciones cada 30 segundos
        setInterval(() => {
            this.loadNotifications();
        }, 30000);
        
        // Actualizar movimientos cada minuto
        setInterval(() => {
            this.loadMovimientos();
        }, 60000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    window.movimientosManager = new MovimientosManager();
    console.log("🚀 Módulo de movimientos inicializado");
});