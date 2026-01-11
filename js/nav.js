document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll(".nav-link");
    const adminElements = document.querySelectorAll(".nav-admin, .nav-user");
  
    // Detectar si estás en index.html
    const pathname = location.pathname.endsWith("/") ? "index.html" : location.pathname.split("/").pop();
    const isIndex = pathname === "index.html";
  
    // Ajustar tamaño del texto
    function ajustarTamanioNavbar() {
      const ancho = window.innerWidth;
      if (ancho < 1400) {
        navLinks.forEach(link => link.style.fontSize = "0.9rem");
        adminElements.forEach(el => el.style.fontSize = "0.85rem");
      } else {
        navLinks.forEach(link => link.style.fontSize = "1rem");
        adminElements.forEach(el => el.style.fontSize = "0.95rem");
      }
    }
  
    ajustarTamanioNavbar();
    window.addEventListener("resize", ajustarTamanioNavbar);
  
    // Limpiar clase activa
    function limpiarActivos() {
      navLinks.forEach(link => link.classList.remove("active-link"));
    }
  
    const currentPath = pathname;
    const currentHash = location.hash;
    const currentURL = location.href;
  
    if (isIndex) {
      const sections = document.querySelectorAll("section[id]");
      if (sections.length > 0) {
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const id = entry.target.getAttribute("id");
              limpiarActivos();
              navLinks.forEach(link => {
                const href = link.getAttribute("href");
                if (!href || href === "#" || link.id === "cerrarSesion") return;

                if (
                  href === "#" + id ||
                  href === "index.html#" + id ||
                  currentURL.includes(href)
                ) {
                  link.classList.add("active-link");
                }
              });
            }
          });
        }, { threshold: 0.6 });
  
        sections.forEach(section => observer.observe(section));
      }
    } else {
      // En otras páginas: comparar por coincidencia exacta de nombre o URL completa
      limpiarActivos();
      navLinks.forEach(link => {
        const href = link.getAttribute("href");
        const cleanHref = href?.split("#")[0];
        if (!href || href === "#" || link.id === "cerrarSesion") return;
  
        if (
          cleanHref === currentPath ||
          currentURL.includes(href)
        ) {
          link.classList.add("active-link");
        }
      });
    }
  });
  