# Consultorio Dental

## Descripción
**Consultorio Dental** es una aplicación web integral para la gestión administrativa y médica de una clínica dental. Permite la administración eficiente de pacientes, citas médicas, expedientes clínicos y control financiero, facilitando la interacción entre doctores y pacientes a través de una plataforma centralizada.

## Arquitectura
El sistema utiliza una arquitectura **Cliente-Servidor (Monolito Modular)**:
```
ConsultorioDental/
├── css/             # Estilos (Bootstrap + Custom)
├── js/              # Lógica Cliente (Fetch API, DOM)
├── server.js        # Entry Point del Backend (Express)
├── database.sql     # Schema de Base de Datos
├── *.html           # Vistas (Admin, Usuario, Landing)
├── package.json     # Dependencias (pg, express, dotenv)
└── .env             # Variables de entorno (DB Credenciales)
```
*   **Backend**: API RESTful construida con Node.js y Express.
*   **Base de Datos**: PostgreSQL con procedimientos almacenados.
*   **Frontend**: Cliente web estático que consume la API.

## Tecnologías Utilizadas
*   **Backend**: Node.js, Express.js (v5.x), dotenv, cors.
*   **Base de Datos**: PostgreSQL (v14+).
    *   Drivers: `pg` (node-postgres).
*   **Frontend**: HTML5, CSS3, JavaScript (Vanilla).
*   **Herramientas**: Postman (pruebas de API), pgAdmin (gestión de BD).

## Características
*   **Gestión de Usuarios**:
    *   Roles diferenciados: Administradores/Doctores y Pacientes.
    *   Validaciones de registro (edad mínima, formato contraseña).
*   **Agenda Médica**:
    *   Gestión de citas con detección automática de conflictos de horario.
    *   Bloqueo automático de fechas por periodos vacacionales (`trg_fn_validar_vacaciones`).
*   **Expediente Clínico Electrónico**:
    *   Historial automático de diagnósticos y tratamientos.
    *   Generación de expedientes vacíos al registrar usuarios.
*   **Control Financiero**:
    *   Registro de pagos automático al atender citas.
    *   Reportes de ganancias por día, mes o año.
*   **Reportes Avanzados**:
    *   Vistas SQL para análisis de datos (`Vista_Reporte_Ganancias`).
    *   Procedimientos almacenados para reportes detallados.

## Instalación y Configuración
1.  **Base de Datos**:
    *   Instalar PostgreSQL.
    *   Crear una base de datos nueva (ej. `ConsultorioDB`).
    *   Ejecutar el script `database.sql` para crear tablas, enums y triggers.
2.  **Servidor**:
    *   Clonar el repositorio.
    *   Instalar dependencias: `npm install`.
    *   Crear archivo `.env` con las variables: `DB_USER`, `DB_HOST`, `DB_DATABASE`, `DB_PASSWORD`, `DB_PORT`.
    *   Iniciar: `node server.js`.
3.  **Cliente**:
    *   Abrir `index.html` o cualquier página desde el navegador (asegurando que el servidor esté corriendo en `localhost:3000`).

## Modelo de Datos
El esquema relacional incluye:
*   **Admin**: Personal médico y administrativo (`admin_tipo`: doctor/asistente).
*   **Usuario**: Información demográfica de pacientes.
*   **Cita**: Registro central de eventos (`estatus`: agendada/atendida/cancelada).
*   **Servicio**: Catálogo de tratamientos y precios.
*   **Detalle_Cita**: Relación N:M entre Citas y Servicios.
*   **Expediente**: Historial clínico vinculado al usuario.
*   **Receta**: Prescripciones médicas vinculadas a una cita.
*   **Pago**: Registro financiero.

## Autor
**Alan Gael Gallardo Jimenez**
