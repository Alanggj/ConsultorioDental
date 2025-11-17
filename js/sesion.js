document.addEventListener("DOMContentLoaded", function () {
    const sesion = JSON.parse(localStorage.getItem('sesionIniciada'));
    console.log("Sesión detectada:", sesion);

    const nav = document.querySelector("#navbarNav .navbar-nav");
    const bienvenida = document.getElementById("bienvenida");

    if (sesion && nav) {
        // Ocultar "Iniciar sesión"
        const loginLink = nav.querySelector('a[href="login.html"]');
        if (loginLink) loginLink.parentElement.remove();

        // Ocultar secciones para el admin
        if (sesion.tipo === "admin") {
            const agendarLink = nav.querySelector('a[href="cita.html"]');
            
            if (agendarLink) {
                agendarLink.parentElement.style.display = 'none';
            }
            // Ocultar "Servicios"
            const serviciosLink = nav.querySelector('a[href="servicios.html"]');
            if (serviciosLink) {
                serviciosLink.parentElement.style.display = 'none';
            }
        }

        // Mostrar bienvenida
        if (bienvenida) {
            bienvenida.textContent = `¡Hola, ${sesion.nombre}!`;
            bienvenida.classList.remove("d-none");
        }

        // Agregar "Mis Citas"
        if (sesion.tipo === "usuario" && !document.getElementById("misCitasLink")) {
            const misCitasLi = document.createElement("li");
            misCitasLi.className = "nav-item";
            misCitasLi.innerHTML = `<a class="nav-link text-info" id="misCitasLink" href="miscitas.html">Mis Citas</a>`;
            nav.appendChild(misCitasLi);
        }

        // Agregar "Panel Admin"
        if (sesion.tipo === "admin" && !document.getElementById("adminPanelLink")) {
            const adminLi = document.createElement("li");
            adminLi.className = "nav-item";
            adminLi.innerHTML = `<a class="nav-link text-warning" id="adminPanelLink" href="panel-admin.html">Panel Admin</a>`;
            nav.appendChild(adminLi);
        }

        // Agregar "Cerrar sesión"
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
    }
});
