// src/js/roles.js - VERSIÓN ACTUALIZADA

// ========================= CONFIGURACIONES =========================

const PERMISOS_POR_ROL = {
  'admin': [
    'dashboard.html', 'sedes.html', 'areas.html', 'puestos.html',
    'equipos.html', 'chequeos.html', 'excel.html', 'inactivos.html',
    'usuarios.html', 'insumos.html', 'cronograma.html',
    'temperatura.html', 'entrada_salida.html', 'nuevoEquipo.html', 'NuevaSede.html',
    'nuevaArea.html', 'nuevoPuesto.html', 'nuevoTipoEquipo.html',
    'verSede.html', 'verArea.html', 'verPuesto.html',
    'verEquipo.html', 'editarSede.html', 'editarArea.html',
    'editarPuesto.html', 'editarEquipo.html'
  ],
  'supervisor': ['chequeos.html'],
  'auxiliar': ['entrada_salida.html'],
  'tecnico': [
    'dashboard.html', 'sedes.html', 'areas.html', 'puestos.html',
    'equipos.html', 'chequeos.html', 'inactivos.html',
    'cronograma.html', 'temperatura.html', 'entrada_salida.html', 'nuevoEquipo.html', 'NuevaSede.html',
    'nuevaArea.html', 'nuevoPuesto.html', 'nuevoTipoEquipo.html',
    'verSede.html', 'verArea.html', 'verPuesto.html',
    'verEquipo.html', 'editarSede.html', 'editarArea.html',
    'editarPuesto.html', 'editarEquipo.html'
  ],
  'doctor': ['chequeos.html']
};

const PAGINA_INICIO_POR_ROL = {
  'admin': 'dashboard.html',
  'supervisor': 'chequeos.html',
  'auxiliar': 'entrada_salida.html',
  'tecnico': 'dashboard.html',
  'doctor': 'chequeos.html'
};

// ========================= GRUPOS DE PÁGINAS =========================
// Define qué páginas están relacionadas entre sí
const GRUPOS_PAGINAS = {
  'sedes.html': ['NuevaSede.html', 'verSede.html', 'editarSede.html'],
  'areas.html': ['nuevaArea.html', 'verArea.html', 'editarArea.html'],
  'puestos.html': ['nuevoPuesto.html', 'verPuesto.html', 'editarPuesto.html'],
  'equipos.html': [
    'nuevoEquipo.html', 
    'verEquipo.html', 
    'editarEquipo.html',
    'nuevoTipoEquipo.html'
  ],
  'chequeos.html': [], // Puedes agregar páginas relacionadas si las tienes
  'usuarios.html': [], // Puedes agregar páginas relacionadas si las tienes
  'insumos.html': [], // Puedes agregar páginas relacionadas si las tienes
};

// Función para obtener el grupo al que pertenece una página
function obtenerGrupoPagina(pagina) {
  // Si la página es una página principal, devuelve ella misma
  if (GRUPOS_PAGINAS[pagina] !== undefined) {
    return pagina;
  }
  
  // Buscar en los grupos
  for (const [paginaPrincipal, paginasRelacionadas] of Object.entries(GRUPOS_PAGINAS)) {
    if (paginasRelacionadas.includes(pagina)) {
      return paginaPrincipal;
    }
  }
  
  // Si no está en ningún grupo, devolver la página actual
  return pagina;
}

// ========================= FUNCIONES BASE =========================

function obtenerUsuarioActual() {
  try {
    const usuarioData = localStorage.getItem('currentUser');
    return usuarioData ? JSON.parse(usuarioData) : null;
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return null;
  }
}

function tienePermiso(modulo) {
  const usuario = obtenerUsuarioActual();
  
  if (!usuario || !usuario.rol) {
    console.warn('⚠️ Usuario no autenticado o sin rol');
    return false;
  }
  
  const rol = usuario.rol.toLowerCase();
  const permisos = PERMISOS_POR_ROL[rol] || [];
  
  return permisos.includes(modulo);
}

function verificarAccesoPagina() {
  const usuario = obtenerUsuarioActual();
  
  if (!usuario && !window.location.pathname.includes('index.html')) {
    console.log('🚫 No autenticado - Redirigiendo al login');
    window.location.href = '../../index.html';
    return false;
  }
  
  if (usuario) {
    const paginaActual = window.location.pathname.split('/').pop();
    
    if (paginaActual === 'dashboard.html' || paginaActual === '') {
      return true;
    }
    
    if (!tienePermiso(paginaActual)) {
      console.log(`🚫 Acceso denegado a: ${paginaActual}`);
      alert('No tienes permisos para acceder a esta página');
      window.location.href = 'dashboard.html';
      return false;
    }
  }
  
  return true;
}

// ========================= FUNCIÓN LOGIN =========================

