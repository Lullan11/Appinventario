// Variables globales
let sedeActiva = null;
let sedes = [];
let productos = [];
let movimientos = [];
let todosLosProductos = [];
let productoAEliminar = null;
let movimientosFiltrados = [];
let productosFiltrados = [];

// URLs de la API
const API_BASE = "https://inventario-api-gw73.onrender.com";
const API_SEDES = `${API_BASE}/sedes`;
const API_PRODUCTOS = `${API_BASE}/productos`;
const API_PRODUCTOS_SEDE = `${API_BASE}/productos/sede`;
const API_MOVIMIENTOS = `${API_BASE}/movimientos-kardex`;
const API_ESTADISTICAS = `${API_BASE}/estadisticas/sede`;

// Inicialización
document.addEventListener("DOMContentLoaded", function () {
    console.log("🚀 Iniciando sistema Kardex...");
    inicializarSistema();
});

async function inicializarSistema() {
    try {
        console.log("🔧 Configurando sistema...");

        // Configurar fecha actual solo si el elemento existe
        const hoy = new Date().toISOString().split('T')[0];
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            fechaInput.value = hoy;
        }

        // Cargar datos iniciales
        await cargarSedes();

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
    document.getElementById('sede-principal').addEventListener('change', cambiarSedeActiva);

    // Pestañas
    document.getElementById('tab-movimientos').addEventListener('click', () => cambiarPestana('movimientos'));
    document.getElementById('tab-productos').addEventListener('click', () => cambiarPestana('productos'));

    // Formulario de movimientos
    document.getElementById('btnRegistrar').addEventListener('click', registrarMovimiento);
    document.getElementById('btnLimpiarForm').addEventListener('click', limpiarFormularioMovimiento);
    document.getElementById('producto').addEventListener('change', actualizarInfoProducto);

    // Botones de productos
    document.getElementById('btnNuevoProducto').addEventListener('click', mostrarModalProducto);
    document.getElementById('btnNuevoProducto2').addEventListener('click', mostrarModalProducto);

    // Modales
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalProducto);
    document.getElementById('formProducto').addEventListener('submit', guardarProducto);

    document.getElementById('btnCerrarModalEditar').addEventListener('click', cerrarModalEditarProducto);
    document.getElementById('formEditarProducto').addEventListener('submit', actualizarProducto);

    document.getElementById('btnCancelarEliminar').addEventListener('click', cerrarModalConfirmarEliminar);
    document.getElementById('btnConfirmarEliminar').addEventListener('click', eliminarProductoConfirmado);

    // FILTROS - MOVIMIENTOS
    document.getElementById('btnAplicarFiltrosMov').addEventListener('click', aplicarFiltrosMovimientos);
    document.getElementById('btnLimpiarFiltrosMov').addEventListener('click', limpiarFiltrosMovimientos);
    document.getElementById('btnExportarMovimientos').addEventListener('click', exportarExcelMovimientos);

    // FILTROS - PRODUCTOS
    document.getElementById('btnAplicarFiltrosProd').addEventListener('click', aplicarFiltrosProductos);
    document.getElementById('btnLimpiarFiltrosProd').addEventListener('click', limpiarFiltrosProductos);
    document.getElementById('btnExportarProductos').addEventListener('click', exportarExcelProductos);
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

        select.innerHTML = '<option value="">Seleccione una sede para trabajar</option>';
        sedes.forEach(sede => {
            const option = document.createElement('option');
            option.value = sede.id;
            option.textContent = `${sede.nombre} (${sede.codigo})`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error cargando sedes:', error);
        mostrarMensaje('Error cargando sedes', true);
    }
}

