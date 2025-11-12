// Variables globales
let sedeActiva = null;
let sedes = [];
let productos = [];
let movimientos = [];
let todosLosProductos = [];
let productoAEliminar = null;
let movimientosFiltrados = [];
let productosFiltrados = [];
let proveedores = [];
let proveedoresFiltrados = [];
let proveedorAEliminar = null;

// URLs de la API
const API_BASE = "https://inventario-api-gw73.onrender.com";
const API_SEDES = `${API_BASE}/sedes`;
const API_PRODUCTOS = `${API_BASE}/productos`;
const API_PRODUCTOS_SEDE = `${API_BASE}/productos/sede`;
const API_MOVIMIENTOS = `${API_BASE}/movimientos-kardex`;
const API_ESTADISTICAS = `${API_BASE}/estadisticas/sede`;
const API_PROVEEDORES = `${API_BASE}/proveedores`;

// Inicialización
document.addEventListener("DOMContentLoaded", function () {
    console.log("🚀 Iniciando sistema Kardex...");
    inicializarSistema();
});

async function inicializarSistema() {
    try {
        console.log("🔧 Configurando sistema...");

        // Configurar fecha actual solo si el elemento existe
        const hoy = obtenerFechaLocal();
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            fechaInput.value = hoy;
        }

        // Cargar datos iniciales
        await cargarSedes();
        await cargarProveedores();

        // Configurar event listeners
        configurarEventListeners();

        console.log("✅ Sistema Kardex inicializado correctamente");

    } catch (error) {
        console.error("❌ Error inicializando sistema:", error);
        mostrarMensaje("Error al inicializar el sistema", true);
    }
}

function configurarEventListeners() {
    // Selector de sede
    const sedePrincipal = document.getElementById('sede-principal');
    if (sedePrincipal) {
        sedePrincipal.addEventListener('change', cambiarSedeActiva);
    }

    // Pestañas
    const tabMovimientos = document.getElementById('tab-movimientos');
    const tabProductos = document.getElementById('tab-productos');
    const tabProveedores = document.getElementById('tab-proveedores');
    
    if (tabMovimientos) tabMovimientos.addEventListener('click', () => cambiarPestana('movimientos'));
    if (tabProductos) tabProductos.addEventListener('click', () => cambiarPestana('productos'));
    if (tabProveedores) tabProveedores.addEventListener('click', () => cambiarPestana('proveedores'));

    // Formulario de movimientos
    const btnRegistrar = document.getElementById('btnRegistrar');
    const btnLimpiarForm = document.getElementById('btnLimpiarForm');
    const productoSelect = document.getElementById('producto');
    
    if (btnRegistrar) btnRegistrar.addEventListener('click', registrarMovimiento);
    if (btnLimpiarForm) btnLimpiarForm.addEventListener('click', limpiarFormularioMovimiento);
    if (productoSelect) productoSelect.addEventListener('change', actualizarInfoProducto);

    // Botones de productos
    const btnNuevoProducto = document.getElementById('btnNuevoProducto');
    const btnNuevoProducto2 = document.getElementById('btnNuevoProducto2');
    
    if (btnNuevoProducto) btnNuevoProducto.addEventListener('click', mostrarModalProducto);
    if (btnNuevoProducto2) btnNuevoProducto2.addEventListener('click', mostrarModalProducto);

    // Botones de proveedores
    const btnNuevoProveedor = document.getElementById('btnNuevoProveedor');
    if (btnNuevoProveedor) btnNuevoProveedor.addEventListener('click', mostrarModalProveedor);

    // Modales productos
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const formProducto = document.getElementById('formProducto');
    const btnCerrarModalEditar = document.getElementById('btnCerrarModalEditar');
    const formEditarProducto = document.getElementById('formEditarProducto');
    const btnCancelarEliminar = document.getElementById('btnCancelarEliminar');
    const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');
    
    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalProducto);
    if (formProducto) formProducto.addEventListener('submit', guardarProducto);
    if (btnCerrarModalEditar) btnCerrarModalEditar.addEventListener('click', cerrarModalEditarProducto);
    if (formEditarProducto) formEditarProducto.addEventListener('submit', actualizarProducto);
    if (btnCancelarEliminar) btnCancelarEliminar.addEventListener('click', cerrarModalConfirmarEliminar);
    if (btnConfirmarEliminar) btnConfirmarEliminar.addEventListener('click', eliminarProductoConfirmado);

    // Modales proveedores
    const btnCerrarModalProveedor = document.getElementById('btnCerrarModalProveedor');
    const formProveedor = document.getElementById('formProveedor');
    const btnCerrarModalEditarProveedor = document.getElementById('btnCerrarModalEditarProveedor');
    const formEditarProveedor = document.getElementById('formEditarProveedor');
    const btnCancelarEliminarProveedor = document.getElementById('btnCancelarEliminarProveedor');
    const btnConfirmarEliminarProveedor = document.getElementById('btnConfirmarEliminarProveedor');
    
    if (btnCerrarModalProveedor) btnCerrarModalProveedor.addEventListener('click', cerrarModalProveedor);
    if (formProveedor) formProveedor.addEventListener('submit', guardarProveedor);
    if (btnCerrarModalEditarProveedor) btnCerrarModalEditarProveedor.addEventListener('click', cerrarModalEditarProveedor);
    if (formEditarProveedor) formEditarProveedor.addEventListener('submit', actualizarProveedor);
    if (btnCancelarEliminarProveedor) btnCancelarEliminarProveedor.addEventListener('click', cerrarModalConfirmarEliminarProveedor);
    if (btnConfirmarEliminarProveedor) btnConfirmarEliminarProveedor.addEventListener('click', eliminarProveedorConfirmado);

    // FILTROS - MOVIMIENTOS
    const btnAplicarFiltrosMov = document.getElementById('btnAplicarFiltrosMov');
    const btnLimpiarFiltrosMov = document.getElementById('btnLimpiarFiltrosMov');
    const btnExportarMovimientos = document.getElementById('btnExportarMovimientos');
    
    if (btnAplicarFiltrosMov) btnAplicarFiltrosMov.addEventListener('click', aplicarFiltrosMovimientos);
    if (btnLimpiarFiltrosMov) btnLimpiarFiltrosMov.addEventListener('click', limpiarFiltrosMovimientos);
    if (btnExportarMovimientos) btnExportarMovimientos.addEventListener('click', exportarExcelMovimientos);

    // FILTROS - PRODUCTOS
    const btnAplicarFiltrosProd = document.getElementById('btnAplicarFiltrosProd');
    const btnLimpiarFiltrosProd = document.getElementById('btnLimpiarFiltrosProd');
    const btnExportarProductos = document.getElementById('btnExportarProductos');
    
    if (btnAplicarFiltrosProd) btnAplicarFiltrosProd.addEventListener('click', aplicarFiltrosProductos);
    if (btnLimpiarFiltrosProd) btnLimpiarFiltrosProd.addEventListener('click', limpiarFiltrosProductos);
    if (btnExportarProductos) btnExportarProductos.addEventListener('click', exportarExcelProductos);

    // FILTROS - PROVEEDORES
    const btnAplicarFiltrosProv = document.getElementById('btnAplicarFiltrosProv');
    const btnLimpiarFiltrosProv = document.getElementById('btnLimpiarFiltrosProv');
    const btnExportarProveedores = document.getElementById('btnExportarProveedores');
    
    if (btnAplicarFiltrosProv) btnAplicarFiltrosProv.addEventListener('click', aplicarFiltrosProveedores);
    if (btnLimpiarFiltrosProv) btnLimpiarFiltrosProv.addEventListener('click', limpiarFiltrosProveedores);
    if (btnExportarProveedores) btnExportarProveedores.addEventListener('click', exportarExcelProveedores);
}

