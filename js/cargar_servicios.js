document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("contenedor-servicios");

    // DICCIONARIO DE IMÁGENES
    // Como la base de datos no tiene fotos, las asignamos aquí según el nombre exacto del servicio
    const mapaImagenes = {
        "Limpieza Dental": "images/gallery/ld.jpg",
        "Blanqueamiento": "images/gallery/blanqueamiento.jpg",
        "Ortodoncia": "images/gallery/ortodancia.png",
        "Extraccion Dental": "images/gallery/extdental.jpg",
        "Resinas Estéticas": "images/gallery/resest.png",
        "Prótesis Dentales": "images/gallery/proden.webp"
    };

    // Imagen por defecto por si agregas un servicio nuevo sin foto
    const imagenDefault = "images/gallery/medium-shot-man-getting-check-up.jpg"; 

    try {
        // Usar ruta relativa para que funcione tanto en local como en producción (Railway)
        const response = await fetch('/api/servicios');
        const servicios = await response.json();

        // Limpiamos el spinner de carga
        contenedor.innerHTML = "";

        if (servicios.length === 0) {
            contenedor.innerHTML = "<p class='text-center'>No hay servicios disponibles.</p>";
            return;
        }

        servicios.forEach(servicio => {
            // 1. Obtener la ruta de la imagen
            const imgUrl = mapaImagenes[servicio.nombre] || imagenDefault;

            // 2. Formatear el precio
            const precioFormateado = parseFloat(servicio.precio).toLocaleString('es-MX', {
                style: 'currency',
                currency: 'MXN'
            });

            // 3. Crear texto de horarios (Simplificado)
            // Si la base de datos devuelve un array en dias_disponible, tomamos el primero y último
            let textoHorario = "Consultar disponibilidad";
            if(servicio.dias_disponible && servicio.dias_disponible.length > 0) {
                 textoHorario = `${servicio.dias_disponible[0]} a ${servicio.dias_disponible[servicio.dias_disponible.length - 1]}`;
            }

            // 4. Crear el HTML de la tarjeta
            const cardHTML = `
                <div class="card mb-4 tarjeta-servicio shadow-sm">
                    <div class="row g-0">
                        <div class="col-md-4">
                            <img src="${imgUrl}" class="img-fluid w-100 h-100" style="object-fit: cover; min-height: 250px;" alt="${servicio.nombre}">
                        </div>
                        <div class="col-md-8">
                            <div class="card-body d-flex flex-column h-100 p-4">
                                <h4 class="card-title fw-bold">${servicio.nombre}</h4>
                                <p class="card-text">${servicio.descripcion || 'Sin descripción disponible.'}</p>
                                
                                <h6 class="text-primary mt-2 mb-1">${precioFormateado}</h6>
                                <p class="text-muted small">
                                    <i class="bi bi-calendar-check"></i> ${textoHorario}
                                </p>
                                
                                <div class="mt-auto">
                                    <a href="cita.html?servicio_id=${servicio.servicio_id}" 
                                       class="btn btn-outline-primary rounded-pill px-4">
                                       Agendar cita
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 5. Insertar en el HTML
            contenedor.insertAdjacentHTML('beforeend', cardHTML);
        });

    } catch (error) {
        console.error("Error cargando servicios:", error);
        contenedor.innerHTML = "<div class='alert alert-danger text-center'>Error al cargar los servicios. Intenta recargar la página.</div>";
    }
});