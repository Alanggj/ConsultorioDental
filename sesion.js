document.addEventListener("DOMContentLoaded", function () {
    const sesion = JSON.parse(localStorage.getItem('sesionIniciada'));
    console.log("Sesión detectada:", sesion);

    const nav = document.querySelector("#navbarNav .navbar-nav");
    const bienvenida = document.getElementById("bienvenida");

    if (sesion && nav) {
        // Ocultar "Iniciar sesión"
        const loginLink = nav.querySelector('a[href="login.html"]');
        if (loginLink) loginLink.parentElement.remove();

        // Mostrar bienvenida
        if (bienvenida) {
            bienvenida.textContent = `¡Hola, ${sesion.nombre}!`;
            bienvenida.classList.remove("d-none");
        }

        // Agregar "Mis Citas" (si es usuario)
        if (sesion.tipo === "usuario" && !document.getElementById("misCitasLink")) {
            const misCitasLi = document.createElement("li");
            misCitasLi.className = "nav-item";
            misCitasLi.innerHTML = `<a class="nav-link text-info" id="misCitasLink" href="miscitas.html">Mis Citas</a>`;
            nav.appendChild(misCitasLi);
        }

        // Acciones para el Administrador
        if (sesion.tipo === "admin" && !document.getElementById("adminPanelLink")) {
            
            // 1. Agregar "Panel Admin"
            const adminLi = document.createElement("li");
            adminLi.className = "nav-item";
            adminLi.innerHTML = `<a class="nav-link text-warning" id="adminPanelLink" href="panel-admin.html">Panel Admin</a>`;
            nav.appendChild(adminLi);

            // 2. Mostrar el enlace de Vacaciones (si existe)
            const navVacaciones = document.getElementById('nav-vacaciones');
            if (navVacaciones) {
                navVacaciones.classList.remove('d-none');
            }

            // 3. Ocultar "Agendar" para el admin
            const linkAgendar = document.getElementById("nav-agendar");
            if (linkAgendar) {
                // Ocultamos el elemento <li> padre para que no ocupe espacio
                linkAgendar.parentElement.style.display = "none";
            }
        }

        // Agregar "Cerrar sesión" para cualquier usuario logueado
        if (!document.getElementById('cerrarSesion')) {
            const logoutLi = document.createElement("li");
            logoutLi.className = "nav-item";
            logoutLi.innerHTML = `<a class="nav-link text-danger" href="#" id="cerrarSesion">Cerrar Sesión</a>`;
            nav.appendChild(logoutLi);

            document.getElementById("cerrarSesion").addEventListener("click", () => {
                localStorage.removeItem("sesionIniciada");
                location.href = "index.html";
            });
        }
        
    } // Fin de if (sesion && nav)
});