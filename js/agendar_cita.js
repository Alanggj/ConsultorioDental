document.addEventListener("DOMContentLoaded", async () => {
    // Inicializar EmailJS
    emailjs.init("1asuRmlqgPwQ1OAgz");

    const sesion = JSON.parse(localStorage.getItem("sesionIniciada"));

    // --- REFERENCIAS DEL DOM ---
    const selectServicio1 = document.getElementById("servicio");
    const selectServicio2 = document.getElementById("servicio2");
    const inputPrecio = document.getElementById("precio");
    const inputFecha = document.getElementById("date");
    const selectHora1 = document.getElementById("time");
    const selectHora2 = document.getElementById("time2");
    const btnAgendar = document.getElementById("btn-agendar");

    // Variable global para guardar los horarios traídos del servidor
    let horariosDisponiblesGlobal = [];

    // --- 1. CARGAR SERVICIOS ---
    try {
        const res = await fetch('http://localhost:3000/api/servicios');
        const serviciosData = await res.json();

        const llenarSelect = (selectElement) => {
            serviciosData.forEach(s => {
                const option = document.createElement('option');
                option.value = s.servicio_id;
                option.textContent = s.nombre;
                option.dataset.precio = s.precio;
                selectElement.appendChild(option);
            });
        };
        llenarSelect(selectServicio1);
        llenarSelect(selectServicio2);
    } catch (error) {
        console.error("Error cargando servicios", error);
    }

    // --- 2. CARGAR DATOS USUARIO ---
    if (sesion && sesion.id && sesion.tipo === 'usuario') {
        try {
            const res = await fetch(`http://localhost:3000/api/usuario/${sesion.id}`);
            const data = await res.json();
            if (data.success) {
                const u = data.data;
                document.getElementById("name").value = `${u.nombre} ${u.ap_paterno} ${u.ap_materno || ''}`.trim();
                document.getElementById("email").value = u.correo;
                document.getElementById("phone").value = u.telefono || '';
                document.getElementById("email").disabled = true;
                document.getElementById("name").readOnly = true;
            }
        } catch (error) { console.error(error); }
    }

    // --- 3. LÓGICA DE HORARIOS DINÁMICOS ---
    
    function renderizarOpcionesHorario(selectTarget, horaExcluida = null) {
        const valorActual = selectTarget.value;
        selectTarget.innerHTML = '<option value="">Selecciona hora</option>';

        if (horariosDisponiblesGlobal.length === 0) {
            const op = document.createElement('option');
            op.textContent = "No hay horarios";
            selectTarget.appendChild(op);
            return;
        }

        const horariosFiltrados = horariosDisponiblesGlobal.filter(hora => hora !== horaExcluida);

        if (horariosFiltrados.length === 0) {
            const op = document.createElement('option');
            op.textContent = "Sin cupo";
            selectTarget.appendChild(op);
            return;
        }

        horariosFiltrados.forEach(horaInicio => {
            const horaLimpia = horaInicio.substring(0, 5); 
            const [h, m] = horaLimpia.split(':').map(Number);
            const horaFin = `${h + 1}:${m < 10 ? '00' : m}`;

            const option = document.createElement('option');
            option.value = horaLimpia;
            option.textContent = `${horaLimpia} - ${horaFin}`;
            selectTarget.appendChild(option);
        });

        if (valorActual && horariosFiltrados.some(h => h.startsWith(valorActual))) {
            selectTarget.value = valorActual;
        }
    }

    // EVENTOS DE FECHA Y HORA
    inputFecha.addEventListener("change", async function () {
        const fecha = this.value;
        
        selectHora1.innerHTML = '<option value="">Cargando...</option>';
        selectHora1.disabled = true;
        selectHora2.innerHTML = '<option value="">Selecciona hora</option>';
        selectHora2.disabled = true;

        if (!fecha) return;

        try {
            const res = await fetch(`http://localhost:3000/api/horarios-disponibles?fecha=${fecha}`);
            horariosDisponiblesGlobal = await res.json();

            selectHora1.disabled = false;
            renderizarOpcionesHorario(selectHora1, selectHora2.value); 

            if (selectServicio2.value) {
                selectHora2.disabled = false;
                renderizarOpcionesHorario(selectHora2, selectHora1.value);
            }

        } catch (error) {
            console.error("Error obteniendo horarios", error);
            selectHora1.innerHTML = '<option value="">Error al cargar</option>';
        }
    });

    selectHora1.addEventListener("change", function() {
        if (selectServicio2.value) {
            renderizarOpcionesHorario(selectHora2, this.value);
        }
    });

    selectHora2.addEventListener("change", function() {
        renderizarOpcionesHorario(selectHora1, this.value);
    });

    selectServicio2.addEventListener("change", function() {
        calcularPrecioTotal();
        
        if (this.value) {
            selectHora2.disabled = false;
            renderizarOpcionesHorario(selectHora2, selectHora1.value);
        } else {
            selectHora2.disabled = true;
            selectHora2.value = "";
            selectHora2.innerHTML = '<option value="">Selecciona hora</option>';
            renderizarOpcionesHorario(selectHora1, null);
        }
    });

    // --- 4. PRECIOS ---
    function calcularPrecioTotal() {
        let total = 0;
        const op1 = selectServicio1.options[selectServicio1.selectedIndex];
        if (op1 && op1.dataset.precio) total += parseFloat(op1.dataset.precio);
        
        const op2 = selectServicio2.options[selectServicio2.selectedIndex];
        if (op2 && op2.dataset.precio) total += parseFloat(op2.dataset.precio);
        
        inputPrecio.value = total > 0 ? `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : "";
    }
    selectServicio1.addEventListener("change", calcularPrecioTotal);

    // --- 5. AGENDAR ---
    btnAgendar.addEventListener("click", async function () {
        const nombre = document.getElementById("name").value.trim();
        const telefono = document.getElementById("phone").value.trim();
        const fecha = document.getElementById("date").value;
        const mensaje = document.getElementById("message").value.trim();
        let email = document.getElementById("email").value.trim();

        const servicioId1 = selectServicio1.value;
        const hora1 = selectHora1.value;
        const servicioId2 = selectServicio2.value;
        const hora2 = selectHora2.value;

        // --- VALIDACIONES ---
        
        // 1. Campos obligatorios básicos
        if (!nombre || !email || !fecha || !hora1 || !servicioId1) {
            return Swal.fire('Faltan datos', 'Por favor completa los campos del servicio principal.', 'warning');
        }

        // 2. Validación de Segundo Servicio incompleto
        if (servicioId2 && !hora2) {
            return Swal.fire('Falta hora', 'Has seleccionado un segundo servicio pero no has elegido la hora.', 'warning');
        }

        // 3. Validación de Horas Iguales
        if (servicioId2 && hora1 === hora2) {
            return Swal.fire('Horario inválido', 'No puedes agendar dos servicios a la misma hora exacta.', 'error');
        }

        // 4. ⭐ NUEVA VALIDACIÓN: SERVICIOS IGUALES ⭐
        if (servicioId2 && servicioId1 === servicioId2) {
            return Swal.fire('Servicio duplicado', 'No puedes seleccionar el mismo servicio dos veces. Por favor elige uno distinto o deja el segundo campo vacío.', 'warning');
        }

        // 5. Sesión iniciada
        if (!sesion || !sesion.id) {
            return Swal.fire('Atención', 'Inicia sesión para agendar.', 'info')
                .then(() => window.location.href = 'login.html');
        }

        // --- PREPARAR DATOS ---
        const listaCitas = [];
        listaCitas.push({ servicio_id: parseInt(servicioId1), hora: hora1 });
        
        if(servicioId2) {
            listaCitas.push({ servicio_id: parseInt(servicioId2), hora: hora2 });
        }

        const datosBackend = {
            usuario_id: sesion.id,
            admin_id: 1, 
            fecha: fecha,
            comentario: mensaje,
            citas: listaCitas
        };

        // --- ENVIAR AL BACKEND ---
        try {
            const response = await fetch('http://localhost:3000/api/citas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosBackend)
            });
            const resData = await response.json();

            if (response.ok) {
                // Generar texto para el correo
                const serv1Txt = selectServicio1.options[selectServicio1.selectedIndex].text;
                let serviciosTxt = `${serv1Txt} a las ${hora1}`;
                if (servicioId2) {
                    const serv2Txt = selectServicio2.options[selectServicio2.selectedIndex].text;
                    serviciosTxt += ` y ${serv2Txt} a las ${hora2}`;
                }

                emailjs.send("service_ot6ffgl", "template_g1imyft", {
                    nombre, email, telefono, fecha, 
                    hora: hora1,
                    servicio: serviciosTxt, 
                    precio: inputPrecio.value, 
                    mensaje: mensaje || "(Sin mensaje)"
                });

                Swal.fire('¡Agendada!', 'Tus citas han sido registradas exitosamente.', 'success')
                    .then(() => {
                        document.getElementById("form-cita").reset();
                        window.location.href = 'index.html';
                    });
            } else {
                Swal.fire('No se pudo agendar', resData.message, 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
        }
    });
});