function inicializarLogin() {
  const form = document.getElementById("loginForm");
  
  if (!form) {
    console.log('🔍 No se encontró formulario de login en esta página');
    return;
  }
  
  console.log('🔐 Inicializando sistema de login...');
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      mostrarMensajeLogin("Por favor completa todos los campos.", true);
      return;
    }

    try {
      const res = await fetch("https://inventario-api-gw73.onrender.com/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("currentUser", JSON.stringify(data.usuario));
        localStorage.setItem("token", data.token);

        console.log("✅ Login exitoso:", data.usuario.nombre, "Rol:", data.usuario.rol);

        mostrarMensajeLogin(`✅ Bienvenido ${data.usuario.nombre} (${data.usuario.rol})`);
        
        const rol = data.usuario.rol.toLowerCase();
        const paginaInicio = PAGINA_INICIO_POR_ROL[rol] || 'dashboard.html';
        
        console.log(`📍 Redirigiendo ${rol} a: ${paginaInicio}`);
        
        setTimeout(() => {
          window.location.href = `src/views/${paginaInicio}`;
        }, 1500);
        
      } else {
        mostrarMensajeLogin(data.error || "Error al iniciar sesión", true);
      }
    } catch (err) {
      console.error("Error en login:", err);
      mostrarMensajeLogin("No se pudo conectar con el servidor", true);
    }
  });
}

