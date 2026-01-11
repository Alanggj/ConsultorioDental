
document.addEventListener("DOMContentLoaded", async function () {
    try {
        // 1. Obtener periodos de la base de datos
        const response = await fetch('http://localhost:3000/api/vacaciones');
        const periodos = await response.json();

        // 2. Fecha de hoy (Normalizada a 00:00:00 para comparar solo fechas)
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        let periodoActivo = null;

        // 3. Buscar si hoy coincide con algún rango
        for (let p of periodos) {
            // Creamos fechas usando UTC para evitar errores de zona horaria por un día
            // El input date viene como YYYY-MM-DD
            const inicioParts = p.fecha_inicio.split('T')[0].split('-');
            const finParts = p.fecha_fin.split('T')[0].split('-');

            // Mes en JS es 0-11, por eso restamos 1
            const inicio = new Date(inicioParts[0], inicioParts[1] - 1, inicioParts[2]);
            const fin = new Date(finParts[0], finParts[1] - 1, finParts[2]);

            // Comparación
            if (hoy >= inicio && hoy <= fin) {
                periodoActivo = p;
                break; // Encontramos uno, detenemos el ciclo
            }
        }

        // 4. Si hay vacaciones activas, mostrar Banner
        if (periodoActivo) {
            const banner = document.createElement('div');
            // Estilos de Bootstrap para alerta fija arriba
            banner.className = 'alert alert-warning text-center m-0 fixed-top fw-bold shadow-lg';
            banner.style.zIndex = "9999";
            banner.innerHTML = `
                    <i class="bi-exclamation-triangle-fill me-2"></i>
                    AVISO IMPORTANTE: El consultorio permanecerá cerrado por vacaciones del 
                    ${new Date(periodoActivo.fecha_inicio).toLocaleDateString('es-MX', { timeZone: 'UTC' })} al 
                    ${new Date(periodoActivo.fecha_fin).toLocaleDateString('es-MX', { timeZone: 'UTC' })}.
                `;

            // Insertar al principio del cuerpo
            document.body.prepend(banner);

            // Ajustar el menú para que no quede tapado por el banner
            const navbar = document.querySelector('.navbar');
            if (navbar) navbar.style.marginTop = "50px";

            // (Opcional) Si estás en cita.html, deshabilitar el botón de agendar
            const btnAgendar = document.getElementById('btn-agendar-submit'); // Ajusta el ID a tu botón real
            if (btnAgendar) {
                btnAgendar.disabled = true;
                btnAgendar.innerHTML = "No disponible por vacaciones";
            }
        }

    } catch (error) {
        console.error("No se pudo verificar estado de vacaciones", error);
    }
});
