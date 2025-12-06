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

// ... Mantén tus funciones window.eliminarExpediente y window.descargarPDF aquí ...
//window.eliminarExpediente = async (id) => { /* ... tu código de eliminar ... */ };
//window.descargarPDF = (id) => { /* ... tu código de PDF ... */ };