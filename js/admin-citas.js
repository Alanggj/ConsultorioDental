// js/admin-citas.js

document.addEventListener("DOMContentLoaded", function () {
    // 1. VERIFICAR ADMIN
    const sesion = JSON.parse(localStorage.getItem('sesionIniciada'));
    if (!sesion || sesion.tipo !== 'admin') {
        alert('Acceso denegado. Debes ser administrador.');
        window.location.href = 'login.html';
        return;
    }

    const navVacacionesAdmin = document.getElementById('nav-vacaciones-admin');
    if (navVacacionesAdmin) navVacacionesAdmin.classList.remove('d-none');

    // 2. INICIAR
    cargarCitasDesdeBD();
});

// --- VARIABLES GLOBALES ---
const calendarBody = document.getElementById('calendar-body');
const currentMonthYear = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const citasListTitle = document.getElementById('citas-list-title');
const citasListContainer = document.getElementById('citas-list-container');
const noDaySelectedMsg = document.getElementById('no-day-selected-msg');
const searchCitaInput = document.getElementById('search-cita-input');
const noResultsMessage = document.getElementById('no-results-message');

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let citas = [];

// Cargar periodos de vacaciones (simulado o desde localStorage)
let vacationPeriods = JSON.parse(localStorage.getItem('vacationPeriods')) || [];
let vacaciones = getBlockedDays();

// --- API: CARGAR CITAS ---
async function cargarCitasDesdeBD() {
    try {
        const response = await fetch('http://localhost:3000/api/citas');

        if (!response.ok) throw new Error('Error al conectar con API');

        const data = await response.json();

        citas = data.map(cita => ({
            id: cita.id,
            fecha: cita.fecha, // Formato esperado YYYY-MM-DD
            hora: cita.hora ? cita.hora + (cita.hora.length === 5 ? ":00" : "") : "00:00:00",
            horaDisplay: cita.hora ? cita.hora.substring(0, 5) : "00:00",
            paciente: cita.paciente,
            servicio: cita.servicio || 'Consulta General',
            estado: mapearEstadoVisual(cita.estado),
            estadoBD: cita.estado
        }));

        renderCalendar();

        // Refrescar vista si hay un día seleccionado
        if (selectedDate) {
            const cell = document.querySelector(`td[data-date="${selectedDate}"]`);
            showDaySchedule(selectedDate, cell);
        } else {
            // Si no, intentar mostrar hoy
            const todayStr = new Date().toISOString().split('T')[0];
            const todayCell = document.querySelector(`td[data-date="${todayStr}"]`);
            if (todayCell) showDaySchedule(todayStr, todayCell);
        }

    } catch (error) {
        console.error(error);
        citasListContainer.innerHTML = `<div class="alert alert-danger">Error cargando citas.</div>`;
    }
}