async function cambiarSedeActiva() {
    const select = document.getElementById('sede-principal');
    sedeActiva = select.value;

    // Limpiar datos de la sede anterior
    limpiarDatosSede();

    if (!sedeActiva) {
        document.getElementById('panel-principal').classList.add('hidden');
        document.getElementById('info-sede').classList.add('hidden');
        return;
    }

    // Mostrar información de la sede
    document.getElementById('sede-seleccionada').textContent = select.options[select.selectedIndex].text;
    document.getElementById('info-sede').classList.remove('hidden');
    document.getElementById('panel-principal').classList.remove('hidden');

    // Cargar datos de la sede - INCLUYENDO TODOS LOS PRODUCTOS
    await cargarDatosSede();
    await cargarTodosLosProductos(); // ¡ESTA LÍNEA FALTABA!
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

        document.getElementById('total-productos-count').textContent = stats.total_productos || 0;
        document.getElementById('total-stock-count').textContent = stats.total_stock || 0;
        document.getElementById('stock-bajo-count').textContent = stats.stock_bajo || 0;
        document.getElementById('total-movimientos').textContent = stats.total_movimientos || 0;

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
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
        // Solo cargar productos si hay una sede activa
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

        // Llenar select de filtro de productos en movimientos - CORREGIDO
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

        // Si estamos en la pestaña de productos, cargar la tabla
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
                <td colspan="6" class="px-4 py-4 text-center text-gray-500">
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

        const fila = document.createElement('tr');
        fila.className = 'hover:bg-gray-50 border-b';
        fila.innerHTML = `
            <td class="px-4 py-2 border">
                <div class="font-medium">${prod.nombre}</div>
                <div class="text-sm text-gray-500">${prod.descripcion || 'Sin descripción'}</div>
            </td>
            <td class="px-4 py-2 border">${prod.categoria || '-'}</td>
            <td class="px-4 py-2 border text-center">${prod.unidad}</td>
            <td class="px-4 py-2 border text-right">
                <span class="font-semibold ${(prod.stock_actual || 0) < 10 ? 'text-red-600' : 'text-green-600'}">
                    ${prod.stock_actual || 0}
                </span>
                <div class="text-xs mt-1">${estadoStock}</div>
            </td>
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
                <td colspan="6" class="px-4 py-4 text-center text-gray-500">
                    Seleccione una sede para ver los productos
                </td>
            </tr>
        `;
    }
    
    const tbodyMovimientos = document.querySelector('#tabla-movimientos-recientes tbody');
    if (tbodyMovimientos) {
        tbodyMovimientos.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-4 text-center text-gray-500">
                    Seleccione una sede para ver los movimientos
                </td>
            </tr>
        `;
    }
    
    // Resetear estadísticas
    document.getElementById('total-productos-count').textContent = '0';
    document.getElementById('total-stock-count').textContent = '0';
    document.getElementById('stock-bajo-count').textContent = '0';
    document.getElementById('total-movimientos').textContent = '0';
}



// ====================
// FUNCIONES DE MOVIMIENTOS
// ====================

async function cargarMovimientosRecientes() {
    if (!sedeActiva) return;

    try {
        const response = await fetch(`${API_MOVIMIENTOS}?sede_id=${sedeActiva}&limit=50`);
        if (!response.ok) throw new Error('Error al cargar movimientos');

        movimientos = await response.json();
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
                <td colspan="8" class="px-4 py-4 text-center text-gray-500">
                    No hay movimientos que coincidan con los filtros
                </td>
            </tr>
        `;
        return;
    }

    movimientosFiltrados.forEach(mov => {
        const fila = document.createElement('tr');
        fila.className = 'hover:bg-gray-50 border-b';
        fila.innerHTML = `
            <td class="px-4 py-2 border text-sm">${formatearFecha(mov.fecha)}</td>
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
            <td class="px-4 py-2 border text-right">$${formatearMoneda(mov.total || 0)}</td>
        `;
        tbody.appendChild(fila);
    });
}

// ====================
// FUNCIONES DE FILTROS
// ====================

function aplicarFiltrosMovimientos() {
    const productoId = document.getElementById('filtro-producto-mov').value;
    const tipoMovimiento = document.getElementById('filtro-tipo-mov').value;

    movimientosFiltrados = movimientos.filter(mov => {
        let cumple = true;

        if (productoId && mov.producto_id != productoId) {
            cumple = false;
        }

        if (tipoMovimiento && mov.tipo_movimiento !== tipoMovimiento) {
            cumple = false;
        }

        return cumple;
    });

    renderizarMovimientosRecientes();
    mostrarMensaje(`Se encontraron ${movimientosFiltrados.length} movimientos`);
}

