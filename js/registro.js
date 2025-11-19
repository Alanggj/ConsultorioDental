document.addEventListener('DOMContentLoaded', () => {

    const registroForm = document.getElementById('registroForm');

    registroForm.addEventListener('submit', async function (e) {
        e.preventDefault(); // Evita que se envíe el formulario

        // --- 1. Obtener todos los valores ---
        const nombre = document.getElementById('nombre').value.trim();
        const ap_paterno = document.getElementById('ap_paterno').value.trim();
        const ap_materno = document.getElementById('ap_materno').value.trim();
        const edad = document.getElementById('edad').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const correo = document.getElementById('email').value.trim();
        const usuario = document.getElementById('usuario').value.trim();
        const contrasena = document.getElementById('contrasena').value.trim();
        const contrasena_confirm = document.getElementById('contrasena_confirm').value.trim();

        // --- 2. Acumulador de errores ---
        const erroresValidacion = [];

        // --- 3. Validaciones de Campos ---

        // A. Campos requeridos
        if (!nombre || !ap_paterno || !ap_materno || !edad || !telefono || !correo || !usuario || !contrasena || !contrasena_confirm) {
            erroresValidacion.push("Debes llenar todos los campos.");
        }

        // B. Contraseñas
        if (contrasena !== contrasena_confirm) {
            erroresValidacion.push("Las contraseñas no coinciden.");
        }
        if (contrasena.length < 8) {
            erroresValidacion.push("La contraseña debe tener al menos 8 caracteres.");
        }
        if (!/[A-Z]/.test(contrasena)) {
            erroresValidacion.push("La contraseña debe incluir al menos una letra mayúscula (A-Z).");
        }
        if (!/[a-z]/.test(contrasena)) {
            erroresValidacion.push("La contraseña debe incluir al menos una letra minúscula (a-z).");
        }
        if (!/[0-9]/.test(contrasena)) {
            erroresValidacion.push("La contraseña debe incluir al menos un número (0-9).");
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(contrasena)) {
            erroresValidacion.push("La contraseña debe incluir al menos un símbolo (ej. !@#$).");
        }

        // C. Validación de Edad (NUEVO)
        // El HTML ya lo limita, pero esta es una doble verificación
        if (edad && parseInt(edad) > 100) {
            erroresValidacion.push("La edad no puede ser mayor a 100 años.");
        }
        if (edad && parseInt(edad) < 1) {
            erroresValidacion.push("La edad no puede ser menor a 1 año.");
        }

        // D. Validación de Teléfono (NUEVO)
        // Esta expresión regular (regex) solo permite números.
        if (telefono && !/^\d+$/.test(telefono)) {
            erroresValidacion.push("El teléfono solo debe contener números.");
        } else if (telefono && telefono.length !== 10) {
            // Asumiendo 10 dígitos para México, como en tu placeholder
            erroresValidacion.push("El teléfono debe tener 10 dígitos.");
        }

        // E. Validación de Correo (NUEVO)
        // Esta regex verifica un formato de email estándar (ej. usuario@dominio.com)
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (correo && !emailRegex.test(correo)) {
            erroresValidacion.push("El formato del correo no es válido (ej. usuario@dominio.com).");
        }

        // --- 4. Mostrar Errores o Enviar ---
        if (erroresValidacion.length > 0) {
            // Si hay errores, mostrarlos todos en una lista
            Swal.fire({
                icon: 'error',
                title: 'Formulario incorrecto',
                html: '<p class="text-start">Por favor, corrige los siguientes errores:</p>' +
                      '<ul class="text-start" style="list-style-position: inside; padding-left: 10px;">' +
                      erroresValidacion.map(error => `<li>${error}</li>`).join('') +
                      '</ul>',
                confirmButtonColor: '#0d6efd' // Color primario de Bootstrap
            });
            return; // Detiene la ejecución
        }

        // --- 5. Si todo está bien, preparar y enviar datos ---
        const datosPaciente = {
            nombre,
            ap_paterno,
            ap_materno,
            edad: parseInt(edad),
            telefono,
            correo,
            usuario,
            contrasena
        };

        try {
            const response = await fetch('http://localhost:3000/api/registro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosPaciente)
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire('Registro exitoso', 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.', 'success');
                window.location.href = 'login.html';
            } else {
                Swal.fire('Error del servidor', data.message, 'error');
            }

        } catch (error) {
            console.error('Error en el registro:', error);
            Swal.fire('Error de conexión', 'No se pudo conectar al servidor.', 'error');
        }
    });
});