// --- API: ACTUALIZAR ESTADO ---
async function actualizarEstadoCita(id, nuevoEstadoBD) {
    try {
        const response = await fetch(`http://localhost:3000/api/citas/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstadoBD })
        });

        const res = await response.json();
        if (res.success) {
            await cargarCitasDesdeBD(); // Recargar todo
        } else {
            alert('Error: ' + res.message);
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión.');
    }
}

// --- HELPERS ---
function mapearEstadoVisual(estadoBD) {
    if (estadoBD === 'agendada') return 'Pendiente';
    if (estadoBD === 'atendida') return 'Confirmada'; // O Atendida
    if (estadoBD === 'cancelada') return 'Cancelada';
    return estadoBD;
}

function getBlockedDays() {
    let blockedDays = [];
    for (const period of vacationPeriods) {
        let currentDate = new Date(period.start + 'T00:00:00');
        const endDate = new Date(period.end + 'T00:00:00');
        while (currentDate <= endDate) {
            blockedDays.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    return blockedDays;
}

// --- CALENDARIO LÓGICA ---
function renderCalendar() {
    calendarBody.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    vacationPeriods = JSON.parse(localStorage.getItem('vacationPeriods')) || [];
    vacaciones = getBlockedDays();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Ajuste para que Lunes sea el primer día (0=Dom, 1=Lun...)
    let startDay = firstDayOfMonth.getDay();
    if (startDay === 0) startDay = 6; else startDay--;

    currentMonthYear.textContent = new Date(currentYear, currentMonth).toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    let date = 1;
    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');

            if (i === 0 && j < startDay) {
                cell.classList.add('other-month');
            } else if (date > daysInMonth) {
                cell.classList.add('other-month');
            } else {
                cell.classList.add('current-month');
                let dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                cell.dataset.date = dateStr;
                cell.innerHTML = `<span class="day-number">${date}</span>`;

                let cellDate = new Date(dateStr + 'T00:00:00');
                if (cellDate.getTime() === today.getTime()) cell.classList.add('today');
                if (dateStr === selectedDate) cell.classList.add('selected-day');

                if (vacaciones.includes(dateStr)) {
                    cell.classList.add('vacation-day');
                    cell.title = "Vacaciones";
                } else {
                    // Contar solo activas para el badge
                    const citasActivas = citas.filter(c => c.fecha === dateStr && c.estadoBD !== 'cancelada').length;
                    if (citasActivas > 0) {
                        cell.innerHTML += `<span class="badge bg-primary cita-badge">${citasActivas} cita(s)</span>`;
                    }
                    cell.addEventListener('click', () => showDaySchedule(dateStr, cell));
                }
                date++;
            }
            row.appendChild(cell);
        }
        calendarBody.appendChild(row);
        if (date > daysInMonth) break;
    }
}

// --- MOSTRAR HORARIOS (LÓGICA PRINCIPAL) ---
// --- MOSTRAR HORARIOS (LÓGICA PRINCIPAL) ---
function showDaySchedule(dateStr, tdElement) {
    selectedDate = dateStr;

    document.querySelectorAll('.calendar td.selected-day').forEach(d => d.classList.remove('selected-day'));
    if (tdElement) tdElement.classList.add('selected-day');

    noDaySelectedMsg.classList.add('d-none');
    citasListContainer.innerHTML = '';
    citasListTitle.textContent = `Agenda: ${new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`;
    searchCitaInput.value = '';
    noResultsMessage.classList.add('d-none');

    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();

    // VALIDACIÓN DE DÍAS Y HORARIOS DE BD
    if (dayOfWeek === 0) { // 0 = Domingo
        citasListContainer.innerHTML = '<div class="alert alert-info text-center">Domingo Cerrado.</div>';
        return;
    }
    if (vacaciones.includes(dateStr)) {
        citasListContainer.innerHTML = '<div class="alert alert-warning text-center">Día de Vacaciones.</div>';
        return;
    }

    // DEFINIR RANGOS HORARIOS
    let startHour, endHour;
    if (dayOfWeek === 6) {
        // Sábado: 10:00 AM a 2:00 PM (14:00)
        startHour = 10;
        endHour = 14;
    } else {
        // Lunes a Viernes: 9:00 AM a 6:00 PM (18:00)
        startHour = 9;
        endHour = 18;
    }

    const citasDelDia = citas.filter(c => c.fecha === dateStr);

    // Generar Slots por Hora
    // Nota: Usamos < endHour para que el último slot sea (endHour-1) a (endHour)
    for (let h = startHour; h < endHour; h++) {
        const horaSimple = `${String(h).padStart(2, '0')}:00`; // Para buscar en BD (ej: "09:00:00")
        
        // --- ⭐ NUEVO: CREAR TEXTO DEL INTERVALO ⭐ ---
        const horaFin = `${String(h + 1).padStart(2, '0')}:00`;
        const intervaloVisual = `${String(h).padStart(2, '0')}:00 - ${horaFin}`;
        // ---------------------------------------------

        // Buscar TODAS las citas en esta hora (puede haber canceladas y una activa)
        const citasEnHora = citasDelDia.filter(c => c.horaDisplay === horaSimple || c.hora.startsWith(horaSimple));

        // Buscar si hay alguna ACTIVA (agendada o atendida)
        const citaActiva = citasEnHora.find(c => c.estadoBD !== 'cancelada');

        // 1. Renderizar primero las CANCELADAS (Historial visual)
        const citasCanceladas = citasEnHora.filter(c => c.estadoBD === 'cancelada');
        citasCanceladas.forEach(c => {
            // Pasamos 'intervaloVisual' en lugar de 'horaSimple'
            citasListContainer.innerHTML += generarHtmlCita(c, intervaloVisual);
        });

        // 2. Renderizar Slot: O la cita activa O el botón disponible
        if (citaActiva) {
            // Pasamos 'intervaloVisual' en lugar de 'horaSimple'
            citasListContainer.innerHTML += generarHtmlCita(citaActiva, intervaloVisual);
        } else {
            // Si no hay activa (aunque haya canceladas), mostramos DISPONIBLE
            citasListContainer.innerHTML += `
                <div class="cita-item disponible" data-nombre="disponible">
                    <div>
                        <h5 class="mb-0">${intervaloVisual}</h5>
                        <small class="text-muted">Disponible</small>
                    </div>
                    <div class="cita-actions">
                        <button class="btn btn-sm btn-success btn-agendar-aqui" data-hora="${horaSimple}" title="Agendar aquí">
                            <i class="bi-plus-circle"></i> Agendar
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Generador de HTML para tarjetas de citas
// Cambié el nombre del segundo parámetro a 'intervaloTiempo' para que sea más claro
function generarHtmlCita(cita, intervaloTiempo) {
    let estadoClass = `estado-${cita.estado.toLowerCase()}`;
    let botonesHtml = "";

    // Lógica de botones según estado
    if (cita.estado === "Pendiente") {
        botonesHtml = `
            <button class="btn btn-success btn-confirmar" title="Confirmar"><i class="bi-check-lg"></i></button>
            <button class="btn btn-danger btn-cancelar" title="Cancelar"><i class="bi-x-lg"></i></button>
        `;
    } else if (cita.estado === "Confirmada") {
        botonesHtml = `
            <button class="btn btn-outline-danger btn-cancelar" title="Cancelar"><i class="bi-x-lg"></i></button>
        `;
    } else if (cita.estado === "Atendida") {
        botonesHtml = `<span class="text-success fw-bold">Atendida</span>`;
    } else if (cita.estado === "Cancelada") {
        botonesHtml = `<span class="text-danger fw-bold">Cancelada</span>`;
    }

    return `
        <div class="cita-item ${estadoClass}" data-nombre="${cita.paciente.toLowerCase()}" data-id="${cita.id}">
            <div style="flex: 1; padding-right: 15px;">
                <h5 class="mb-2 fw-bold">${cita.paciente}</h5>
                <div class="mb-2">
                    <span class="badge bg-light text-dark border me-1">
                        <i class="bi-clock"></i> ${intervaloTiempo}
                    </span>
                    <span class="badge bg-primary text-white">
                        <i class="bi-tools"></i> ${cita.servicio}
                    </span>
                </div>
                <p class="mb-0 small text-muted">
                    <strong>Estado:</strong> <span class="fw-bold text-dark">${cita.estado}</span>
                </p>
            </div>
            <div class="cita-actions d-flex flex-column gap-2 align-items-end">
                <div class="btn-group btn-group-sm">${botonesHtml}</div>
                ${cita.estado !== "Cancelada" ? `
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-info text-white btn-ver-expediente"><i class="bi-folder2-open"></i> Exp.</button>
                    <button class="btn btn-sm btn-receta btn-generar-receta"><i class="bi-file-earmark-medical"></i> Receta</button>
                </div>` : ''}
            </div>
        </div>
    `;
}

// --- FILTRO DE BÚSQUEDA ---
searchCitaInput.addEventListener('keyup', function () {
    const searchTerm = this.value.toLowerCase().trim();
    const items = citasListContainer.querySelectorAll('.cita-item');
    let visibleCount = 0;

    items.forEach(item => {
        const nombre = item.dataset.nombre;
        if (nombre.includes(searchTerm) || nombre === 'disponible') {
            item.classList.remove('d-none');
            if (nombre !== 'disponible') visibleCount++;
        } else {
            item.classList.add('d-none');
        }
    });

    noResultsMessage.classList.toggle('d-none', visibleCount > 0 || searchTerm === '');
});

// --- LISTENERS DE CALENDARIO ---
prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
});

// --- DELEGACIÓN DE EVENTOS (BOTONES) ---
// --- DELEGACIÓN DE EVENTOS (BOTONES) ---
citasListContainer.addEventListener('click', function (e) {
    // Buscamos el botón más cercano al clic (por si le dan al ícono)
    const boton = e.target.closest('button');
    if (!boton) return;

    const citaItem = boton.closest('.cita-item');
    // Obtenemos el ID solo si existe (para citas ocupadas)
    const citaId = citaItem.dataset.id ? parseInt(citaItem.dataset.id) : null;

    // 1. CONFIRMAR ASISTENCIA (Botón Verde)
    if (boton.classList.contains('btn-confirmar')) {
        Swal.fire({
            title: '¿Confirmar asistencia?',
            text: "El paciente será marcado como 'Atendido'.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754', // Verde Bootstrap
            cancelButtonColor: '#6c757d', // Gris
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                actualizarEstadoCita(citaId, 'atendida');
                // Opcional: Mostrar éxito rápido
                Swal.fire('¡Confirmado!', 'La asistencia ha sido registrada.', 'success');
            }
        });
    }

    // 2. CANCELAR CITA (Botón Rojo)
    if (boton.classList.contains('btn-cancelar')) {
        Swal.fire({
            title: '¿Cancelar esta cita?',
            text: "El horario quedará disponible para otros pacientes.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545', // Rojo Bootstrap
            cancelButtonColor: '#3085d6', // Azul
            confirmButtonText: 'Sí, cancelar cita',
            cancelButtonText: 'No, conservar'
        }).then((result) => {
            if (result.isConfirmed) {
                actualizarEstadoCita(citaId, 'cancelada');
                Swal.fire('Cancelada', 'La cita ha sido cancelada correctamente.', 'success');
            }
        });
    }

    // 3. VER EXPEDIENTE (Botón Azul Claro)
    if (boton.classList.contains('btn-ver-expediente')) {
        window.location.href = `admin-expedientes.html?cita_id=${citaId}`;
    }

    // 4. AGENDAR EN HUECO (Botón "Agendar" Verde)
    if (boton.classList.contains('btn-agendar-aqui')) {
        const hora = boton.dataset.hora;
        window.location.href = `admin-nueva-cita.html?fecha=${selectedDate}&hora=${hora}`;
    }
});