document.addEventListener("DOMContentLoaded", function () {
    // 1. Verificar Sesión de Admin
    const sesion = JSON.parse(localStorage.getItem('sesionIniciada'));
    
    // CAMBIO: Alerta bonita si no tiene permiso
    if (!sesion || sesion.tipo !== 'admin') {
        Swal.fire({
            icon: 'error',
            title: 'Acceso Denegado',
            text: 'Debes ser administrador para ver esta página.',
            confirmButtonText: 'Ir al Login',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = 'login.html';
            }
        });
        return; // Detenemos la ejecución del script
    }

    // 2. Referencias del DOM
    const listaContainer = document.getElementById('lista-vacaciones-container');
    const noVacacionesMsg = document.getElementById('no-vacaciones-msg');
    const btnGuardar = document.getElementById('btn-guardar-vacaciones');
    
    // Inicializar Modal de Bootstrap
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
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudieron cargar los datos del servidor.'
            });
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
                // Nota: Asegúrate de que tu backend envíe fechas compatibles
                const fInicio = new Date(p.fecha_inicio).toLocaleDateString('es-MX', { timeZone: 'UTC' });
                const fFin = new Date(p.fecha_fin).toLocaleDateString('es-MX', { timeZone: 'UTC' });

                const item = document.createElement('div');
                item.className = 'vacation-item';
                item.innerHTML = `
                    <div>
                        <div class="dates"><i class="bi-calendar-event"></i> ${fInicio} - ${fFin}</div>
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

        // VALIDACIÓN 1: Campos vacíos
        if (!fechaInicio || !fechaFin) {
            return Swal.fire({
                icon: 'warning',
                title: 'Faltan fechas',
                text: 'Por favor selecciona la fecha de inicio y fin.'
            });
        }

        // VALIDACIÓN 2: Lógica de fechas
        if (fechaFin < fechaInicio) {
            return Swal.fire({
                icon: 'error',
                title: 'Fechas inválidas',
                text: 'La fecha de fin no puede ser anterior a la fecha de inicio.'
            });
        }

        const datos = { fecha_inicio: fechaInicio, fecha_fin: fechaFin, descripcion };

        try {
            const res = await fetch('http://localhost:3000/api/vacaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            const data = await res.json(); 

            if (res.ok) {
                // ÉXITO
                form.reset();     // Limpiar formulario
                modal.hide();     // Cerrar modal
                cargarVacaciones(); // Recargar lista
                
                Swal.fire({
                    icon: 'success',
                    title: '¡Guardado!',
                    text: 'El periodo vacacional se registró correctamente.',
                    timer: 2000,
                    showConfirmButton: false
                });

            } else {
                // ERROR DEL SERVIDOR (Ej. conflicto de fechas)
                Swal.fire({
                    icon: 'error',
                    title: 'No se pudo guardar',
                    text: data.message || 'Ocurrió un error al intentar guardar.'
                });
            }
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor.'
            });
        }
    });

    // 6. Eliminar Periodo (DELETE) con Confirmación
    listaContainer.addEventListener('click', async function (e) {
        // Detectar si el click fue en el botón de eliminar (o en su icono)
        const boton = e.target.closest('.btn-eliminar');
        
        if (boton) {
            const id = boton.dataset.id;

            // Alerta de confirmación SweetAlert
            Swal.fire({
                title: '¿Estás seguro?',
                text: "Al eliminar este periodo, los pacientes podrán volver a agendar citas en estas fechas.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545', // Rojo bootstrap
                cancelButtonColor: '#6c757d',  // Gris bootstrap
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    // Solo si el usuario dijo "Sí", procedemos a borrar
                    try {
                        const res = await fetch(`http://localhost:3000/api/vacaciones/${id}`, { method: 'DELETE' });
                        
                        if (res.ok) {
                            cargarVacaciones(); // Recargar lista visual
                            Swal.fire(
                                '¡Eliminado!',
                                'El periodo vacacional ha sido eliminado.',
                                'success'
                            );
                        } else {
                            Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
                        }
                    } catch (error) {
                        console.error(error);
                        Swal.fire('Error', 'Fallo de conexión al intentar eliminar.', 'error');
                    }
                }
            });
        }
    });

    // Inicializar carga al abrir la página
    cargarVacaciones();
});