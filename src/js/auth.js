// src/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = localStorage.getItem('currentUser');
  const userRoleSpan = document.getElementById('user-role');

  // Si no hay usuario, redirige al inicio
  if (!currentUser) {
    window.location.href = 'Welcome.html';
    return;
  }

  // Muestra el rol actual
  if (userRoleSpan) {
    userRoleSpan.textContent = currentUser;
  }

  // Mostrar/ocultar secciones según el rol
  if (currentUser === 'administrador') {
    // Por ejemplo, ocultar Excel si no es gerente
    const excelLink = Array.from(document.querySelectorAll('a'))
      .find(link => link.textContent.trim().toLowerCase() === 'excel');
    if (excelLink) excelLink.style.display = 'none';
  }
});

function logout() {
  localStorage.removeItem('currentUser');
  window.location.href = 'Welcome.html';
}
