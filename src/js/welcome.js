document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('gerente-btn').addEventListener('click', () => {
    localStorage.setItem('currentUser', 'gerente');
    window.location.href = 'dashboard.html';
  });

  document.getElementById('admin-btn').addEventListener('click', () => {
    localStorage.setItem('currentUser', 'administrador');
    window.location.href = 'dashboard.html';
  });
});