function mostrarMensajeLogin(texto, esError = false) {
  let mensaje = document.getElementById("mensaje-login");
  if (!mensaje) {
    mensaje = document.createElement("div");
    mensaje.id = "mensaje-login";
    mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50";
    document.body.appendChild(mensaje);
  }

  mensaje.textContent = texto;
  mensaje.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 ${esError
      ? "bg-red-100 text-red-800 border-l-4 border-red-500"
      : "bg-green-100 text-green-800 border-l-4 border-green-500"
    }`;

  setTimeout(() => {
    mensaje.textContent = "";
    mensaje.className = "fixed top-4 right-4 px-4 py-2 rounded-md shadow-md font-medium z-50 hidden";
  }, 3000);
}

// ========================= FUNCIONES DE MENÚ (ACTUALIZADAS) =========================

function aplicarRolesMenu() {
  console.log('🔐 Aplicando roles en el menú...');
  
  const usuario = obtenerUsuarioActual();
  if (!usuario) {
    console.log('❌ No hay usuario logueado');
    return;
  }
  
  console.log('✅ Usuario:', usuario.nombre, 'Rol:', usuario.rol);
  
  const rol = usuario.rol.toLowerCase();
  const permisos = PERMISOS_POR_ROL[rol] || [];
  const paginaActual = window.location.pathname.split('/').pop();
  
  console.log(`📊 Permisos para ${rol}:`, permisos);
  console.log(`📍 Página actual: ${paginaActual}`);
  
  // Obtener el grupo de la página actual
  const grupoPaginaActual = obtenerGrupoPagina(paginaActual);
  console.log(`🏷️ Grupo de la página actual (${paginaActual}): ${grupoPaginaActual}`);
  
  // Configurar cada enlace del menú
  const links = document.querySelectorAll('.view-link');
  let totalVisibles = 0;
  
  links.forEach(link => {
    const view = link.getAttribute('data-view');
    
    if (view) {
      // IMPORTANTE: Para supervisor/auxiliar/doctor, OCULTAR el enlace "Inicio" (dashboard.html)
      const esInicio = view === 'dashboard.html';
      const esPaginaPrincipalRol = view === PAGINA_INICIO_POR_ROL[rol];
      
      // Reglas especiales:
      // 1. Si tiene permiso PARA ESTA VISTA, mostrarla
      // 2. Si es supervisor/auxiliar/doctor y es "Inicio", OCULTARLO
      // 3. Si es la página de inicio de este rol, mantenerla visible
      
      const tienePermisoParaEstaVista = permisos.includes(view);
      
      if (tienePermisoParaEstaVista) {
        // Para roles especiales, NO mostrar "Inicio" como enlace separado
        if ((rol === 'supervisor' || rol === 'auxiliar' || rol === 'doctor') && esInicio) {
          console.log(`🚫 Ocultando "Inicio" para rol ${rol} (su inicio es: ${PAGINA_INICIO_POR_ROL[rol]})`);
          link.style.display = 'none';
          return;
        }
        
        link.style.display = 'flex';
        totalVisibles++;
        
        // Obtener el grupo de esta página del menú
        const grupoEsteEnlace = obtenerGrupoPagina(view);
        
        // Determinar si debe estar activo
        // 1. Si la página exacta coincide
        // 2. Si están en el mismo grupo (ej: equipos.html y verEquipo.html)
        // 3. Caso especial: si está en dashboard y este es el inicio de su rol
        
        const esPaginaExacta = paginaActual === view;
        const estanEnMismoGrupo = grupoPaginaActual === grupoEsteEnlace;
        const esDashboardPeroRolVaAOtraPagina = (paginaActual === 'dashboard.html' && esPaginaPrincipalRol);
        
        const debeEstarActivo = esPaginaExacta || estanEnMismoGrupo || esDashboardPeroRolVaAOtraPagina;
        
        if (debeEstarActivo) {
          console.log(`   ${view}: ✅ ACTIVO (grupo: ${grupoEsteEnlace})`);
          link.classList.add('bg-[#639A33]', 'text-[#0F172A]', 'font-semibold');
          link.classList.remove('hover:bg-[#639A33]', 'hover:text-[#0F172A]');
        } else {
          link.classList.remove('bg-[#639A33]', 'text-[#0F172A]', 'font-semibold');
          link.classList.add('hover:bg-[#639A33]', 'hover:text-[#0F172A]');
        }
      } else {
        // No tiene permiso, ocultar
        link.style.display = 'none';
      }
      
      console.log(`   ${view}: ${tienePermisoParaEstaVista ? '✅ PERMITIDO' : '❌ DENEGADO'} (display: ${link.style.display})`);
    }
  });
  
  console.log(`📈 Total enlaces visibles: ${totalVisibles}`);
  
  // Actualizar información del usuario
  const userRoleSpan = document.getElementById('user-role');
  const userNameSpan = document.getElementById('user-name');
  
  if (userRoleSpan && usuario.rol) {
    userRoleSpan.textContent = usuario.rol;
  }
  
  if (userNameSpan && usuario.nombre) {
    userNameSpan.textContent = usuario.nombre;
  }
  
  // ADICIONAL: Para supervisor/auxiliar/doctor, cambiar título del sidebar si es necesario
  if (rol === 'supervisor' || rol === 'auxiliar' || rol === 'doctor') {
    const sidebarTitle = document.querySelector('.sidebar-title');
    if (sidebarTitle && rol === 'supervisor') {
      sidebarTitle.textContent = "Chequeos SIGIPS";
    } else if (sidebarTitle && rol === 'auxiliar') {
      sidebarTitle.textContent = "Entradas/Salidas SIGIPS";
    }
  }
}

// ========================= FUNCIONES DE NAVEGACIÓN =========================

function navegarConPermiso(view) {
  const usuario = obtenerUsuarioActual();
  if (!usuario) {
    window.location.href = '../../index.html';
    return;
  }
  
  const rol = usuario.rol.toLowerCase();
  const permisos = PERMISOS_POR_ROL[rol] || [];
  
  console.log(`🖱️ Intentando navegar a: ${view} (rol: ${rol})`);
  
  if (permisos.includes(view)) {
    console.log(`✅ Permiso concedido para ${view}`);
    window.location.href = view;
  } else {
    console.log(`🚫 Permiso DENEGADO para ${view}`);
    alert('No tienes permisos para acceder a esta página');
  }
}

function configurarNavegacionConRoles() {
  const links = document.querySelectorAll('.view-link');
  
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      if (view) {
        navegarConPermiso(view);
      }
    });
  });
}

// ========================= INICIALIZACIÓN PRINCIPAL =========================

function inicializarRoles() {
  console.log('🚀 Inicializando sistema de roles...');
  
  const usuario = obtenerUsuarioActual();
  const paginaActual = window.location.pathname.split('/').pop();
  
  // Si es página de login
  if (paginaActual === 'index.html' || paginaActual.includes('login')) {
    inicializarLogin();
    return;
  }
  
  // Verificar acceso
  if (!verificarAccesoPagina()) {
    return;
  }
  
  // Redirección automática para roles especiales
  if (usuario && paginaActual === 'dashboard.html') {
    const rol = usuario.rol.toLowerCase();
    const paginaInicioRol = PAGINA_INICIO_POR_ROL[rol];
    
    if (paginaInicioRol && paginaInicioRol !== 'dashboard.html') {
      console.log(`🔄 Redirigiendo ${rol} de dashboard a ${paginaInicioRol}`);
      window.location.href = paginaInicioRol;
      return;
    }
  }
  
  // Configurar navegación y menú
  configurarNavegacionConRoles();
  aplicarRolesMenu();
  
  console.log('✅ Sistema de roles inicializado correctamente');
}

// ========================= FUNCIONES GLOBALES =========================

function logout() {
  console.log('🚪 Cerrando sesión...');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('token');
  window.location.href = '../../index.html';
}

// Hacer funciones disponibles globalmente
window.navegarConPermiso = navegarConPermiso;
window.aplicarRolesMenu = aplicarRolesMenu;
window.verificarAccesoPagina = verificarAccesoPagina;
window.tienePermiso = tienePermiso;
window.obtenerUsuarioActual = obtenerUsuarioActual;
window.logout = logout;

// ========================= EJECUCIÓN AL CARGAR =========================

document.addEventListener('DOMContentLoaded', inicializarRoles);