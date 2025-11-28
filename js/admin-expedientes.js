document.addEventListener('DOMContentLoaded', () => {
    cargarExpedientes();
    configurarFiltros(); // Nueva función para activar los filtros
});

async function cargarExpedientes() {
    const tabla = document.getElementById('tabla-expedientes');
    tabla.innerHTML = `<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;

    try {
        const response = await fetch('http://localhost:3000/api/expedientes');
        if (!response.ok) throw new Error('Error al obtener datos');
        
        const expedientes = await response.json();
        tabla.innerHTML = '';

        if (expedientes.length === 0) {
            tabla.innerHTML = '<tr><td colspan="4" class="text-center">No hay expedientes.</td></tr>';
            return;
        }

        expedientes.forEach(exp => {
            const fila = document.createElement('tr');
            
            // IMPORTANTE: Guardamos edad y sexo en atributos data- para usarlos al filtrar
            // Si el sexo es null, ponemos un string vacío
            fila.setAttribute('data-edad', exp.edad || 0); 
            fila.setAttribute('data-sexo', exp.sexo || ''); 

            fila.innerHTML = `
                <td>
                    <strong>${exp.nombre_paciente}</strong>
                    <br><small class="text-muted">${exp.edad} años - ${exp.sexo === 'M' ? 'Masculino' : exp.sexo === 'F' ? 'Femenino' : 'S/D'}</small>
                </td>
                <td>${exp.fecha_mostrar}</td>
                <td>${exp.expediente_id}</td>
                <td class="text-end">
                    <a href="expediente-detalle.html?id=${exp.expediente_id}" class="btn btn-sm btn-outline-primary"><i class="bi-pencil-fill"></i></a>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarExpediente(${exp.expediente_id})"><i class="bi-trash-fill"></i></button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="descargarPDF(${exp.expediente_id})"><i class="bi-download"></i></button>
                </td>
            `;
            tabla.appendChild(fila);
        });

    } catch (error) {
        console.error(error);
        tabla.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error de conexión.</td></tr>`;
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
window.eliminarExpediente = async (id) => { /* ... tu código de eliminar ... */ };
window.descargarPDF = (id) => { /* ... tu código de PDF ... */ };