function limpiarFiltrosMovimientos() {
    document.getElementById('filtro-producto-mov').value = '';
    document.getElementById('filtro-tipo-mov').value = '';

    movimientosFiltrados = [...movimientos];
    renderizarMovimientosRecientes();
    mostrarMensaje('Filtros limpiados correctamente');
}

function aplicarFiltrosProductos() {
    const nombre = document.getElementById('filtro-nombre-producto').value.toLowerCase();
    const categoria = document.getElementById('filtro-categoria-producto').value.toLowerCase();
    const stock = document.getElementById('filtro-stock-producto').value;
    const unidad = document.getElementById('filtro-unidad-producto').value;

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

        return cumple;
    });

    cargarTablaProductos();
    mostrarMensaje(`Se encontraron ${productosFiltrados.length} productos`);
}

function limpiarFiltrosProductos() {
    document.getElementById('filtro-nombre-producto').value = '';
    document.getElementById('filtro-categoria-producto').value = '';
    document.getElementById('filtro-stock-producto').value = '';
    document.getElementById('filtro-unidad-producto').value = '';

    productosFiltrados = [...todosLosProductos];
    cargarTablaProductos();
    mostrarMensaje('Filtros limpiados correctamente');
}

// ====================
// FUNCIONES DE EXPORTACIÓN EXCEL MEJORADAS
// ====================

// ====================
// FUNCIONES DE EXPORTACIÓN EXCEL PARA KARDEX
// ====================