// ====================
// FUNCIONES DE SEDE
// ====================

async function cargarSedes() {
    try {
        const response = await fetch(API_SEDES);
        if (!response.ok) throw new Error('Error al cargar sedes');

        sedes = await response.json();
        const select = document.getElementById('sede-principal');

        if (select) {
            select.innerHTML = '<option value="">Seleccione una sede para trabajar</option>';
            sedes.forEach(sede => {
                const option = document.createElement('option');
                option.value = sede.id;
                option.textContent = `${sede.nombre} (${sede.codigo})`;
                select.appendChild(option);
            });
        }

    } catch (error) {
        console.error('Error cargando sedes:', error);
        mostrarMensaje('Error cargando sedes', true);
    }
}

async function cambiarSedeActiva() {
    const select = document.getElementById('sede-principal');
    if (!select) return;
    
    sedeActiva = select.value;

    // Limpiar datos de la sede anterior
    limpiarDatosSede();

    if (!sedeActiva) {
        const panelPrincipal = document.getElementById('panel-principal');
        const infoSede = document.getElementById('info-sede');
        
        if (panelPrincipal) panelPrincipal.classList.add('hidden');
        if (infoSede) infoSede.classList.add('hidden');
        return;
    }

    // Mostrar información de la sede
    const sedeSeleccionada = document.getElementById('sede-seleccionada');
    const infoSede = document.getElementById('info-sede');
    const panelPrincipal = document.getElementById('panel-principal');
    
    if (sedeSeleccionada) {
        sedeSeleccionada.textContent = select.options[select.selectedIndex].text;
    }
    if (infoSede) infoSede.classList.remove('hidden');
    if (panelPrincipal) panelPrincipal.classList.remove('hidden');

    // Cargar datos de la sede
    await cargarDatosSede();
    await cargarTodosLosProductos();
}

async function cargarDatosSede() {
    if (!sedeActiva) return;

    try {
        await Promise.all([
            cargarEstadisticasSede(),
            cargarProductosSede(),
            cargarMovimientosRecientes()
        ]);
        mostrarMensaje('Datos de la sede cargados correctamente');
    } catch (error) {
        console.error('Error cargando datos de sede:', error);
        mostrarMensaje('Error cargando datos de la sede', true);
    }
}

async function cargarEstadisticasSede() {
    if (!sedeActiva) return;

    try {
        const response = await fetch(`${API_ESTADISTICAS}/${sedeActiva}`);
        if (!response.ok) throw new Error('Error al cargar estadísticas');

        const stats = await response.json();

        const totalProductos = document.getElementById('total-productos-count');
        const totalStock = document.getElementById('total-stock-count');
        const stockBajo = document.getElementById('stock-bajo-count');
        const totalMovimientos = document.getElementById('total-movimientos');
        
        if (totalProductos) totalProductos.textContent = stats.total_productos || 0;
        if (totalStock) totalStock.textContent = stats.total_stock || 0;
        if (stockBajo) stockBajo.textContent = stats.stock_bajo || 0;
        if (totalMovimientos) totalMovimientos.textContent = stats.total_movimientos || 0;

        // Mostrar totales financieros si existen - CORREGIDO: Solo para la sede activa
        if (document.getElementById('info-sede')) {
            const infoSede = document.getElementById('info-sede');
            let infoFinanciera = infoSede.querySelector('.info-financiera');
            if (!infoFinanciera) {
                infoFinanciera = document.createElement('div');
                infoFinanciera.className = 'info-financiera text-xs mt-1';
                infoSede.appendChild(infoFinanciera);
            }
            
            // Calcular valores financieros específicos para esta sede
            const movimientosSede = movimientos.filter(mov => mov.sede_id == sedeActiva);
            const totalEntradas = movimientosSede
                .filter(mov => mov.tipo_movimiento === 'ENTRADA')
                .reduce((sum, mov) => sum + (mov.total || 0), 0);
            
            const totalSalidas = movimientosSede
                .filter(mov => mov.tipo_movimiento === 'SALIDA')
                .reduce((sum, mov) => sum + (mov.total || 0), 0);
            
            const valorInventario = productos.reduce((sum, prod) => {
                const costoPromedio = prod.costo_promedio || prod.costo_unitario || 0;
                return sum + (prod.stock_actual * costoPromedio);
            }, 0);

            infoFinanciera.innerHTML = `
                <span class="text-green-600">Entradas: $${formatearMoneda(totalEntradas)}</span> | 
                <span class="text-red-600">Salidas: $${formatearMoneda(totalSalidas)}</span> |
                <span class="text-blue-600">Valor Inv: $${formatearMoneda(valorInventario)}</span>
            `;
        }

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// ====================
// FUNCIONES DE PROVEEDORES
// ====================

async function cargarProveedores() {
    try {
        const response = await fetch(API_PROVEEDORES);
        if (!response.ok) throw new Error('Error al cargar proveedores');

        proveedores = await response.json();
        proveedoresFiltrados = [...proveedores];
        
        // Actualizar select de proveedores en formularios
        actualizarSelectProveedores();
        
        // Si estamos en la pestaña de proveedores, cargar la tabla
        if (document.getElementById('contenido-proveedores')?.classList.contains('active')) {
            cargarTablaProveedores();
        }

    } catch (error) {
        console.error('Error cargando proveedores:', error);
        mostrarMensaje('Error cargando proveedores', true);
    }
}

function actualizarSelectProveedores() {
    // Select en formulario de productos
    const selectProducto = document.getElementById('producto-proveedor');
    const selectEditarProducto = document.getElementById('editar-producto-proveedor');
    const filtroProveedorProducto = document.getElementById('filtro-proveedor-producto');
    
    [selectProducto, selectEditarProducto, filtroProveedorProducto].forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">Seleccionar proveedor</option>';
            proveedores.forEach(prov => {
                const option = document.createElement('option');
                option.value = prov.id;
                option.textContent = `${prov.razon_social} (${prov.nit})`;
                select.appendChild(option);
            });
        }
    });
}

