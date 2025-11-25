document.addEventListener("DOMContentLoaded", function () {
    const sesion = JSON.parse(localStorage.getItem('sesionIniciada'));
    if (!sesion || sesion.tipo !== 'admin') {
        alert('Acceso denegado. Debes ser administrador.');
        window.location.href = 'login.html';
        return;
    }

    const listaContainer = document.getElementById('lista-pagos-container');
    const displayTotal = document.getElementById('display-total-ganancias');
    const selectFiltro = document.querySelector('select.form-select'); //filtro

    const formatoMoneda = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    });

    async function cargarGanancias(filtro = 'all') {
        try {
            listaContainer.innerHTML = '<div class="p-5 text-center"><div class="spinner-border text-success"></div></div>';
            displayTotal.textContent = '...';

            const response = await fetch(`http://localhost:3000/api/ganancias?filtro=${filtro}`);
            
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            
            const pagos = await response.json();
            
            renderPagos(pagos);

        } catch (error) {
            console.error('Error cargando ganancias:', error);
            listaContainer.innerHTML = '<div class="p-3 text-center text-danger">Error al cargar los datos financieros.</div>';
            displayTotal.textContent = '$0.00';
        }
    }

    function renderPagos(lista) {
        listaContainer.innerHTML = '';

        if (lista.length === 0) {
            listaContainer.innerHTML = '<div class="p-3 text-center text-muted">No hay movimientos en este periodo.</div>';
            displayTotal.textContent = formatoMoneda.format(0); // Si no hay datos, es $0
            return;
        }

        const totalDesdeBD = lista[0].total_periodo; 
        displayTotal.textContent = formatoMoneda.format(totalDesdeBD);
    
        lista.forEach(pago => {
            const fechaObj = new Date(pago.fecha);
            //evitar problemas de zona horaria
            const dia = fechaObj.getUTCDate();
            const mes = fechaObj.toLocaleString('es-MX', { month: 'short', timeZone: 'UTC' }).toUpperCase().replace('.', '');
            const anio = fechaObj.getUTCFullYear();

            const item = document.createElement('div');
            item.className = 'payment-item';
            
            item.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-3 text-center border-end pe-3">
                        <div class="payment-date" style="font-weight: bold; color: #6c757d;">${dia} ${mes}</div>
                        <small class="text-muted">${anio}</small>
                    </div>
                    <div class="payment-info">
                        <h5 style="margin:0; font-size: 1rem;">${pago.paciente}</h5>
                        <p style="margin:0; font-size: 0.9rem; color: #198754;">
                            <i class="bi-check-circle-fill small"></i> ${pago.servicio}
                        </p>
                    </div>
                </div>
                <div class="payment-amount" style="font-size: 1.2rem; font-weight: 700; color: #198754;">
                    +${formatoMoneda.format(pago.monto)}
                </div>
            `;
            
            listaContainer.appendChild(item);
        });
    }

    if(selectFiltro){
        selectFiltro.addEventListener('change', (e) => {
            const valorSeleccionado = e.target.value; 
            cargarGanancias(valorSeleccionado);
        });
    }

    cargarGanancias('all');
});