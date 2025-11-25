document.addEventListener("DOMContentLoaded", function () {
    const sesion = JSON.parse(localStorage.getItem('sesionIniciada'));
    console.log("Sesión detectada:", sesion);

    const nav = document.querySelector("#navbarNav .navbar-nav");
    const bienvenida = document.getElementById("bienvenida");

    if (sesion && nav) {
        //Ocultar "Iniciar sesión"
        const loginLink = nav.querySelector('a[href="login.html"]');
        if (loginLink) loginLink.parentElement.remove();

        //ADMIN
        if (sesion.tipo === "admin") {
            //Agregar "Panel Admin"
            if (!document.getElementById("adminPanelLink")) {
                const adminLi = document.createElement("li");
                adminLi.className = "nav-item";
                adminLi.innerHTML = `<a class="nav-link text-warning" id="adminPanelLink" href="panel-admin.html">Panel Admin</a>`;
                nav.appendChild(adminLi);
            }
        }

        //USUARIO
        if (sesion.tipo === "usuario") {
            
            //Agregar "Panel Usuario"
            if (!document.getElementById("panelUsuarioLink")) {
                const panelLi = document.createElement("li");
                panelLi.className = "nav-item";
                // Usamos text-info o el color que prefieras
                panelLi.innerHTML = `<a class="nav-link text-primary fw-bold" id="panelUsuarioLink" href="panel-usuario.html">Mi Panel</a>`;
                nav.appendChild(panelLi);
            }
        }

        //nombre de bienvenida
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
                location.href = "index.html";
            });
        }
    }
});