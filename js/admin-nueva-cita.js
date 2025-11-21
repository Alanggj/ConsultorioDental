// js/admin-nueva-cita.js

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

    // --- 3. LÓGICA DE PRECIOS Y VALIDACIONES ---
    function calcularTotal() {
        let total = 0;
        const opt1 = servicioSelect1.selectedOptions[0];
        const opt2 = servicioSelect2.selectedOptions[0];
        
        if (opt1 && opt1.dataset.precio) total += parseFloat(opt1.dataset.precio);
        if (opt2 && opt2.dataset.precio) total += parseFloat(opt2.dataset.precio);

        precioTotalInput.value = `$${total.toFixed(2)}`;
    }

    servicioSelect1.addEventListener('change', function() {
        if (servicioSelect2.value !== "" && this.value === servicioSelect2.value) {
            Swal.fire('Servicio Duplicado', 'No puedes tener el mismo servicio seleccionado dos veces.', 'warning');
            servicioSelect2.value = "";
            timeSelect2.value = "";
            timeSelect2.disabled = true;
        }
        calcularTotal();
    });
    
    servicioSelect2.addEventListener('change', function() {
        if (this.value !== "" && this.value === servicioSelect1.value) {
            Swal.fire('Atención', 'Este servicio ya está seleccionado como principal.', 'warning');
            this.value = ""; 
        }
        calcularTotal();
        
        if (this.value) {
            timeSelect2.disabled = false;
        } else {
            timeSelect2.value = "";
            timeSelect2.disabled = true;
        }
    });

    // --- 4. BÚSQUEDA PACIENTE ---
    buscadorInput.addEventListener('keyup', async function() {
        const query = this.value.trim();
        if(query.length < 2) {
            listaResultados.style.display = 'none';
            usuarioIdInput.value = '';
            return;
        }
        const res = await fetch(`http://localhost:3000/api/buscar-paciente?query=${query}`);
        const pacientes = await res.json();

        listaResultados.innerHTML = '';
        listaResultados.style.display = 'block';

        if(pacientes.length > 0) {
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

    // --- 5. FUNCIÓN REUTILIZABLE: CARGAR HORARIOS ---
    // Extraemos esta lógica para poder llamarla desde el evento change Y desde la carga inicial
    async function cargarHorariosDisponibles(fechaStr) {
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
                    // hora viene como "09:00:00"
                    const horaInicioNum = parseInt(hora.substring(0, 2));

                    // Filtros de horario límite
                    const fechaSeleccionada = new Date(fechaStr + 'T00:00:00');
                    const esSabado = fechaSeleccionada.getDay() === 6;

                    if (esSabado && horaInicioNum >= 14) return;
                    if (!esSabado && horaInicioNum >= 18) return;

                    const horaFinNum = horaInicioNum + 1;
                    const inicioFmt = String(horaInicioNum).padStart(2, '0') + ":00";
                    const finFmt = String(horaFinNum).padStart(2, '0') + ":00";

                    const opt = document.createElement('option');
                    opt.value = hora; // IMPORTANTE: El value debe coincidir con lo que llega por URL
                    opt.textContent = `${inicioFmt} - ${finFmt}`; 
                    
                    select.appendChild(opt);
                });
            };

            llenarHoras(timeSelect1);
            llenarHoras(timeSelect2);

            timeSelect1.disabled = false;
            if (servicioSelect2.value) timeSelect2.disabled = false;

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar los horarios', 'error');
        }
    }

    // Evento manual al cambiar fecha
    dateInput.addEventListener('change', async function() {
        cargarHorariosDisponibles(this.value);
    });

    // --- 6. DETECTAR PARÁMETROS URL Y PRE-LLENAR ---
    // --- 6. DETECTAR PARÁMETROS URL Y PRE-LLENAR (FECHA Y HORA) ---
    const urlParams = new URLSearchParams(window.location.search);
    const paramFecha = urlParams.get('fecha');
    const paramHora = urlParams.get('hora'); // Ej: "10:00:00" o "10:00"

    if (paramFecha) {
        console.log("1. Fecha detectada en URL:", paramFecha);
        
        // A. Asignar fecha al input
        dateInput.value = paramFecha;
        
        // B. Cargar horarios y ESPERAR a que termine (await es clave aquí)
        await cargarHorariosDisponibles(paramFecha);

        // C. Seleccionar la hora (si existe)
        if (paramHora) {
            console.log("2. Hora detectada en URL:", paramHora);
            
            // Paso 1: Intentar asignación directa (Exacta)
            timeSelect1.value = paramHora;

            // Paso 2: Si falló (el select sigue vacío), intentamos ajustar el formato
            // A veces la URL trae "09:00:00" y el select tiene "09:00", o viceversa.
            if (!timeSelect1.value) {
                // Opción A: Probar formato corto "HH:MM"
                const horaCorta = paramHora.substring(0, 5); 
                timeSelect1.value = horaCorta;
                
                // Opción B: Probar formato largo "HH:MM:00" (si venía corto)
                if (!timeSelect1.value && paramHora.length === 5) {
                    timeSelect1.value = paramHora + ":00";
                }
            }

            // Mensaje de confirmación en consola para depurar
            if (timeSelect1.value) {
                console.log("✅ Hora seleccionada exitosamente:", timeSelect1.value);
            } else {
                console.warn("❌ No se encontró la hora en el select. Opciones disponibles:", 
                             [...timeSelect1.options].map(o => o.value));
            }
        }
    }

    // --- 7. ENVÍO DEL FORMULARIO ---
    document.getElementById('form-cita-admin').addEventListener('submit', async (e) => {
        e.preventDefault();

        // ... (Tu lógica de validación existente va aquí) ...
        // Copia aquí tus validaciones (paciente, fecha, servicios duplicados, etc.)
        
        if (!usuarioIdInput.value) { Swal.fire('Falta Paciente', 'Selecciona un paciente.', 'warning'); return; }
        if (!dateInput.value) { Swal.fire('Falta Fecha', 'Selecciona la fecha.', 'warning'); return; }
        
        const s1 = servicioSelect1.value;
        const t1 = timeSelect1.value;
        if (!s1 || !t1) { Swal.fire('Datos incompletos', 'Servicio y Hora son obligatorios.', 'warning'); return; }

        const s2 = servicioSelect2.value;
        const t2 = timeSelect2.value;
        
        if (s2 && (!t2 || t2 === "")) { Swal.fire('Falta Hora', 'Falta hora del segundo servicio.', 'error'); return; }
        if (s2 && s1 === s2) { Swal.fire('Servicio Duplicado', 'Mismo servicio dos veces.', 'error'); return; }
        if (s2 && t1 === t2) { Swal.fire('Error de Horario', 'Misma hora para dos servicios.', 'error'); return; }

        const payload = {
            usuario_id: usuarioIdInput.value,
            admin_id: sesion.id,
            fecha: dateInput.value,
            citas: [ { servicio_id: s1, hora: t1 } ],
            comentario: document.getElementById('message').value
        };

        if (s2) payload.citas.push({ servicio_id: s2, hora: t2 });

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
                Swal.fire('Error', res.message, 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo conectar al servidor.', 'error');
        }
    });
});