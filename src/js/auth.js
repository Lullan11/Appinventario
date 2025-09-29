// src/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
  // Obtener el usuario completo desde localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const userRoleSpan = document.getElementById('user-role');

  // Si no hay usuario logueado, redirige al login
  if (!currentUser || !currentUser.nombre) {
    window.location.href = 'index.html';
    return;
  }

  // Mostrar el nombre del usuario en el sidebar
  if (userRoleSpan) {
    userRoleSpan.textContent = currentUser.nombre;
  }

  // Ejemplo de control por rol (opcional)
  if (currentUser.rol && currentUser.rol !== 'administrador') {
    // Ocultar link de Excel si no es administrador
    const excelLink = Array.from(document.querySelectorAll('a'))
      .find(link => link.textContent.trim().toLowerCase() === 'excel');
    if (excelLink) excelLink.style.display = 'none';
  }
});

// Función para cerrar sesión
function logout() {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}
