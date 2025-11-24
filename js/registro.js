document.addEventListener('DOMContentLoaded', () => {

    const registroForm = document.getElementById('registroForm');
    const fechaInput = document.getElementById('fecha_nacimiento');
    const divTutor = document.getElementById('divTutor');
    const inputTutor = document.getElementById('nombre_tutor');

    // --- A. MOSTRAR/OCULTAR TUTOR (Sin cambios en lógica, solo visual) ---
    if(fechaInput && divTutor && inputTutor) {
        fechaInput.addEventListener('change', function() {
            const fechaNac = new Date(this.value);
            const hoy = new Date();
            
            let edad = hoy.getFullYear() - fechaNac.getFullYear();
            const mes = hoy.getMonth() - fechaNac.getMonth();
            if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
                edad--;
            }

            // Si tiene entre 1 y 17 años, pedimos tutor.
            // Si tiene 0 años, el submit lo bloqueará, pero visualmente aún mostramos el campo o no
            // (puedes dejarlo visible o no, pero la validación final es la importante).
            if (edad < 18 && edad >= 0) {
                divTutor.style.display = 'block';
                inputTutor.setAttribute('required', 'true'); 
            } else {
                divTutor.style.display = 'none';
                inputTutor.value = '';
                inputTutor.removeAttribute('required');
            }
        });
    }

    // --- B. ENVÍO DEL FORMULARIO ---
    registroForm.addEventListener('submit', async function (e) {
        e.preventDefault(); 

        // 1. Obtener valores
        const nombre = document.getElementById('nombre').value.trim();
        const ap_paterno = document.getElementById('ap_paterno').value.trim();
        const ap_materno = document.getElementById('ap_materno').value.trim();
        const fecha_nacimiento = document.getElementById('fecha_nacimiento').value;
        const nombre_tutor = document.getElementById('nombre_tutor') ? document.getElementById('nombre_tutor').value.trim() : '';
        const telefono = document.getElementById('telefono').value.trim();
        const correo = document.getElementById('email').value.trim();
        const usuario = document.getElementById('usuario').value.trim();
        const contrasena = document.getElementById('contrasena').value.trim();
        const contrasena_confirm = document.getElementById('contrasena_confirm').value.trim();

        const erroresValidacion = [];

        // 2. Validaciones básicas
        if (!nombre || !ap_paterno || !ap_materno || !fecha_nacimiento || !telefono || !correo || !usuario || !contrasena || !contrasena_confirm) {
            erroresValidacion.push("Debes llenar todos los campos obligatorios.");
        }

        // 3. Validaciones de Contraseña
        if (contrasena !== contrasena_confirm) erroresValidacion.push("Las contraseñas no coinciden.");
        if (contrasena.length < 8) erroresValidacion.push("La contraseña debe tener al menos 8 caracteres.");
        if (!/[A-Z]/.test(contrasena)) erroresValidacion.push("Falta mayúscula.");
        if (!/[a-z]/.test(contrasena)) erroresValidacion.push("Falta minúscula.");
        if (!/[0-9]/.test(contrasena)) erroresValidacion.push("Falta número.");
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(contrasena)) erroresValidacion.push("Falta símbolo.");

        // 4. LÓGICA DE EDAD (Aquí validamos el mínimo de 1 año)
        if (fecha_nacimiento) {
            const fechaNac = new Date(fecha_nacimiento);
            const hoy = new Date();

            if (fechaNac > hoy) {
                erroresValidacion.push("La fecha de nacimiento no puede ser en el futuro.");
            } else {
                let edadCalculada = hoy.getFullYear() - fechaNac.getFullYear();
                const mes = hoy.getMonth() - fechaNac.getMonth();
                if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
                    edadCalculada--;
                }

                // Validar max 100
                if (edadCalculada > 100) {
                    erroresValidacion.push("La edad no puede ser mayor a 100 años.");
                }

                // --- NUEVO: Validar min 1 año ---
                if (edadCalculada < 1) {
                    erroresValidacion.push("Lo sentimos, no se pueden registrar pacientes menores de 1 año (bebés).");
                }

                // Validar Tutor (solo si tiene entre 1 y 17 años)
                // Si tiene 0 años, el error de arriba ya saltará, así que esto es seguro.
                if (edadCalculada >= 1 && edadCalculada < 18 && !nombre_tutor) {
                    erroresValidacion.push("Al ser menor de edad, el nombre del tutor es obligatorio.");
                }
            }
        }

        // 5. Validaciones de contacto
        if (telefono && (!/^\d+$/.test(telefono) || telefono.length !== 10)) {
            erroresValidacion.push("El teléfono debe tener 10 dígitos numéricos.");
        }
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (correo && !emailRegex.test(correo)) {
            erroresValidacion.push("El formato del correo no es válido.");
        }

        // 6. Mostrar Errores
        if (erroresValidacion.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo registrar',
                html: '<ul class="text-start">' + erroresValidacion.map(e => `<li>${e}</li>`).join('') + '</ul>',
                confirmButtonColor: '#0d6efd'
            });
            return;
        }

        // 7. Enviar datos
        const datosPaciente = {
            nombre, ap_paterno, ap_materno, fecha_nacimiento, 
            nombre_tutor: nombre_tutor || null, 
            telefono, correo, usuario, contrasena
        };

        try {
            const response = await fetch('http://localhost:3000/api/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosPaciente)
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire('Registro exitoso', 'Tu cuenta ha sido creada.', 'success');
                window.location.href = 'login.html';
            } else {
                Swal.fire('Error', data.message, 'error');
            }

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo conectar al servidor.', 'error');
        }
    });
});