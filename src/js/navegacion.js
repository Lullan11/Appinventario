document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.view-link');

  links.forEach(link => {
    const view = link.getAttribute('data-view');

    // Añadir navegación al hacer clic
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (view) {
        window.location.href = view;
      }
    });

    // Resaltar el enlace activo si coincide con la URL actual
    if (view && window.location.pathname.includes(view)) {
      link.classList.add('bg-[#22C55E]', 'text-[#0F172A]', 'font-semibold');
    }
  });
});
