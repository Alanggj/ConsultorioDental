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
*   **Backend**: 
    *   Node.js - Entorno de ejecución JavaScript del lado del servidor
    *   Express.js (v5.x) - Framework web minimalista para APIs RESTful
    *   dotenv - Gestión de variables de entorno
    *   cors - Middleware para habilitar CORS
*   **Base de Datos**: 
    *   PostgreSQL (v14+) - Sistema de gestión de bases de datos relacional
    *   pg (node-postgres) - Driver de PostgreSQL para Node.js
*   **Frontend**: 
    *   HTML5 - Estructura semántica de las páginas
    *   CSS3 - Estilos y diseño responsivo (Bootstrap + Custom)
    *   JavaScript (Vanilla) - Lógica del cliente, manipulación del DOM, Fetch API para comunicación con el backend
*   **Herramientas**: 
    *   Postman - Pruebas de API
    *   pgAdmin - Gestión visual de la base de datos

## Características
*   **Gestión de Usuarios**:
    *   Roles diferenciados: Administradores/Doctores y Pacientes
    *   Validaciones de registro (edad mínima, formato contraseña)
*   **Agenda Médica**:
    *   Gestión de citas con detección automática de conflictos de horario
    *   Bloqueo automático de fechas por periodos vacacionales
*   **Expediente Clínico Electrónico**:
    *   Historial automático de diagnósticos y tratamientos
    *   Generación de expedientes vacíos al registrar usuarios
*   **Control Financiero**:
    *   Registro de pagos automático al atender citas
    *   Reportes de ganancias por día, mes o año
*   **Reportes Avanzados**:
    *   Vistas SQL para análisis de datos
    *   Procedimientos almacenados para reportes detallados

## Instalación y Configuración
1.  **Base de Datos**:
    *   Instalar PostgreSQL
    *   Crear una base de datos nueva (ej. `ConsultorioDB`)
    *   Ejecutar el script `database.sql` para crear tablas, enums y triggers
2.  **Servidor**:
    *   Clonar el repositorio
    *   Instalar dependencias: `npm install`
    *   Crear archivo `.env` con las variables: `DB_USER`, `DB_HOST`, `DB_DATABASE`, `DB_PASSWORD`, `DB_PORT`
    *   Iniciar: `node server.js`
3.  **Cliente**:
    *   Abrir `index.html` o cualquier página desde el navegador (asegurando que el servidor esté corriendo en `localhost:3000`)

## Modelo de Datos (Base de Datos PostgreSQL)

### Esquema Relacional

El sistema utiliza una base de datos PostgreSQL con las siguientes tablas principales:

#### Tablas de Usuarios
*   **Admin**: Personal médico y administrativo
    *   `admin_id` (PK) - Identificador único
    *   `usuario`, `contraseña` - Credenciales de acceso
    *   `tipo` - ENUM ('doctor', 'asistente')
    *   `nombre`, `ap_paterno`, `ap_materno` - Datos personales
    *   `cedula_profesional`, `instituto_egreso`, `especialidad` - Datos profesionales

*   **Usuario**: Información demográfica de pacientes
    *   `usuario_id` (PK) - Identificador único
    *   `usuario`, `contraseña` - Credenciales de acceso
    *   `nombre`, `ap_paterno`, `ap_materno` - Datos personales
    *   `correo`, `telefono`, `direccion` - Datos de contacto
    *   `fecha_nacimiento`, `sexo` - Datos demográficos
    *   `alergias`, `enfermedades_cronicas`, `nombre_tutor` - Datos médicos

#### Tablas de Servicios y Citas
*   **Servicio**: Catálogo de tratamientos dentales
    *   `servicio_id` (PK) - Identificador único
    *   `nombre`, `descripcion` - Información del servicio
    *   `precio` - Costo del tratamiento
    *   `dias_disponible`, `horas_disponible` - Arrays de disponibilidad

*   **Cita**: Registro central de eventos médicos
    *   `cita_id` (PK) - Identificador único
    *   `usuario_id` (FK → Usuario) - Paciente
    *   `admin_id` (FK → Admin) - Doctor asignado
    *   `fecha`, `hora` - Programación
    *   `comentario` - Notas adicionales
    *   `estatus` - ENUM ('agendada', 'atendida', 'cancelada')

*   **Detalle_Cita**: Relación N:M entre Citas y Servicios
    *   `detallec_id` (PK) - Identificador único
    *   `cita_id` (FK → Cita) - Cita asociada
    *   `servicio_id` (FK → Servicio) - Servicio realizado
    *   `total` - Costo del servicio en esta cita

#### Tablas de Historial Médico y Financiero
*   **Expediente**: Historial clínico del paciente
    *   `expediente_id` (PK) - Identificador único
    *   `usuario_id` (FK → Usuario, UNIQUE) - Un expediente por paciente
    *   `admin_id` (FK → Admin) - Doctor responsable
    *   `fecha_creacion` - Fecha de apertura
    *   `diagnostico`, `tratamiento` - Historial médico acumulativo

*   **Receta**: Prescripciones médicas
    *   `receta_id` (PK) - Identificador único
    *   `cita_id` (FK → Cita) - Cita que generó la receta
    *   `fecha` - Fecha de emisión
    *   `medicamentos` - Lista de medicamentos prescritos
    *   `indicaciones` - Instrucciones de uso

*   **Pago**: Registro financiero
    *   `pago_id` (PK) - Identificador único
    *   `cita_id` (FK → Cita) - Cita pagada
    *   `monto` - Cantidad pagada
    *   `fecha_pago` - Fecha de transacción
    *   `metodo_pago` - Forma de pago (efectivo, tarjeta, etc.)

#### Tabla de Gestión
*   **Periodo_Vacacional**: Bloqueo de fechas para vacaciones
    *   `vacacion_id` (PK) - Identificador único
    *   `admin_id` (FK → Admin) - Doctor en vacaciones
    *   `fecha_inicio`, `fecha_fin` - Rango de fechas bloqueadas
    *   `descripcion` - Motivo del periodo vacacional

### Relaciones Clave
*   **Usuario → Cita** (1:N): Un paciente puede tener múltiples citas
*   **Admin → Cita** (1:N): Un doctor puede atender múltiples citas
*   **Cita → Detalle_Cita** (1:N): Una cita puede incluir múltiples servicios
*   **Servicio → Detalle_Cita** (1:N): Un servicio puede aplicarse en múltiples citas
*   **Usuario → Expediente** (1:1): Un paciente tiene un único expediente
*   **Cita → Receta** (1:N): Una cita puede generar múltiples recetas
*   **Cita → Pago** (1:1): Cada cita tiene un registro de pago asociado

### Triggers y Funciones
*   **`trg_fn_validar_vacaciones`**: Trigger que previene la creación de citas en fechas bloqueadas por periodos vacacionales
*   **`fn_crear_expediente_automatico`**: Función que genera automáticamente un expediente vacío al registrar un nuevo usuario
*   **`fn_actualizar_expediente`**: Procedimiento que actualiza el historial médico del expediente al atender una cita

### Vistas
*   **`Vista_Reporte_Ganancias`**: Vista SQL que consolida información de pagos, citas y servicios para generar reportes financieros por periodo
