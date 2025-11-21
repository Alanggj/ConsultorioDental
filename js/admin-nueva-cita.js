document.addEventListener('DOMContentLoaded', async () => {

    // 1. VERIFICAR ADMIN
    const sesion = JSON.parse(localStorage.getItem('sesionIniciada'));
    if (!sesion || sesion.tipo !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // --- VARIABLES DOM ---
    const buscadorInput = document.getElementById('buscador-paciente');
    const listaResultados = document.getElementById('lista-resultados');
    const usuarioIdInput = document.getElementById('usuario_id_seleccionado');
    const dateInput = document.getElementById('date');

    // Selectores
    const servicioSelect1 = document.getElementById('servicio');
    const timeSelect1 = document.getElementById('time');

    const servicioSelect2 = document.getElementById('servicio_2');
    const timeSelect2 = document.getElementById('time_2');

    const precioTotalInput = document.getElementById('precio_total');
    let serviciosDB = [];

    // --- 2. CARGAR SERVICIOS ---
    try {
        const res = await fetch('http://localhost:3000/api/servicios');
        serviciosDB = await res.json();

        const llenarSelect = (select, esOpcional) => {
            select.innerHTML = esOpcional ? '<option value="">-- Ninguno --</option>' : '<option value="">Seleccione...</option>';
            serviciosDB.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.servicio_id;
                opt.textContent = s.nombre;
                opt.dataset.precio = s.precio;
                select.appendChild(opt);
            });
        };
        llenarSelect(servicioSelect1, false);
        llenarSelect(servicioSelect2, true);
    } catch (e) { console.error(e); }

    // --- 3. LÓGICA DE PRECIOS Y HABILITACIÓN ---
    function calcularTotal() {
        let total = 0;
        const opt1 = servicioSelect1.selectedOptions[0];
        const opt2 = servicioSelect2.selectedOptions[0];

        if (opt1 && opt1.dataset.precio) total += parseFloat(opt1.dataset.precio);
        if (opt2 && opt2.dataset.precio) total += parseFloat(opt2.dataset.precio); // Suma solo si existe

        precioTotalInput.value = `$${total.toFixed(2)}`;
    }

    servicioSelect1.addEventListener('change', calcularTotal);

    servicioSelect2.addEventListener('change', function () {
        calcularTotal();
        // Si elige un 2do servicio, habilitamos su hora. Si no, la limpiamos y deshabilitamos.
        if (this.value) {
            timeSelect2.disabled = false;
        } else {
            timeSelect2.value = "";
            timeSelect2.disabled = true;
        }
    });

    // --- 4. BÚSQUEDA PACIENTE ---
    buscadorInput.addEventListener('keyup', async function () {
        const query = this.value.trim();
        if (query.length < 2) {
            listaResultados.style.display = 'none';
            usuarioIdInput.value = '';
            return;
        }
        const res = await fetch(`http://localhost:3000/api/buscar-paciente?query=${query}`);
        const pacientes = await res.json();

        listaResultados.innerHTML = '';
        listaResultados.style.display = 'block';

        if (pacientes.length > 0) {
            pacientes.forEach(p => {
                const div = document.createElement('div');
                div.classList.add('item-predictivo');
                div.innerHTML = `<strong>${p.nombre} ${p.ap_paterno}</strong><br><small>${p.telefono || 'Sin tel'}</small>`;
                div.addEventListener('click', () => {
                    buscadorInput.value = `${p.nombre} ${p.ap_paterno}`;
                    usuarioIdInput.value = p.usuario_id;
                    document.getElementById('phone').value = p.telefono || '';
                    document.getElementById('email').value = p.correo || '';
                    buscadorInput.classList.add('input-validado');
                    listaResultados.style.display = 'none';
                });
                listaResultados.appendChild(div);
            });
        } else {
            listaResultados.innerHTML = '<div class="p-2 text-muted">Sin resultados</div>';
        }
    });
    document.addEventListener('click', (e) => {
        if (e.target !== buscadorInput) listaResultados.style.display = 'none';
    });


    // --- 5. CARGAR HORARIOS DISPONIBLES ---
    dateInput.addEventListener('change', async function () {
        const fechaStr = this.value;
        if (!fechaStr) return;

        timeSelect1.innerHTML = '<option>Cargando...</option>';
        timeSelect2.innerHTML = '<option>Cargando...</option>';
        timeSelect1.disabled = true;
        timeSelect2.disabled = true;

        try {
            const response = await fetch(`http://localhost:3000/api/horarios-disponibles?fecha=${fechaStr}`);
            const horariosLibres = await response.json();

            const llenarHoras = (select) => {
                select.innerHTML = '<option value="">Selecciona hora</option>';

                if (horariosLibres.length === 0) {
                    select.innerHTML = '<option value="">No disponible</option>';
                    return;
                }

                horariosLibres.forEach(hora => {
                    // hora viene como "09:00:00" o "14:00:00"

                    // 1. Obtener la hora numérica de inicio (ej. 9, 10, 13)
                    const horaInicioNum = parseInt(hora.substring(0, 2));

                    // Calculamos qué día es para saber a qué hora cortamos
                    const fechaSeleccionada = new Date(fechaStr + 'T00:00:00');
                    const esSabado = fechaSeleccionada.getDay() === 6;

                    // Si es Sábado y la hora es 14 (o mayor), NO la agregamos.
                    if (esSabado && horaInicioNum >= 14) return;

                    // Si es Lunes-Viernes y la hora es 18 (o mayor), NO la agregamos.
                    // (Esto evita que salga 18:00 - 19:00 entre semana)
                    if (!esSabado && horaInicioNum >= 18) return;
                    // --------------------------------------------------

                    // 2. Calcular la hora de fin (Inicio + 1)
                    const horaFinNum = horaInicioNum + 1;

                    // 3. Formatear
                    const inicioFmt = String(horaInicioNum).padStart(2, '0') + ":00";
                    const finFmt = String(horaFinNum).padStart(2, '0') + ":00";

                    // 4. Crear opción
                    const opt = document.createElement('option');
                    opt.value = hora;
                    opt.textContent = `${inicioFmt} - ${finFmt}`;

                    select.appendChild(opt);
                });
            };

            llenarHoras(timeSelect1);
            llenarHoras(timeSelect2);

            // Habilitar 1 siempre, habilitar 2 solo si ya hay servicio seleccionado
            timeSelect1.disabled = false;
            if (servicioSelect2.value) timeSelect2.disabled = false;

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar los horarios', 'error');
        }
    });

    // --- 6. ENVÍO DEL FORMULARIO (AQUÍ ESTABA EL ERROR) ---
    document.getElementById('form-cita-admin').addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Validar Paciente
        if (!usuarioIdInput.value) {
            Swal.fire('Falta Paciente', 'Busca y selecciona un paciente de la lista.', 'warning');
            return;
        }

        // 2. Validar Fecha
        if (!dateInput.value) {
            Swal.fire('Falta Fecha', 'Selecciona la fecha de la cita.', 'warning');
            return;
        }

        // 3. Validar Servicio 1 (Obligatorio)
        const s1 = servicioSelect1.value;
        const t1 = timeSelect1.value;
        if (!s1 || !t1) {
            Swal.fire('Datos incompletos', 'El Servicio Principal y su Hora son obligatorios.', 'warning');
            return;
        }

        // 4. Validar Servicio 2 (Opcional pero estricto)
        const s2 = servicioSelect2.value;
        const t2 = timeSelect2.value;

        // SI eligió servicio 2, PERO NO eligió hora 2 -> ERROR
        if (s2 && (!t2 || t2 === "")) {
            Swal.fire('Falta Hora', 'Seleccionaste un segundo servicio, pero no le asignaste hora.', 'error');
            return;
        }

        // Validar choque de horarios (misma hora)
        if (s2 && t1 === t2) {
            Swal.fire('Error de Horario', 'No puedes agendar dos servicios a la misma hora. Elige horas distintas.', 'error');
            return;
        }

        // Construir Payload
        const payload = {
            usuario_id: usuarioIdInput.value,
            admin_id: sesion.id,
            fecha: dateInput.value,
            citas: [
                { servicio_id: s1, hora: t1 }
            ],
            comentario: document.getElementById('message').value
        };

        // Solo agregamos la segunda cita si s2 tiene valor (y ya validamos que t2 existe)
        if (s2) {
            payload.citas.push({ servicio_id: s2, hora: t2 });
        }

        // Enviar
        try {
            const response = await fetch('http://localhost:3000/api/citas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const res = await response.json();

            if (res.success) {
                Swal.fire('¡Éxito!', 'Citas agendadas correctamente.', 'success')
                    .then(() => window.location.href = 'admin-citas.html');
            } else {
                Swal.fire('Error del Servidor', res.message, 'error');
            }

        } catch (error) {
            console.error(error);
            Swal.fire('Error de Conexión', 'No se pudo conectar al servidor.', 'error');
        }
    });
});