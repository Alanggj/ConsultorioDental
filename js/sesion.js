document.addEventListener("DOMContentLoaded", function () {
    const sesion = JSON.parse(localStorage.getItem('sesionIniciada'));
    console.log("Sesión detectada:", sesion);

    const nav = document.querySelector("#navbarNav .navbar-nav");
    const bienvenida = document.getElementById("bienvenida");

    if (sesion && nav) {
        //ocultar inicio de sesión
        const loginLink = nav.querySelector('a[href="login.html"]');
        if (loginLink && loginLink.parentElement) loginLink.parentElement.remove();

        //ADMIN
        if (sesion.tipo === "admin") {
            //enlace a panel admin
            if (!document.getElementById("adminPanelLink")) {
                const adminLi = document.createElement("li");
                adminLi.className = "nav-item";
                adminLi.innerHTML = `<a class="nav-link text-warning fw-bold" id="adminPanelLink" href="panel-admin.html">Panel Admin</a>`;
                nav.appendChild(adminLi);
            }

            if (sesion.rol === 'asistente') {
                aplicarRestriccionesAsistente();
            }
        }

        //USUARIO
        if (sesion.tipo === "usuario") {
            if (!document.getElementById("panelUsuarioLink")) {
                const panelLi = document.createElement("li");
                panelLi.className = "nav-item";
                panelLi.innerHTML = `<a class="nav-link text-primary fw-bold" id="panelUsuarioLink" href="panel-usuario.html">Mi Panel</a>`;
                nav.appendChild(panelLi);
            }
        }

        //mostrar nombre
        if (bienvenida) {
            bienvenida.textContent = `¡Hola, ${sesion.nombre}!`;
            bienvenida.classList.remove("d-none");
        }

        //botón cerrar sesión
        if (!document.getElementById('cerrarSesion')) {
            const logoutLi = document.createElement("li");
            logoutLi.className = "nav-item";
            logoutLi.innerHTML = `<a class="nav-link text-danger" href="#" id="cerrarSesion">Cerrar Sesión</a>`;
            nav.appendChild(logoutLi);

            document.getElementById("cerrarSesion").addEventListener("click", () => {
                localStorage.removeItem("sesionIniciada");
                window.location.href = "index.html";
            });
        }
    }
});

//bloquea páginas y borra enlaces del menú si es asistente
function aplicarRestriccionesAsistente() {
    const paginasProhibidas = [
        'admin-expedientes.html',
        'expediente-detalle.html',
        'admin-recetas.html',
        'receta-detalle.html',
        'admin-ganancias.html'
    ];

    const pathActual = window.location.pathname; //bloquear url
    const esProhibida = paginasProhibidas.some(pagina => pathActual.includes(pagina));

    if (esProhibida) {
        alert("Acceso denegado: No tienes permisos para ver esta sección.");
        window.location.href = 'panel-admin.html'; //de vuelta a panel
        return; 
    }

    //limpiar navbar
    const todosLosLinks = document.querySelectorAll('a');

    todosLosLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        if (href && paginasProhibidas.some(prohibida => href.includes(prohibida))) {            
            const liPadre = link.closest('li'); 
            if (liPadre) {
                liPadre.remove();
            } else {
                link.remove();
            }
        }
    });
}