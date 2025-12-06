document.addEventListener('DOMContentLoaded', () => {
    cargarExpedientes();
    configurarFiltros(); // Nueva función para activar los filtros
});

window.eliminarExpediente = async (usuarioId) => {
    const result = await Swal.fire({
        title: '¿Borrar historial?',
        text: "Se eliminará el diagnóstico y tratamiento. El paciente y sus citas NO se borrarán.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch(`/api/expediente/${usuarioId}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
            Swal.fire('¡Eliminado!', 'Historial clínico vaciado.', 'success');
            cargarExpedientes(); // Recargar la tabla automáticamente
        } else {
            Swal.fire('Error', 'No se pudo eliminar: ' + data.message, 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Fallo de conexión con el servidor.', 'error');
    }
};

async function cargarExpedientes() {
    const tabla = document.getElementById('tabla-expedientes');
    try {
        const response = await fetch('http://localhost:3000/api/expedientes');
        const expedientes = await response.json();
        tabla.innerHTML = '';

        if (expedientes.length === 0) {
            tabla.innerHTML = '<tr><td colspan="4" class="text-center">No hay expedientes.</td></tr>';
            return;
        }

        expedientes.forEach(exp => {
            const fila = document.createElement('tr');

            // --- AGREGA ESTAS 2 LÍNEAS PARA QUE LOS FILTROS FUNCIONEN ---
            fila.setAttribute('data-edad', exp.edad || 0);
            fila.setAttribute('data-sexo', exp.sexo || '');
            // ------------------------------------------------------------

            fila.innerHTML = `
        <td>
            <strong>${exp.nombre_paciente}</strong>
            <br><small class="text-muted">${exp.edad || 0} años - ${exp.sexo || 'S/D'}</small>
        </td>
        <td>${exp.fecha_mostrar}</td>
        <td>ID: ${exp.usuario_id}</td>
        <td class="text-end">
            
        <a href="expediente-detalle.html?id=${exp.usuario_id}&origen=expedientes" class="btn btn-sm btn-outline-primary" title="Editar">
            <i class="bi-pencil-fill"></i>
        </a>
            <button class="btn btn-sm btn-outline-danger" onclick="window.eliminarExpediente(${exp.usuario_id})" title="Borrar Historial">
                <i class="bi-trash-fill"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="descargarPDF(${exp.usuario_id})" title="PDF">
                <i class="bi-download"></i>
            </button>
        </td>
    `;
            tabla.appendChild(fila);
        });
    } catch (error) {
        console.error(error);
    }
}

// LÓGICA DE FILTRADO UNIFICADA
function configurarFiltros() {
    const inputBusqueda = document.getElementById('buscador-pacientes');
    const selectEdad = document.getElementById('filtro-edad');
    const selectSexo = document.getElementById('filtro-sexo');

    // Función que revisa TODOS los filtros a la vez
    function aplicarFiltros() {
        const texto = inputBusqueda.value.toLowerCase();
        const filtroEdad = selectEdad.value; // 'todos', 'mayores', 'menores'
        const filtroSexo = selectSexo.value; // 'todos', 'M', 'F'

        const filas = document.querySelectorAll('#tabla-expedientes tr');

        filas.forEach(fila => {
            // 1. Obtener datos de la fila
            const nombre = fila.textContent.toLowerCase();
            const edad = parseInt(fila.getAttribute('data-edad'));
            const sexo = fila.getAttribute('data-sexo'); // 'M' o 'F'

            // 2. Verificar condición de Texto
            const coincideTexto = nombre.includes(texto);

            // 3. Verificar condición de Edad
            let coincideEdad = true;
            if (filtroEdad === 'mayores' && edad < 18) coincideEdad = false;
            if (filtroEdad === 'menores' && edad >= 18) coincideEdad = false;

            // 4. Verificar condición de Sexo
            let coincideSexo = true;
            if (filtroSexo !== 'todos' && sexo !== filtroSexo) coincideSexo = false;

            // 5. Mostrar u ocultar
            if (coincideTexto && coincideEdad && coincideSexo) {
                fila.style.display = '';
            } else {
                fila.style.display = 'none';
            }
        });
    }

    // Escuchar eventos en los 3 controles
    inputBusqueda.addEventListener('keyup', aplicarFiltros);
    selectEdad.addEventListener('change', aplicarFiltros);
    selectSexo.addEventListener('change', aplicarFiltros);
}

// Función para descargar PDF directo desde la tabla de expedientes
function descargarPDF(usuarioId) {
    // 1. Mostrar alerta de carga
    Swal.fire({
        title: 'Generando Expediente...',
        text: 'Obteniendo historial clínico',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() }
    });

    // 2. Obtener datos del servidor
    fetch(`/api/expediente/${usuarioId}`)
        .then(res => res.json())
        .then(response => {
            if (!response.success) throw new Error(response.message);
            
            const data = response.data;

            // 3. Llenar el "Molde Oculto"
            
            // Doctor
            if (data.doctor_nombre) {
                document.getElementById('pdf-doctor-nombre').textContent = "DR. " + data.doctor_nombre.toUpperCase();
                document.getElementById('pdf-cedula').textContent = data.cedula_profesional || 'SIN CÉDULA';
            } else {
                document.getElementById('pdf-doctor-nombre').textContent = "DR. GENERAL";
                document.getElementById('pdf-cedula').textContent = "PENDIENTE";
            }

            // Paciente
            document.getElementById('pdf-nombre').textContent = data.nombre_completo;
            document.getElementById('pdf-edad').textContent = (data.edad || 0) + " años";
            document.getElementById('pdf-fecha').textContent = data.ultima_visita || new Date().toISOString().split('T')[0];

            // --- Lógica de Alertas ---
            
            // Alergias
            const boxAlergias = document.getElementById('pdf-box-alergias');
            if (data.alergias && data.alergias.trim() !== "") {
                boxAlergias.classList.remove('d-none');
                document.getElementById('pdf-alergias').textContent = data.alergias;
            } else {
                boxAlergias.classList.add('d-none');
            }

            // Enfermedades
            const boxEnfermedades = document.getElementById('pdf-box-enfermedades');
            if (data.enfermedades_cronicas && data.enfermedades_cronicas.trim() !== "") {
                boxEnfermedades.classList.remove('d-none');
                document.getElementById('pdf-enfermedades').textContent = data.enfermedades_cronicas;
            } else {
                boxEnfermedades.classList.add('d-none');
            }

            // Diagnóstico y Tratamiento
            document.getElementById('pdf-diagnostico').textContent = data.diagnostico || 'Sin diagnóstico registrado.';
            document.getElementById('pdf-tratamiento').textContent = data.tratamiento || 'Sin tratamiento registrado.';

            // 4. Configurar y Generar PDF
            const elemento = document.getElementById('molde-expediente');
            const opt = {
                margin:       [10, 10, 10, 10],
                filename:     `Expediente-${data.nombre_completo}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
            };

            html2pdf().set(opt).from(elemento).save().then(() => {
                Swal.close();
            });

        })
        .catch(err => {
            console.error(err);
            Swal.fire('Error', 'No se pudo generar el PDF: ' + err.message, 'error');
        });
}

// Asegúrate de que esta función esté disponible globalmente (window) si usas onclick en el HTML
window.descargarPDF = descargarPDF;