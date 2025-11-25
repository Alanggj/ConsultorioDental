
document.addEventListener("DOMContentLoaded", function () {
    // 1. Verificar Sesión de Admin
    const sesion = JSON.parse(localStorage.getItem('sesionIniciada'));
    if (!sesion || sesion.tipo !== 'admin') {
        alert('Acceso denegado. Debes ser administrador.');
        window.location.href = 'login.html';
        return;
    }

    // 2. Referencias del DOM
    const listaContainer = document.getElementById('lista-vacaciones-container');
    const noVacacionesMsg = document.getElementById('no-vacaciones-msg');
    const btnGuardar = document.getElementById('btn-guardar-vacaciones');
    const modalElement = document.getElementById('modalVacaciones');
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById('form-vacaciones');

    // 3. Función para cargar datos desde la API
    async function cargarVacaciones() {
        try {
            const response = await fetch('http://localhost:3000/api/vacaciones');
            const vacaciones = await response.json();
            renderVacaciones(vacaciones);
        } catch (error) {
            console.error('Error cargando vacaciones:', error);
            alert('Error al conectar con el servidor');
        }
    }

    // 4. Renderizar lista en HTML
    function renderVacaciones(lista) {
        listaContainer.innerHTML = '';

        if (lista.length === 0) {
            noVacacionesMsg.style.display = 'block';
        } else {
            noVacacionesMsg.style.display = 'none';

            lista.forEach(p => {
                // Ajuste de zona horaria simple para visualización
                const fInicio = new Date(p.fecha_inicio).toLocaleDateString('es-MX', { timeZone: 'UTC' });
                const fFin = new Date(p.fecha_fin).toLocaleDateString('es-MX', { timeZone: 'UTC' });

                const item = document.createElement('div');
                item.className = 'vacation-item';
                item.innerHTML = `
                            <div>
                                <div class="dates">${fInicio} - ${fFin}</div>
                                <div class="desc">${p.descripcion || 'Sin descripción'}</div>
                            </div>
                            <button class="btn btn-sm btn-danger btn-eliminar" data-id="${p.vacacion_id}" title="Eliminar Periodo">
                                <i class="bi-trash-fill"></i>
                            </button>
                        `;
                listaContainer.appendChild(item);
            });
        }
    }

    // 5. Guardar Nuevo Periodo (POST)
    btnGuardar.addEventListener('click', async function () {
        const fechaInicio = document.getElementById('fecha-inicio').value;
        const fechaFin = document.getElementById('fecha-fin').value;
        const descripcion = document.getElementById('descripcion').value;

        if (!fechaInicio || !fechaFin) return alert('Selecciona ambas fechas');
        if (fechaFin < fechaInicio) return alert('La fecha fin no puede ser anterior a la inicio');

        const datos = { fecha_inicio: fechaInicio, fecha_fin: fechaFin, descripcion };

        try {
            const res = await fetch('http://localhost:3000/api/vacaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            const data = await res.json(); // Leemos la respuesta JSON

            if (res.ok) {
                // Éxito (200-299)
                form.reset();
                modal.hide();
                cargarVacaciones();
                alert('Periodo guardado correctamente');
            } else {
                // Error (400 o 500)
                // Aquí mostramos el mensaje que mandamos desde el server ("Ya existe un periodo...")
                alert(data.message || 'Error al guardar');
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión con el servidor');
        }
    });

    // 6. Eliminar Periodo (DELETE)
    listaContainer.addEventListener('click', async function (e) {
        const boton = e.target.closest('.btn-eliminar');
        if (boton) {
            if (confirm('¿Eliminar este periodo vacacional?')) {
                const id = boton.dataset.id;
                try {
                    const res = await fetch(`http://localhost:3000/api/vacaciones/${id}`, { method: 'DELETE' });
                    if (res.ok) cargarVacaciones();
                } catch (error) {
                    console.error(error);
                }
            }
        }
    });

    // Inicializar carga
    cargarVacaciones();
});
