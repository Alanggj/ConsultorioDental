// Espera a que todo el HTML esté cargado
document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');

    // Maneja el evento 'submit' del formulario
    loginForm?.addEventListener('submit', async function (e) {
        e.preventDefault(); // Evita que la página se recargue

        const usuario = document.getElementById('usuario').value.trim();
        const contrasena = document.getElementById('contrasena').value.trim();

        if (!usuario || !contrasena) {
            Swal.fire('Campos incompletos', 'Por favor, completa todos los campos', 'warning');
            return;
        }

        // --- ESTA ES LA NUEVA LÓGICA DE BASE DE DATOS ---
        try {
            // 1. Envía los datos al backend (a un endpoint que crearemos)
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usuario, contrasena })
            });

            // 2. Espera la respuesta del servidor
            const data = await response.json();

            // 3. Procesa la respuesta
            if (data.success) {
                // Si el login fue exitoso, el servidor nos manda los datos del usuario.
                // Guardamos la sesión en localStorage (¡tu script sesion.js la usará!)
                localStorage.setItem('sesionIniciada', JSON.stringify(data.user));

                // 4. Redirige según el tipo de usuario
                if (data.user.tipo === 'admin') {
                    // ¡ÉXITO! Es un admin, lo mandamos al panel
                    await Swal.fire('Acceso concedido', `Bienvenido ${data.user.nombre}`, 'success');
                    location.href = 'panel-admin.html';
                
                } else {
                    // Es un paciente (usuario)
                    await Swal.fire('Bienvenido', data.user.nombre, 'success');
                    location.href = 'index.html';
                }

            } else {
                // El servidor dijo que las credenciales son incorrectas
                Swal.fire('Error', data.message || 'Credenciales incorrectas', 'error');
            }

        } catch (error) {
            // Error de conexión con el servidor
            console.error('Error en el inicio de sesión:', error);
            Swal.fire('Error de conexión', 'No se pudo conectar al servidor.', 'error');
        }
    });
});