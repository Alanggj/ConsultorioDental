document.addEventListener('DOMContentLoaded', () => {
    cargarRecetas();
    configurarFiltros();
});

async function cargarRecetas() {
    const tabla = document.getElementById('tabla-recetas');
    tabla.innerHTML = `<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;

    try {
        // Asegúrate de haber agregado la ruta /api/recetas en tu server.js
        const response = await fetch('http://localhost:3000/api/recetas');
        
        if (!response.ok) throw new Error('Error al obtener recetas');
        
        const recetas = await response.json();
        tabla.innerHTML = '';

        if (recetas.length === 0) {
            tabla.innerHTML = '<tr><td colspan="4" class="text-center">No hay recetas registradas.</td></tr>';
            return;
        }

        recetas.forEach(receta => {
            const fila = document.createElement('tr');

            // Guardamos la fecha en un atributo data- para filtrar fácilmente luego
            fila.setAttribute('data-fecha', receta.fecha); 

            // Nota: receta.medicamentos lo cortamos si es muy largo para que no rompa la tabla
            const resumenMedicamento = receta.medicamentos 
                ? (receta.medicamentos.substring(0, 50) + (receta.medicamentos.length > 50 ? '...' : '')) 
                : 'Ver detalles';

            fila.innerHTML = `
                <td><strong>${receta.nombre_paciente}</strong></td>
                <td>${receta.fecha}</td>
                <td>${resumenMedicamento}</td>
                <td class="text-end">
                    <a href="receta-detalle.html?id=${receta.receta_id}&origen=recetas" 
                       class="btn btn-sm btn-outline-primary" title="Ver/Editar">
                        <i class="bi-pencil-fill"></i>
                    </a>
                    <button class="btn btn-sm btn-outline-danger" title="Eliminar"
                        onclick="eliminarReceta(${receta.receta_id})">
                        <i class="bi-trash-fill"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary"
                        title="Descargar PDF" onclick="descargarRecetaPDF(${receta.receta_id})">
                        <i class="bi-download"></i>
                    </button>
                </td>
            `;
            tabla.appendChild(fila);
        });

    } catch (error) {
        console.error(error);
        tabla.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error de conexión con el servidor.</td></tr>`;
    }
}

function configurarFiltros() {
    const inputBusqueda = document.getElementById('buscador-recetas');
    const selectFecha = document.getElementById('filtro-fecha');

    function aplicarFiltros() {
        const texto = inputBusqueda.value.toLowerCase();
        const filtroFecha = selectFecha.value; // 'todos', 'hoy', 'mes'
        
        const filas = document.querySelectorAll('#tabla-recetas tr');
        
        // Obtenemos fecha actual como strings para comparar fácilmente
        const hoy = new Date();
        // Formato local YYYY-MM-DD (ojo con el ajuste de zona horaria local)
        const year = hoy.getFullYear();
        const month = String(hoy.getMonth() + 1).padStart(2, '0');
        const day = String(hoy.getDate()).padStart(2, '0');
        
        const fechaHoyStr = `${year}-${month}-${day}`;     // "2025-12-05"
        const mesActualStr = `${year}-${month}`;           // "2025-12"

        filas.forEach(fila => {
            // 1. Datos de la fila
            const contenidoFila = fila.textContent.toLowerCase();
            const fechaRecetaStr = fila.getAttribute('data-fecha'); // Viene como "YYYY-MM-DD" desde la BD
            
            // 2. Condición Texto
            const coincideTexto = contenidoFila.includes(texto);

            // 3. Condición Fecha
            let coincideFecha = true;

            if (filtroFecha !== 'todos' && fechaRecetaStr) {
                if (filtroFecha === 'hoy') {
                    // Comparación directa de cadenas: "2025-12-05" === "2025-12-05"
                    if (fechaRecetaStr !== fechaHoyStr) coincideFecha = false;
                } 
                else if (filtroFecha === 'mes') {
                    // Comparación de inicio de cadena: "2025-12-05".startsWith("2025-12")
                    if (!fechaRecetaStr.startsWith(mesActualStr)) coincideFecha = false;
                }
            }

            // 4. Mostrar/Ocultar
            if (coincideTexto && coincideFecha) {
                fila.style.display = '';
            } else {
                fila.style.display = 'none';
            }
        });
    }

    inputBusqueda.addEventListener('keyup', aplicarFiltros);
    selectFecha.addEventListener('change', aplicarFiltros);
}

//eliminar receta
window.eliminarReceta = (id) => {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "No podrás revertir esta acción. La receta se borrará permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#3085d6', 
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:3000/api/recetas/${id}`, {
                    method: 'DELETE'
                });
                
                const data = await response.json();

                if (response.ok && data.success) {
                    Swal.fire(
                        '¡Eliminado!',
                        'La receta ha sido eliminada.',
                        'success'
                    );
                    cargarRecetas(); 
                } else {
                    Swal.fire('Error', data.message || 'No se pudo eliminar.', 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
            }
        }
    });
};

window.descargarRecetaPDF = (id) => {
    // Asumiendo que tienes una lógica para generar PDFs o abrir una nueva ventana
    // Ejemplo:
    window.open(`imprimir-receta.html?id=${id}`, '_blank');
};