function exportarExcelMovimientos() {
    if (!movimientosFiltrados || movimientosFiltrados.length === 0) {
        mostrarMensaje('No hay movimientos para exportar', true);
        return;
    }

    try {
        const sedeNombre = document.getElementById('sede-seleccionada').textContent;
        const fechaExportacion = new Date().toLocaleDateString('es-CO');

        // Crear contenido CSV
        let csvContent = "SISTEMA KARDEX - REPORTE DE MOVIMIENTOS\n";
        csvContent += `Sede: ${sedeNombre}\n`;
        csvContent += `Fecha de exportación: ${fechaExportacion}\n`;
        csvContent += `Total de movimientos: ${movimientosFiltrados.length}\n\n`;

        // Encabezados
        csvContent += "FECHA,PRODUCTO,TIPO MOVIMIENTO,DESCRIPCIÓN,UBICACIÓN,CANTIDAD,UNIDAD,STOCK ANTERIOR,STOCK ACTUAL,COSTO UNITARIO,TOTAL\n";

        // Datos
        movimientosFiltrados.forEach(mov => {
            const fila = [
                mov.fecha,
                `"${mov.producto_nombre}"`,
                mov.tipo_movimiento,
                `"${mov.descripcion || 'Sin descripción'}"`,
                `"${mov.ubicacion || 'No especificada'}"`,
                mov.cantidad,
                mov.unidad,
                mov.stock_anterior,
                mov.stock_actual,
                `$${formatearMoneda(mov.costo || 0)}`,
                `$${formatearMoneda(mov.total || 0)}`
            ];
            csvContent += fila.join(',') + '\n';
        });

        // Totales
        const totalEntradas = movimientosFiltrados.filter(m => m.tipo_movimiento === 'ENTRADA').length;
        const totalSalidas = movimientosFiltrados.filter(m => m.tipo_movimiento === 'SALIDA').length;
        const valorTotal = movimientosFiltrados.reduce((sum, mov) => sum + (mov.total || 0), 0);

        csvContent += `\nRESUMEN:\n`;
        csvContent += `Total entradas: ${totalEntradas}\n`;
        csvContent += `Total salidas: ${totalSalidas}\n`;
        csvContent += `Valor total movimientos: $${formatearMoneda(valorTotal)}\n`;

        // Descargar archivo
        descargarCSV(csvContent, `movimientos_kardex_${sedeNombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);

        mostrarMensaje('Reporte de movimientos exportado correctamente');

    } catch (error) {
        console.error('Error exportando movimientos a Excel:', error);
        mostrarMensaje('Error al generar el archivo Excel', true);
    }
}

function exportarExcelProductos() {
    if (!productosFiltrados || productosFiltrados.length === 0) {
        mostrarMensaje('No hay productos para exportar', true);
        return;
    }

    try {
        const sedeNombre = document.getElementById('sede-seleccionada').textContent;
        const fechaExportacion = new Date().toLocaleDateString('es-CO');

        // Crear contenido CSV
        let csvContent = "SISTEMA KARDEX - INVENTARIO DE PRODUCTOS\n";
        csvContent += `Sede: ${sedeNombre}\n`;
        csvContent += `Fecha de exportación: ${fechaExportacion}\n`;
        csvContent += `Total de productos: ${productosFiltrados.length}\n\n`;

        // Encabezados
        csvContent += "NOMBRE,DESCRIPCIÓN,CATEGORÍA,UNIDAD,STOCK ACTUAL,UBICACIÓN,TOTAL MOVIMIENTOS,ESTADO STOCK\n";

        // Datos
        productosFiltrados.forEach(prod => {
            const estadoStock = (prod.stock_actual || 0) < 10 ? 'STOCK BAJO' :
                (prod.stock_actual || 0) === 0 ? 'SIN STOCK' : 'NORMAL';

            const fila = [
                `"${prod.nombre}"`,
                `"${prod.descripcion || 'Sin descripción'}"`,
                `"${prod.categoria || 'Sin categoría'}"`,
                prod.unidad,
                prod.stock_actual || 0,
                `"${prod.ubicacion_stock || 'No asignada'}"`,
                prod.total_movimientos || 0,
                estadoStock
            ];
            csvContent += fila.join(',') + '\n';
        });

        // Estadísticas
        const stockBajo = productosFiltrados.filter(p => (p.stock_actual || 0) < 10 && (p.stock_actual || 0) > 0).length;
        const sinStock = productosFiltrados.filter(p => (p.stock_actual || 0) === 0).length;
        const stockNormal = productosFiltrados.filter(p => (p.stock_actual || 0) >= 10).length;
        const totalStock = productosFiltrados.reduce((sum, prod) => sum + (prod.stock_actual || 0), 0);

        csvContent += `\nESTADÍSTICAS:\n`;
        csvContent += `Productos con stock normal: ${stockNormal}\n`;
        csvContent += `Productos con stock bajo: ${stockBajo}\n`;
        csvContent += `Productos sin stock: ${sinStock}\n`;
        csvContent += `Stock total en sede: ${totalStock}\n`;

        // Descargar archivo
        descargarCSV(csvContent, `inventario_productos_${sedeNombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);

        mostrarMensaje('Inventario de productos exportado correctamente');

    } catch (error) {
        console.error('Error exportando productos a Excel:', error);
        mostrarMensaje('Error al generar el archivo Excel', true);
    }
}

function descargarCSV(contenido, nombreArchivo) {
    const blob = new Blob(["\uFEFF" + contenido], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", nombreArchivo);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ====================
// FUNCIONES DEL FORMULARIO
// ====================

function actualizarInfoProducto() {
    const select = document.getElementById('producto');
    const productoId = select.value;
    const infoStock = document.getElementById('info-stock');
    const unidadSpan = document.getElementById('unidad-producto');
    const stockSpan = document.getElementById('stock-actual');
    const alertaSpan = document.getElementById('alerta-stock');

    if (!productoId) {
        infoStock.classList.add('hidden');
        return;
    }

    const producto = productos.find(p => p.id == productoId);
    if (producto) {
        unidadSpan.textContent = producto.unidad;
        stockSpan.textContent = producto.stock_actual;

        if (producto.stock_actual < 10) {
            alertaSpan.textContent = '⚠️ Stock bajo';
            alertaSpan.classList.remove('hidden');
            infoStock.classList.add('stock-bajo');
        } else {
            alertaSpan.classList.add('hidden');
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
    const fecha = document.getElementById('fecha').value;
    const productoId = document.getElementById('producto').value;
    const tipo = document.getElementById('tipo').value;
    const descripcion = document.getElementById('descripcion').value;
    const ubicacion = document.getElementById('ubicacion').value;
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const costo = parseFloat(document.getElementById('costo').value);

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
        const movimientoData = {
            fecha,
            producto_id: parseInt(productoId),
            sede_id: parseInt(sedeActiva),
            tipo_movimiento: tipo,
            descripcion: descripcion || '',
            ubicacion: ubicacion || '',
            cantidad: cantidad,
            costo: costo
        };

        // Mostrar loading
        const btn = document.getElementById('btnRegistrar');
        btn.classList.add('loading');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';

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
        btn.classList.remove('loading');
        btn.innerHTML = '<i class="fas fa-save mr-2"></i>Registrar Movimiento';
    }
}

function limpiarFormularioMovimiento() {
    document.getElementById('producto').value = '';
    document.getElementById('tipo').value = '';
    document.getElementById('descripcion').value = '';
    document.getElementById('ubicacion').value = '';
    document.getElementById('cantidad').value = '';
    document.getElementById('costo').value = '';
    document.getElementById('info-stock').classList.add('hidden');
    document.getElementById('unidad-producto').textContent = 'UNIDAD';
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
    tabActivo.classList.remove('inactive');
    tabActivo.classList.add('active');

    // Mostrar contenido seleccionado
    const contenidoActivo = document.getElementById(`contenido-${pestana}`);
    contenidoActivo.classList.add('active');

    // Cargar datos específicos si es necesario
    if (pestana === 'productos' && sedeActiva) {
        cargarTodosLosProductos(); // ¡ESTA LÍNEA FALTABA!
    }
}

// ====================
// FUNCIONES DE MODALES - PRODUCTOS
// ====================

function mostrarModalProducto() {
    document.getElementById('modalProducto').classList.add('active');
}

function cerrarModalProducto() {
    document.getElementById('modalProducto').classList.remove('active');
    document.getElementById('formProducto').reset();
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
        sede_id: parseInt(sedeActiva)
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

        document.getElementById('modalEditarProducto').classList.add('active');

    } catch (error) {
        console.error('Error preparando edición:', error);
        mostrarMensaje('Error al cargar datos del producto', true);
    }
}

function cerrarModalEditarProducto() {
    document.getElementById('modalEditarProducto').classList.remove('active');
    document.getElementById('formEditarProducto').reset();
}

async function actualizarProducto(event) {
    event.preventDefault();

    const productoId = document.getElementById('editar-producto-id').value;
    const productoData = {
        nombre: document.getElementById('editar-producto-nombre').value,
        descripcion: document.getElementById('editar-producto-descripcion').value,
        categoria: document.getElementById('editar-producto-categoria').value,
        unidad: document.getElementById('editar-producto-unidad').value
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
    document.getElementById('mensaje-confirmacion').textContent =
        `¿Está seguro de que desea eliminar el producto "${productoNombre}"?`;
    document.getElementById('modalConfirmarEliminar').classList.add('active');
}

function cerrarModalConfirmarEliminar() {
    document.getElementById('modalConfirmarEliminar').classList.remove('active');
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



// Función para diagnosticar problemas con la API
async function diagnosticarAPI() {
    try {
        console.log("🔍 Diagnosticando API...");
        
        // Verificar conexión con sedes
        const sedesResponse = await fetch(API_SEDES);
        console.log("📊 Sedes API:", sedesResponse.status, sedesResponse.ok);
        
        if (sedesResponse.ok) {
            const sedesData = await sedesResponse.json();
            console.log("📋 Sedes disponibles:", sedesData);
        }
        
        // Verificar conexión con productos por sede (si hay sede activa)
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



// ====================
// FUNCIONES UTILITARIAS
// ====================

function formatearFecha(fecha) {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES');
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor);
}

function mostrarMensaje(texto, esError = false) {
    // Crear o obtener el contenedor de mensajes
    let contenedor = document.getElementById('mensajes-kardex');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'mensajes-kardex';
        contenedor.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(contenedor);
    }

    // Crear mensaje
    const mensaje = document.createElement('div');
    mensaje.className = `px-6 py-3 rounded-lg shadow-lg font-medium transition-all duration-300 ${esError
            ? 'bg-red-500 text-white border-l-4 border-red-700'
            : 'bg-green-500 text-white border-l-4 border-green-700'
        }`;
    mensaje.textContent = texto;

    contenedor.appendChild(mensaje);

    // Auto-eliminar después de 4 segundos
    setTimeout(() => {
        if (mensaje.parentNode) {
            mensaje.parentNode.removeChild(mensaje);
        }
    }, 4000);
}