function cargarTablaProveedores() {
    const tbody = document.querySelector('#tabla-proveedores tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (proveedoresFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-4 text-center text-gray-500">
                    No hay proveedores registrados
                </td>
            </tr>
        `;
        return;
    }

    proveedoresFiltrados.forEach(prov => {
        const productosAsociados = todosLosProductos.filter(p => p.proveedor_id == prov.id).length;
        
        const fila = document.createElement('tr');
        fila.className = 'hover:bg-gray-50 border-b';
        fila.innerHTML = `
            <td class="px-4 py-2 border">
                <div class="font-medium">${prov.razon_social}</div>
            </td>
            <td class="px-4 py-2 border">${prov.nit}</td>
            <td class="px-4 py-2 border">${prov.correo || '-'}</td>
            <td class="px-4 py-2 border">${prov.telefono || '-'}</td>
            <td class="px-4 py-2 border">${prov.direccion || '-'}</td>
            <td class="px-4 py-2 border text-center">
                <span class="badge-info">${productosAsociados}</span>
            </td>
            <td class="px-4 py-2 border">
                <div class="flex gap-2">
                    <button onclick="editarProveedor(${prov.id})" class="btn-warning-sm btn-sm">
                        <i class="fas fa-edit mr-1"></i>Editar
                    </button>
                    <button onclick="confirmarEliminarProveedor(${prov.id}, '${prov.razon_social.replace(/'/g, "\\'")}')" 
                            class="btn-danger-sm btn-sm ${productosAsociados > 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                            ${productosAsociados > 0 ? 'disabled' : ''}>
                        <i class="fas fa-trash mr-1"></i>Eliminar
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// Modales proveedores
function mostrarModalProveedor() {
    const modal = document.getElementById('modalProveedor');
    if (modal) modal.classList.add('active');
}

function cerrarModalProveedor() {
    const modal = document.getElementById('modalProveedor');
    const form = document.getElementById('formProveedor');
    
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
}

async function guardarProveedor(event) {
    event.preventDefault();

    const proveedorData = {
        razon_social: document.getElementById('proveedor-razon-social').value,
        nit: document.getElementById('proveedor-nit').value,
        correo: document.getElementById('proveedor-correo').value,
        telefono: document.getElementById('proveedor-telefono').value,
        direccion: document.getElementById('proveedor-direccion').value
    };

    try {
        const response = await fetch(API_PROVEEDORES, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(proveedorData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear proveedor');
        }

        const nuevoProveedor = await response.json();

        cerrarModalProveedor();
        mostrarMensaje('Proveedor creado correctamente');

        // Recargar proveedores
        await cargarProveedores();

    } catch (error) {
        console.error('Error creando proveedor:', error);
        mostrarMensaje(error.message, true);
    }
}

async function editarProveedor(proveedorId) {
    try {
        const proveedor = proveedores.find(p => p.id == proveedorId);
        if (!proveedor) {
            mostrarMensaje('Proveedor no encontrado', true);
            return;
        }

        document.getElementById('editar-proveedor-id').value = proveedor.id;
        document.getElementById('editar-proveedor-razon-social').value = proveedor.razon_social;
        document.getElementById('editar-proveedor-nit').value = proveedor.nit;
        document.getElementById('editar-proveedor-correo').value = proveedor.correo || '';
        document.getElementById('editar-proveedor-telefono').value = proveedor.telefono || '';
        document.getElementById('editar-proveedor-direccion').value = proveedor.direccion || '';

        const modal = document.getElementById('modalEditarProveedor');
        if (modal) modal.classList.add('active');

    } catch (error) {
        console.error('Error preparando edición:', error);
        mostrarMensaje('Error al cargar datos del proveedor', true);
    }
}

function cerrarModalEditarProveedor() {
    const modal = document.getElementById('modalEditarProveedor');
    const form = document.getElementById('formEditarProveedor');
    
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
}

async function actualizarProveedor(event) {
    event.preventDefault();

    const proveedorId = document.getElementById('editar-proveedor-id').value;
    const proveedorData = {
        razon_social: document.getElementById('editar-proveedor-razon-social').value,
        nit: document.getElementById('editar-proveedor-nit').value,
        correo: document.getElementById('editar-proveedor-correo').value,
        telefono: document.getElementById('editar-proveedor-telefono').value,
        direccion: document.getElementById('editar-proveedor-direccion').value
    };

    try {
        const response = await fetch(`${API_PROVEEDORES}/${proveedorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(proveedorData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al actualizar proveedor');
        }

        const proveedorActualizado = await response.json();

        cerrarModalEditarProveedor();
        mostrarMensaje('Proveedor actualizado correctamente');

        // Recargar proveedores
        await cargarProveedores();

    } catch (error) {
        console.error('Error actualizando proveedor:', error);
        mostrarMensaje(error.message, true);
    }
}

function confirmarEliminarProveedor(proveedorId, proveedorNombre) {
    proveedorAEliminar = proveedorId;
    const mensaje = document.getElementById('mensaje-confirmacion-proveedor');
    const modal = document.getElementById('modalConfirmarEliminarProveedor');
    
    if (mensaje) {
        mensaje.textContent = `¿Está seguro de que desea eliminar el proveedor "${proveedorNombre}"?`;
    }
    if (modal) modal.classList.add('active');
}

function cerrarModalConfirmarEliminarProveedor() {
    const modal = document.getElementById('modalConfirmarEliminarProveedor');
    if (modal) modal.classList.remove('active');
    proveedorAEliminar = null;
}

async function eliminarProveedorConfirmado() {
    if (!proveedorAEliminar) return;

    try {
        const response = await fetch(`${API_PROVEEDORES}/${proveedorAEliminar}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar proveedor');
        }

        const resultado = await response.json();

        cerrarModalConfirmarEliminarProveedor();
        mostrarMensaje('Proveedor eliminado correctamente');

        // Recargar proveedores
        await cargarProveedores();

    } catch (error) {
        console.error('Error eliminando proveedor:', error);
        mostrarMensaje(error.message, true);
        cerrarModalConfirmarEliminarProveedor();
    }
}

// Filtros proveedores
function aplicarFiltrosProveedores() {
    const razonSocial = document.getElementById('filtro-razon-social')?.value.toLowerCase() || '';
    const nit = document.getElementById('filtro-nit')?.value.toLowerCase() || '';

    proveedoresFiltrados = proveedores.filter(prov => {
        let cumple = true;

        if (razonSocial && !prov.razon_social.toLowerCase().includes(razonSocial)) {
            cumple = false;
        }

        if (nit && !prov.nit.toLowerCase().includes(nit)) {
            cumple = false;
        }

        return cumple;
    });

    cargarTablaProveedores();
    mostrarMensaje(`Se encontraron ${proveedoresFiltrados.length} proveedores`);
}

function limpiarFiltrosProveedores() {
    const razonSocial = document.getElementById('filtro-razon-social');
    const nit = document.getElementById('filtro-nit');
    
    if (razonSocial) razonSocial.value = '';
    if (nit) nit.value = '';

    proveedoresFiltrados = [...proveedores];
    cargarTablaProveedores();
    mostrarMensaje('Filtros limpiados correctamente');
}

// ====================
// FUNCIONES DE PRODUCTOS POR SEDE
// ====================

async function cargarProductosSede() {
    if (!sedeActiva) return;

    try {
        console.log(`📦 Cargando productos para sede: ${sedeActiva}`);
        const response = await fetch(`${API_PRODUCTOS_SEDE}/${sedeActiva}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        productos = await response.json();
        console.log(`✅ Productos cargados: ${productos.length} productos`);

        // Actualizar select de productos en el formulario
        const select = document.getElementById('producto');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar producto</option>';

            productos.forEach(prod => {
                const option = document.createElement('option');
                option.value = prod.id;
                option.textContent = `${prod.nombre} (Stock: ${prod.stock_actual})`;
                option.dataset.unidad = prod.unidad;
                option.dataset.stock = prod.stock_actual;
                select.appendChild(option);
            });
        }

    } catch (error) {
        console.error('❌ Error cargando productos de sede:', error);
        mostrarMensaje('Error cargando productos de la sede: ' + error.message, true);
    }
}

async function cargarTodosLosProductos() {
    try {
        if (!sedeActiva) {
            productosFiltrados = [];
            return;
        }

        console.log(`📋 Cargando todos los productos para sede: ${sedeActiva}`);
        const response = await fetch(`${API_PRODUCTOS_SEDE}/${sedeActiva}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        todosLosProductos = await response.json();
        productosFiltrados = [...todosLosProductos];
        
        console.log(`✅ Todos los productos cargados: ${todosLosProductos.length} productos`);

        // Llenar select de filtro de productos en movimientos
        const selectFiltro = document.getElementById('filtro-producto-mov');
        if (selectFiltro) {
            selectFiltro.innerHTML = '<option value="">Todos los productos</option>';
            todosLosProductos.forEach(prod => {
                const option = document.createElement('option');
                option.value = prod.id;
                option.textContent = prod.nombre;
                selectFiltro.appendChild(option);
            });
        }

        if (document.getElementById('contenido-productos')?.classList.contains('active')) {
            cargarTablaProductos();
        }

    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        mostrarMensaje('Error cargando productos de la sede: ' + error.message, true);
    }
}

function cargarTablaProductos() {
    const tbody = document.querySelector('#tabla-productos tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (productosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-4 text-center text-gray-500">
                    No hay productos registrados en esta sede
                </td>
            </tr>
        `;
        return;
    }

    productosFiltrados.forEach(prod => {
        const estadoStock = (prod.stock_actual || 0) < 10 ?
            '<span class="badge-warning">Stock Bajo</span>' :
            '<span class="badge-success">Stock Normal</span>';

        const proveedorNombre = prod.proveedor_nombre || 'No asignado';
        
        const fila = document.createElement('tr');
        fila.className = 'hover:bg-gray-50 border-b';
        fila.innerHTML = `
            <td class="px-4 py-2 border">
                <div class="font-medium">${prod.nombre}</div>
                <div class="text-sm text-gray-500">${prod.descripcion || 'Sin descripción'}</div>
            </td>
            <td class="px-4 py-2 border">${prod.categoria || '-'}</td>
            <td class="px-4 py-2 border text-center">${prod.unidad}</td>
            <td class="px-4 py-2 border">${proveedorNombre}</td>
            <td class="px-4 py-2 border text-right">
                <span class="font-semibold ${(prod.stock_actual || 0) < 10 ? 'text-red-600' : 'text-green-600'}">
                    ${prod.stock_actual || 0}
                </span>
                <div class="text-xs mt-1">${estadoStock}</div>
            </td>
            <td class="px-4 py-2 border">${prod.registro_invima || '-'}</td>
            <td class="px-4 py-2 border text-center">
                <span class="badge-info">${prod.total_movimientos || 0}</span>
            </td>
            <td class="px-4 py-2 border">
                <div class="flex gap-2">
                    <button onclick="editarProducto(${prod.id})" class="btn-warning-sm btn-sm">
                        <i class="fas fa-edit mr-1"></i>Editar
                    </button>
                    <button onclick="confirmarEliminarProducto(${prod.id}, '${prod.nombre.replace(/'/g, "\\'")}')" class="btn-danger-sm btn-sm">
                        <i class="fas fa-trash mr-1"></i>Eliminar
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// Función para limpiar y resetear datos al cambiar sede
function limpiarDatosSede() {
    productos = [];
    todosLosProductos = [];
    productosFiltrados = [];
    movimientos = [];
    movimientosFiltrados = [];
    
    // Limpiar selects
    const selectProducto = document.getElementById('producto');
    if (selectProducto) {
        selectProducto.innerHTML = '<option value="">Seleccionar producto</option>';
    }
    
    const selectFiltroProducto = document.getElementById('filtro-producto-mov');
    if (selectFiltroProducto) {
        selectFiltroProducto.innerHTML = '<option value="">Todos los productos</option>';
    }
    
    // Limpiar tablas
    const tbodyProductos = document.querySelector('#tabla-productos tbody');
    if (tbodyProductos) {
        tbodyProductos.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-4 text-center text-gray-500">
                    Seleccione una sede para ver los productos
                </td>
            </tr>
        `;
    }
    
    const tbodyMovimientos = document.querySelector('#tabla-movimientos-recientes tbody');
    if (tbodyMovimientos) {
        tbodyMovimientos.innerHTML = `
            <tr>
                <td colspan="10" class="px-4 py-4 text-center text-gray-500">
                    Seleccione una sede para ver los movimientos
                </td>
            </tr>
        `;
    }
    
    // Resetear estadísticas
    const totalProductos = document.getElementById('total-productos-count');
    const totalStock = document.getElementById('total-stock-count');
    const stockBajo = document.getElementById('stock-bajo-count');
    const totalMovimientos = document.getElementById('total-movimientos');
    
    if (totalProductos) totalProductos.textContent = '0';
    if (totalStock) totalStock.textContent = '0';
    if (stockBajo) stockBajo.textContent = '0';
    if (totalMovimientos) totalMovimientos.textContent = '0';
    
    // Limpiar información financiera
    const infoSede = document.getElementById('info-sede');
    if (infoSede) {
        const infoFinanciera = infoSede.querySelector('.info-financiera');
        if (infoFinanciera) {
            infoFinanciera.remove();
        }
    }
}

// ====================
// FUNCIONES DE MOVIMIENTOS - CORREGIDAS PARA FECHAS
// ====================

async function cargarMovimientosRecientes() {
    if (!sedeActiva) return;

    try {
        const response = await fetch(`${API_MOVIMIENTOS}?sede_id=${sedeActiva}&limit=50`);
        if (!response.ok) throw new Error('Error al cargar movimientos');

        movimientos = await response.json();
        
        // CORRECCIÓN CRÍTICA: Aplicar corrección de fecha a todos los movimientos
        movimientos.forEach(mov => {
            mov.fecha_corregida = corregirFechaDesdeBackend(mov.fecha);
            if (mov.fecha_vencimiento_formateada) {
                mov.fecha_vencimiento_corregida = corregirFechaDesdeBackend(mov.fecha_vencimiento_formateada);
            }
        });
        
        movimientosFiltrados = [...movimientos];
        renderizarMovimientosRecientes();

    } catch (error) {
        console.error('Error cargando movimientos:', error);
    }
}

function renderizarMovimientosRecientes() {
    const tbody = document.querySelector('#tabla-movimientos-recientes tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (movimientosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="px-4 py-4 text-center text-gray-500">
                    No hay movimientos que coincidan con los filtros
                </td>
            </tr>
        `;
        return;
    }

    movimientosFiltrados.forEach(mov => {
        // USAR FECHA CORREGIDA en lugar de la original
        const fechaMostrar = mov.fecha_corregida || mov.fecha;
        const fechaVencimiento = mov.fecha_vencimiento_corregida || mov.fecha_vencimiento_formateada;
        const fechaVencimientoFormateada = fechaVencimiento ? 
            formatearFechaLocal(fechaVencimiento) : '-';
        
        const claseVencimiento = esProductoVencido(fechaVencimiento) ? 
            'text-red-600 font-semibold' : '';
        
        const fila = document.createElement('tr');
        fila.className = 'hover:bg-gray-50 border-b';
        fila.innerHTML = `
            <td class="px-4 py-2 border text-sm">${formatearFechaLocal(fechaMostrar)}</td>
            <td class="px-4 py-2 border text-sm">${mov.hora_formateada || '-'}</td>
            <td class="px-4 py-2 border text-sm font-medium">${mov.producto_nombre}</td>
            <td class="px-4 py-2 border">
                <span class="px-2 py-1 rounded text-xs font-semibold ${mov.tipo_movimiento === 'ENTRADA' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}">
                    ${mov.tipo_movimiento}
                </span>
            </td>
            <td class="px-4 py-2 border text-sm">${mov.descripcion || '-'}</td>
            <td class="px-4 py-2 border text-sm">${mov.ubicacion || '-'}</td>
            <td class="px-4 py-2 border text-right font-semibold">${mov.cantidad}</td>
            <td class="px-4 py-2 border text-right ${mov.stock_actual < 10 ? 'text-red-600 font-semibold' : 'text-green-600'}">
                ${mov.stock_actual}
            </td>
            <td class="px-4 py-2 border text-sm ${claseVencimiento}">
                ${fechaVencimientoFormateada}
            </td>
            <td class="px-4 py-2 border text-right font-semibold">$${formatearMoneda(mov.total || 0)}</td>
        `;
        tbody.appendChild(fila);
    });
}

function esProductoVencido(fechaVencimiento) {
    if (!fechaVencimiento) return false;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    return vencimiento < hoy;
}

// ====================
// FUNCIONES DE FILTROS - CORREGIDAS PARA FECHAS
// ====================

function aplicarFiltrosMovimientos() {
    const productoId = document.getElementById('filtro-producto-mov')?.value || '';
    const tipoMovimiento = document.getElementById('filtro-tipo-mov')?.value || '';
    const fechaInicio = document.getElementById('filtro-fecha-inicio')?.value || '';
    const fechaFin = document.getElementById('filtro-fecha-fin')?.value || '';

    movimientosFiltrados = movimientos.filter(mov => {
        let cumple = true;

        if (productoId && mov.producto_id != productoId) {
            cumple = false;
        }

        if (tipoMovimiento && mov.tipo_movimiento !== tipoMovimiento) {
            cumple = false;
        }

        // CORREGIDO: Usar fecha corregida para filtros
        const fechaMov = mov.fecha_corregida || mov.fecha;
        
        if (fechaInicio && fechaMov < fechaInicio) {
            cumple = false;
        }

        if (fechaFin && fechaMov > fechaFin) {
            cumple = false;
        }

        return cumple;
    });

    renderizarMovimientosRecientes();
    mostrarMensaje(`Se encontraron ${movimientosFiltrados.length} movimientos`);
}

function limpiarFiltrosMovimientos() {
    const filtroProducto = document.getElementById('filtro-producto-mov');
    const filtroTipo = document.getElementById('filtro-tipo-mov');
    const filtroFechaInicio = document.getElementById('filtro-fecha-inicio');
    const filtroFechaFin = document.getElementById('filtro-fecha-fin');
    
    if (filtroProducto) filtroProducto.value = '';
    if (filtroTipo) filtroTipo.value = '';
    if (filtroFechaInicio) filtroFechaInicio.value = '';
    if (filtroFechaFin) filtroFechaFin.value = '';

    movimientosFiltrados = [...movimientos];
    renderizarMovimientosRecientes();
    mostrarMensaje('Filtros limpiados correctamente');
}

function aplicarFiltrosProductos() {
    const nombre = document.getElementById('filtro-nombre-producto')?.value.toLowerCase() || '';
    const categoria = document.getElementById('filtro-categoria-producto')?.value.toLowerCase() || '';
    const stock = document.getElementById('filtro-stock-producto')?.value || '';
    const unidad = document.getElementById('filtro-unidad-producto')?.value || '';
    const proveedor = document.getElementById('filtro-proveedor-producto')?.value || '';

    productosFiltrados = todosLosProductos.filter(prod => {
        let cumple = true;

        if (nombre && !prod.nombre.toLowerCase().includes(nombre)) {
            cumple = false;
        }

        if (categoria && (!prod.categoria || !prod.categoria.toLowerCase().includes(categoria))) {
            cumple = false;
        }

        if (stock) {
            const stockActual = prod.stock_actual || 0;
            if (stock === 'bajo' && stockActual >= 10) {
                cumple = false;
            } else if (stock === 'normal' && (stockActual < 10 || stockActual === 0)) {
                cumple = false;
            } else if (stock === 'sin-stock' && stockActual > 0) {
                cumple = false;
            }
        }

        if (unidad && prod.unidad !== unidad) {
            cumple = false;
        }

        if (proveedor && prod.proveedor_id != proveedor) {
            cumple = false;
        }

        return cumple;
    });

    cargarTablaProductos();
    mostrarMensaje(`Se encontraron ${productosFiltrados.length} productos`);
}

function limpiarFiltrosProductos() {
    const filtroNombre = document.getElementById('filtro-nombre-producto');
    const filtroCategoria = document.getElementById('filtro-categoria-producto');
    const filtroStock = document.getElementById('filtro-stock-producto');
    const filtroUnidad = document.getElementById('filtro-unidad-producto');
    const filtroProveedor = document.getElementById('filtro-proveedor-producto');
    
    if (filtroNombre) filtroNombre.value = '';
    if (filtroCategoria) filtroCategoria.value = '';
    if (filtroStock) filtroStock.value = '';
    if (filtroUnidad) filtroUnidad.value = '';
    if (filtroProveedor) filtroProveedor.value = '';

    productosFiltrados = [...todosLosProductos];
    cargarTablaProductos();
    mostrarMensaje('Filtros limpiados correctamente');
}

// ====================
// FUNCIONES DE EXPORTACIÓN EXCEL - CORREGIDAS PARA FECHAS
// ====================

async function exportarExcelMovimientos() {
    const btn = document.getElementById('btnExportarMovimientos');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        btn.disabled = true;

        console.log('🎯 Iniciando exportación de movimientos...');
        mostrarMensaje('🔄 Generando reporte de movimientos...', false);

        if (!movimientosFiltrados || movimientosFiltrados.length === 0) {
            mostrarMensaje('❌ No hay movimientos para exportar', true);
            return;
        }

        console.log(`📊 Movimientos obtenidos: ${movimientosFiltrados.length} registros`);

        if (typeof XLSX === 'undefined') {
            throw new Error('La biblioteca Excel no está cargada. Recarga la página.');
        }

        const wb = XLSX.utils.book_new();
        
        // Hoja 1: Movimientos detallados - CORREGIDO: Usar fechas corregidas
        const datosMovimientos = movimientosFiltrados.map(mov => {
            const fechaMostrar = mov.fecha_corregida || mov.fecha;
            const fechaVencimiento = mov.fecha_vencimiento_corregida || mov.fecha_vencimiento_formateada;
            
            return {
                'Fecha': formatearFechaLocal(fechaMostrar),
                'Hora': mov.hora_formateada || '',
                'Producto': mov.producto_nombre || '',
                'Tipo': mov.tipo_movimiento,
                'Descripción': mov.descripcion || '',
                'Ubicación': mov.ubicacion || '',
                'Cantidad': mov.cantidad,
                'Unidad': mov.unidad,
                'Stock Anterior': mov.stock_anterior,
                'Stock Actual': mov.stock_actual,
                'Fecha Vencimiento': fechaVencimiento ? formatearFechaLocal(fechaVencimiento) : '',
                'Costo Unitario': mov.costo ? `$${formatearMoneda(mov.costo)}` : '$0.00',
                'Total': mov.total ? `$${formatearMoneda(mov.total)}` : '$0.00'
            };
        });
        
        const wsMovimientos = XLSX.utils.json_to_sheet(datosMovimientos);
        XLSX.utils.book_append_sheet(wb, wsMovimientos, "Movimientos");

        // Hoja 2: Resumen
        const datosResumen = [
            ['REPORTE DE MOVIMIENTOS - KARDEX'],
            ['Sede:', document.getElementById('sede-seleccionada')?.textContent || ''],
            ['Fecha:', new Date().toLocaleDateString('es-ES')],
            ['Total movimientos:', movimientosFiltrados.length],
            [],
            ['Resumen por tipo:'],
            ['Tipo', 'Cantidad', 'Valor Total']
        ];

        const resumen = {};
        movimientosFiltrados.forEach(mov => {
            const tipo = mov.tipo_movimiento;
            if (!resumen[tipo]) {
                resumen[tipo] = { cantidad: 0, valor: 0 };
            }
            resumen[tipo].cantidad++;
            resumen[tipo].valor += mov.total || 0;
        });

        Object.entries(resumen).forEach(([tipo, datos]) => {
            datosResumen.push([tipo, datos.cantidad, `$${formatearMoneda(datos.valor)}`]);
        });

        const wsResumen = XLSX.utils.aoa_to_sheet(datosResumen);
        XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

        const sedeNombre = document.getElementById('sede-seleccionada')?.textContent || 'Sede';
        const fecha = obtenerFechaLocal();
        const nombreArchivo = `Movimientos_Kardex_${sedeNombre.replace(/\s+/g, '_')}_${fecha}.xlsx`;
        
        XLSX.writeFile(wb, nombreArchivo);
        
        mostrarMensaje(`✅ Reporte exportado: ${movimientosFiltrados.length} movimientos`, false);
        console.log('✅ Excel generado:', nombreArchivo);

    } catch (error) {
        console.error('❌ Error exportando movimientos:', error);
        mostrarMensaje('❌ Error al exportar: ' + error.message, true);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function exportarExcelProductos() {
    const btn = document.getElementById('btnExportarProductos');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        btn.disabled = true;

        console.log('🎯 Iniciando exportación de productos...');
        mostrarMensaje('🔄 Generando inventario de productos...', false);

        if (!productosFiltrados || productosFiltrados.length === 0) {
            mostrarMensaje('❌ No hay productos para exportar', true);
            return;
        }

        console.log(`📊 Productos obtenidos: ${productosFiltrados.length} registros`);

        if (typeof XLSX === 'undefined') {
            throw new Error('La biblioteca Excel no está cargada. Recarga la página.');
        }

        const wb = XLSX.utils.book_new();
        
        const datosProductos = productosFiltrados.map(prod => {
            const estadoStock = (prod.stock_actual || 0) < 10 ? 'STOCK BAJO' :
                (prod.stock_actual || 0) === 0 ? 'SIN STOCK' : 'NORMAL';

            return {
                'Nombre': prod.nombre || '',
                'Descripción': prod.descripcion || '',
                'Categoría': prod.categoria || '',
                'Unidad': prod.unidad,
                'Proveedor': prod.proveedor_nombre || 'No asignado',
                'Registro Invima': prod.registro_invima || '',
                'Stock Actual': prod.stock_actual || 0,
                'Ubicación': prod.ubicacion_stock || '',
                'Total Movimientos': prod.total_movimientos || 0,
                'Estado Stock': estadoStock
            };
        });
        
        const wsProductos = XLSX.utils.json_to_sheet(datosProductos);
        XLSX.utils.book_append_sheet(wb, wsProductos, "Productos");

        const totalProductos = productosFiltrados.length;
        const totalStock = productosFiltrados.reduce((sum, prod) => sum + (prod.stock_actual || 0), 0);
        const productosStockBajo = productosFiltrados.filter(prod => (prod.stock_actual || 0) < 10).length;
        const productosSinStock = productosFiltrados.filter(prod => (prod.stock_actual || 0) === 0).length;

        const datosResumen = [
            ['INVENTARIO DE PRODUCTOS - KARDEX'],
            ['Sede:', document.getElementById('sede-seleccionada')?.textContent || ''],
            ['Fecha:', new Date().toLocaleDateString('es-ES')],
            ['Total productos:', totalProductos],
            ['Stock total:', totalStock],
            ['Productos con stock bajo:', productosStockBajo],
            ['Productos sin stock:', productosSinStock],
            [],
            ['Resumen por categoría:'],
            ['Categoría', 'Cantidad']
        ];

        const resumenCategoria = {};
        productosFiltrados.forEach(prod => {
            const categoria = prod.categoria || 'Sin categoría';
            resumenCategoria[categoria] = (resumenCategoria[categoria] || 0) + 1;
        });

        Object.entries(resumenCategoria).forEach(([categoria, cantidad]) => {
            datosResumen.push([categoria, cantidad]);
        });

        const wsResumen = XLSX.utils.aoa_to_sheet(datosResumen);
        XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

        if (productosStockBajo > 0) {
            const productosBajo = productosFiltrados.filter(prod => (prod.stock_actual || 0) < 10);
            const datosStockBajo = productosBajo.map(prod => ({
                'Nombre': prod.nombre || '',
                'Categoría': prod.categoria || '',
                'Proveedor': prod.proveedor_nombre || 'No asignado',
                'Stock Actual': prod.stock_actual || 0,
                'Stock Recomendado': 10,
                'Déficit': 10 - (prod.stock_actual || 0),
                'Ubicación': prod.ubicacion_stock || ''
            }));
            
            const wsStockBajo = XLSX.utils.json_to_sheet(datosStockBajo);
            XLSX.utils.book_append_sheet(wb, wsStockBajo, "Stock Bajo");
        }

        const sedeNombre = document.getElementById('sede-seleccionada')?.textContent || 'Sede';
        const fecha = obtenerFechaLocal();
        const nombreArchivo = `Inventario_Productos_${sedeNombre.replace(/\s+/g, '_')}_${fecha}.xlsx`;
        
        XLSX.writeFile(wb, nombreArchivo);
        
        mostrarMensaje(`✅ Inventario exportado: ${productosFiltrados.length} productos`, false);
        console.log('✅ Excel generado:', nombreArchivo);

    } catch (error) {
        console.error('❌ Error exportando productos:', error);
        mostrarMensaje('❌ Error al exportar: ' + error.message, true);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function exportarExcelProveedores() {
    const btn = document.getElementById('btnExportarProveedores');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        btn.disabled = true;

        console.log('🎯 Iniciando exportación de proveedores...');
        mostrarMensaje('🔄 Generando reporte de proveedores...', false);

        if (!proveedoresFiltrados || proveedoresFiltrados.length === 0) {
            mostrarMensaje('❌ No hay proveedores para exportar', true);
            return;
        }

        console.log(`📊 Proveedores obtenidos: ${proveedoresFiltrados.length} registros`);

        if (typeof XLSX === 'undefined') {
            throw new Error('La biblioteca Excel no está cargada. Recarga la página.');
        }

        const wb = XLSX.utils.book_new();
        
        const datosProveedores = proveedoresFiltrados.map(prov => {
            const productosAsociados = todosLosProductos.filter(p => p.proveedor_id == prov.id).length;
            
            return {
                'Razón Social': prov.razon_social || '',
                'NIT': prov.nit || '',
                'Correo Electrónico': prov.correo || '',
                'Teléfono': prov.telefono || '',
                'Dirección': prov.direccion || '',
                'Productos Asociados': productosAsociados,
                'Fecha Registro': formatearFechaLocal(prov.created_at)
            };
        });
        
        const wsProveedores = XLSX.utils.json_to_sheet(datosProveedores);
        XLSX.utils.book_append_sheet(wb, wsProveedores, "Proveedores");

        const fecha = obtenerFechaLocal();
        const nombreArchivo = `Proveedores_Kardex_${fecha}.xlsx`;
        
        XLSX.writeFile(wb, nombreArchivo);
        
        mostrarMensaje(`✅ Reporte exportado: ${proveedoresFiltrados.length} proveedores`, false);
        console.log('✅ Excel generado:', nombreArchivo);

    } catch (error) {
        console.error('❌ Error exportando proveedores:', error);
        mostrarMensaje('❌ Error al exportar: ' + error.message, true);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ====================
// FUNCIONES DEL FORMULARIO
// ====================

function actualizarInfoProducto() {
    const select = document.getElementById('producto');
    const productoId = select?.value;
    const infoStock = document.getElementById('info-stock');
    const unidadSpan = document.getElementById('unidad-producto');
    const stockSpan = document.getElementById('stock-actual');
    const alertaSpan = document.getElementById('alerta-stock');

    if (!productoId || !infoStock) {
        if (infoStock) infoStock.classList.add('hidden');
        return;
    }

    const producto = productos.find(p => p.id == productoId);
    if (producto) {
        if (unidadSpan) unidadSpan.textContent = producto.unidad;
        if (stockSpan) stockSpan.textContent = producto.stock_actual;

        if (producto.stock_actual < 10) {
            if (alertaSpan) {
                alertaSpan.textContent = '⚠️ Stock bajo';
                alertaSpan.classList.remove('hidden');
            }
            infoStock.classList.add('stock-bajo');
        } else {
            if (alertaSpan) alertaSpan.classList.add('hidden');
            infoStock.classList.remove('stock-bajo');
        }

        infoStock.classList.remove('hidden');
    }
}

async function registrarMovimiento() {
    if (!sedeActiva) {
        mostrarMensaje('Primero seleccione una sede', true);
        return;
    }

    // Obtener datos del formulario
    const fechaInput = document.getElementById('fecha');
    const fecha = fechaInput?.value;
    const productoId = document.getElementById('producto')?.value;
    const tipo = document.getElementById('tipo')?.value;
    const descripcion = document.getElementById('descripcion')?.value;
    const ubicacion = document.getElementById('ubicacion')?.value;
    const cantidad = parseInt(document.getElementById('cantidad')?.value || '0');
    const costo = parseFloat(document.getElementById('costo')?.value || '0');
    const fechaVencimiento = document.getElementById('fecha-vencimiento')?.value;

    // Validaciones
    if (!fecha || !productoId || !tipo || !cantidad || !costo || cantidad <= 0 || costo <= 0) {
        mostrarMensaje('Complete todos los campos con valores válidos', true);
        return;
    }

    // Validar stock para salidas
    if (tipo === 'SALIDA') {
        const producto = productos.find(p => p.id == productoId);
        if (producto && producto.stock_actual < cantidad) {
            mostrarMensaje(`Stock insuficiente. Stock actual: ${producto.stock_actual}, Cantidad solicitada: ${cantidad}`, true);
            return;
        }
    }

    try {
        // ENVIAR FECHA EXACTA - SIN MODIFICACIONES
        const movimientoData = {
            fecha: fecha, // Enviar exactamente lo que el usuario seleccionó
            producto_id: parseInt(productoId),
            sede_id: parseInt(sedeActiva),
            tipo_movimiento: tipo,
            descripcion: descripcion || '',
            ubicacion: ubicacion || '',
            cantidad: cantidad,
            costo: costo,
            fecha_vencimiento: fechaVencimiento || null
        };

        // Mostrar loading
        const btn = document.getElementById('btnRegistrar');
        if (btn) {
            btn.classList.add('loading');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
        }

        const response = await fetch(API_MOVIMIENTOS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(movimientoData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al registrar movimiento');
        }

        const resultado = await response.json();

        // Recargar datos
        await cargarDatosSede();

        // Limpiar formulario
        limpiarFormularioMovimiento();

        mostrarMensaje('Movimiento registrado correctamente');

    } catch (error) {
        console.error('Error registrando movimiento:', error);
        mostrarMensaje(error.message, true);
    } finally {
        // Restaurar botón
        const btn = document.getElementById('btnRegistrar');
        if (btn) {
            btn.classList.remove('loading');
            btn.innerHTML = '<i class="fas fa-save mr-2"></i>Registrar Movimiento';
        }
    }
}

function limpiarFormularioMovimiento() {
    const producto = document.getElementById('producto');
    const tipo = document.getElementById('tipo');
    const descripcion = document.getElementById('descripcion');
    const ubicacion = document.getElementById('ubicacion');
    const cantidad = document.getElementById('cantidad');
    const costo = document.getElementById('costo');
    const fechaVencimiento = document.getElementById('fecha-vencimiento');
    const infoStock = document.getElementById('info-stock');
    const unidadProducto = document.getElementById('unidad-producto');
    
    if (producto) producto.value = '';
    if (tipo) tipo.value = '';
    if (descripcion) descripcion.value = '';
    if (ubicacion) ubicacion.value = '';
    if (cantidad) cantidad.value = '';
    if (costo) costo.value = '';
    if (fechaVencimiento) fechaVencimiento.value = '';
    if (infoStock) infoStock.classList.add('hidden');
    if (unidadProducto) unidadProducto.textContent = 'UNIDAD';
}

function cambiarPestana(pestana) {
    console.log(`Cambiando a pestaña: ${pestana}`);

    // Desactivar todas las pestañas
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active');
        tab.classList.add('inactive');
    });

    // Ocultar todos los contenidos
    document.querySelectorAll('.tab-content').forEach(contenido => {
        contenido.classList.remove('active');
    });

    // Activar pestaña seleccionada
    const tabActivo = document.getElementById(`tab-${pestana}`);
    if (tabActivo) {
        tabActivo.classList.remove('inactive');
        tabActivo.classList.add('active');
    }

    // Mostrar contenido seleccionado
    const contenidoActivo = document.getElementById(`contenido-${pestana}`);
    if (contenidoActivo) contenidoActivo.classList.add('active');

    // Cargar datos específicos si es necesario
    if (pestana === 'productos' && sedeActiva) {
        cargarTodosLosProductos();
    } else if (pestana === 'proveedores') {
        cargarProveedores();
    }
}

// ====================
// FUNCIONES DE MODALES - PRODUCTOS
// ====================

function mostrarModalProducto() {
    const modal = document.getElementById('modalProducto');
    if (modal) modal.classList.add('active');
}

function cerrarModalProducto() {
    const modal = document.getElementById('modalProducto');
    const form = document.getElementById('formProducto');
    
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
}

async function guardarProducto(event) {
    event.preventDefault();

    if (!sedeActiva) {
        mostrarMensaje('Primero seleccione una sede', true);
        return;
    }

    const productoData = {
        nombre: document.getElementById('producto-nombre').value,
        descripcion: document.getElementById('producto-descripcion').value,
        categoria: document.getElementById('producto-categoria').value,
        unidad: document.getElementById('producto-unidad').value,
        sede_id: parseInt(sedeActiva),
        proveedor_id: document.getElementById('producto-proveedor').value || null,
        registro_invima: document.getElementById('producto-invima').value
    };

    try {
        const response = await fetch(API_PRODUCTOS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productoData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear producto');
        }

        const nuevoProducto = await response.json();

        cerrarModalProducto();
        mostrarMensaje('Producto creado correctamente para esta sede');

        // Recargar productos de la sede actual
        await cargarProductosSede();
        await cargarEstadisticasSede();

    } catch (error) {
        console.error('Error creando producto:', error);
        mostrarMensaje(error.message, true);
    }
}

async function editarProducto(productoId) {
    try {
        const producto = todosLosProductos.find(p => p.id == productoId);
        if (!producto) {
            mostrarMensaje('Producto no encontrado', true);
            return;
        }

        document.getElementById('editar-producto-id').value = producto.id;
        document.getElementById('editar-producto-nombre').value = producto.nombre;
        document.getElementById('editar-producto-descripcion').value = producto.descripcion || '';
        document.getElementById('editar-producto-categoria').value = producto.categoria || '';
        document.getElementById('editar-producto-unidad').value = producto.unidad;
        document.getElementById('editar-producto-proveedor').value = producto.proveedor_id || '';
        document.getElementById('editar-producto-invima').value = producto.registro_invima || '';

        const modal = document.getElementById('modalEditarProducto');
        if (modal) modal.classList.add('active');

    } catch (error) {
        console.error('Error preparando edición:', error);
        mostrarMensaje('Error al cargar datos del producto', true);
    }
}

function cerrarModalEditarProducto() {
    const modal = document.getElementById('modalEditarProducto');
    const form = document.getElementById('formEditarProducto');
    
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
}

async function actualizarProducto(event) {
    event.preventDefault();

    const productoId = document.getElementById('editar-producto-id').value;
    const productoData = {
        nombre: document.getElementById('editar-producto-nombre').value,
        descripcion: document.getElementById('editar-producto-descripcion').value,
        categoria: document.getElementById('editar-producto-categoria').value,
        unidad: document.getElementById('editar-producto-unidad').value,
        proveedor_id: document.getElementById('editar-producto-proveedor').value || null,
        registro_invima: document.getElementById('editar-producto-invima').value
    };

    try {
        const response = await fetch(`${API_PRODUCTOS}/${productoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productoData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al actualizar producto');
        }

        const productoActualizado = await response.json();

        cerrarModalEditarProducto();
        mostrarMensaje('Producto actualizado correctamente');

        // Recargar productos
        await cargarTodosLosProductos();

    } catch (error) {
        console.error('Error actualizando producto:', error);
        mostrarMensaje(error.message, true);
    }
}

function confirmarEliminarProducto(productoId, productoNombre) {
    productoAEliminar = productoId;
    const mensaje = document.getElementById('mensaje-confirmacion');
    const modal = document.getElementById('modalConfirmarEliminar');
    
    if (mensaje) {
        mensaje.textContent = `¿Está seguro de que desea eliminar el producto "${productoNombre}"?`;
    }
    if (modal) modal.classList.add('active');
}

function cerrarModalConfirmarEliminar() {
    const modal = document.getElementById('modalConfirmarEliminar');
    if (modal) modal.classList.remove('active');
    productoAEliminar = null;
}

async function eliminarProductoConfirmado() {
    if (!productoAEliminar || !sedeActiva) return;

    try {
        const response = await fetch(`${API_PRODUCTOS}/sede/${sedeActiva}/${productoAEliminar}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar producto');
        }

        const resultado = await response.json();

        cerrarModalConfirmarEliminar();
        mostrarMensaje('Producto eliminado correctamente de la sede');

        // Recargar productos de la sede
        await cargarProductosSede();
        await cargarTodosLosProductos();
        await cargarEstadisticasSede();

    } catch (error) {
        console.error('Error eliminando producto:', error);
        mostrarMensaje(error.message, true);
        cerrarModalConfirmarEliminar();
    }
}

// ====================
// FUNCIONES UTILITARIAS - CORREGIDAS COMPLETAMENTE PARA FECHAS
// ====================

// Función para obtener fecha en formato YYYY-MM-DD (sin ajustes de zona horaria)
function obtenerFechaLocal(fecha = null) {
    if (fecha) {
        return fecha; // Ya está en formato correcto
    }
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Función CRÍTICA: Corregir fecha desde backend (problema de zona horaria)
function corregirFechaDesdeBackend(fechaBackend) {
    if (!fechaBackend) return null;
    
    // Si ya está en formato YYYY-MM-DD, devolver directamente
    if (typeof fechaBackend === 'string' && fechaBackend.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return fechaBackend;
    }
    
    // Si viene como string ISO (con hora), extraer solo la fecha
    if (typeof fechaBackend === 'string' && fechaBackend.includes('T')) {
        const fechaParte = fechaBackend.split('T')[0];
        return fechaParte;
    }
    
    // Si es un objeto Date o timestamp, formatear sin ajustes de zona
    try {
        const date = new Date(fechaBackend);
        // Usar los métodos UTC para evitar cambios de zona horaria
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const fechaCorregida = `${year}-${month}-${day}`;
        return fechaCorregida;
    } catch (error) {
        console.error('❌ Error corrigiendo fecha:', error);
        return fechaBackend;
    }
}

// Función para formatear fecha para mostrar (sin cambios de zona)
function formatearFechaLocal(fecha) {
    if (!fecha) return '-';
    
    // Primero corregir la fecha si viene del backend
    const fechaCorregida = corregirFechaDesdeBackend(fecha);
    
    try {
        const [year, month, day] = fechaCorregida.split('-');
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('❌ Error formateando fecha:', error);
        return fecha;
    }
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor);
}

function mostrarMensaje(texto, esError = false) {
    let contenedor = document.getElementById('mensajes-kardex');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'mensajes-kardex';
        contenedor.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(contenedor);
    }

    const mensaje = document.createElement('div');
    mensaje.className = `px-6 py-3 rounded-lg shadow-lg font-medium transition-all duration-300 ${esError
            ? 'bg-red-500 text-white border-l-4 border-red-700'
            : 'bg-green-500 text-white border-l-4 border-green-700'
        }`;
    mensaje.textContent = texto;

    contenedor.appendChild(mensaje);

    setTimeout(() => {
        if (mensaje.parentNode) {
            mensaje.parentNode.removeChild(mensaje);
        }
    }, 4000);
}

// Función para diagnosticar problemas con la API
async function diagnosticarAPI() {
    try {
        console.log("🔍 Diagnosticando API...");
        
        const sedesResponse = await fetch(API_SEDES);
        console.log("📊 Sedes API:", sedesResponse.status, sedesResponse.ok);
        
        if (sedesResponse.ok) {
            const sedesData = await sedesResponse.json();
            console.log("📋 Sedes disponibles:", sedesData);
        }
        
        if (sedeActiva) {
            const productosSedeResponse = await fetch(`${API_PRODUCTOS_SEDE}/${sedeActiva}`);
            console.log("📦 Productos por sede API:", productosSedeResponse.status, productosSedeResponse.ok);
            
            if (productosSedeResponse.ok) {
                const productosData = await productosSedeResponse.json();
                console.log("📋 Productos de la sede:", productosData);
            } else {
                const errorText = await productosSedeResponse.text();
                console.error("❌ Error en productos por sede:", errorText);
            }
        }
        
    } catch (error) {
        console.error("❌ Error en diagnóstico API:", error);
    }
}