-- 1. INSERTAR ADMIN (Doctor)
INSERT INTO Admin (usuario, contraseña, tipo, nombre, ap_paterno, ap_materno, cedula_profesional, instituto_egreso, especialidad)
VALUES ('doc_juan', 'Admin12!', 'doctor', 'Juan', 'Pérez', 'López', 'CED12345', 'UNAM', 'Odontología');

-- 2. INSERTAR SERVICIOS
INSERT INTO Servicio (nombre, descripcion, precio, dias_disponible, horas_disponible)
VALUES 
('Limpieza Dental', 'Eliminación de sarro y placa bacteriana', 500.00, 
 '{Lunes,Martes,Miércoles,Jueves,Viernes,Sábado}',
 '{09:00:00,10:00:00,11:00:00,12:00:00,13:00:00,14:00:00,15:00:00,16:00:00,17:00:00,18:00:00}'),
 
('Blanqueamiento', 'Tratamiento estético para mejorar el color de tus dientes', 1200.00,
 '{Lunes,Martes,Miércoles,Jueves,Viernes,Sábado}',
 '{09:00:00,10:00:00,11:00:00,12:00:00,13:00:00,14:00:00,15:00:00,16:00:00,17:00:00,18:00:00}'),
 
('Ortodoncia', 'Corrección de la posición dental con brackets', 6000.00,
 '{Lunes,Martes,Miércoles,Jueves,Viernes,Sábado}',
 '{09:00:00,10:00:00,11:00:00,12:00:00,13:00:00,14:00:00,15:00:00,16:00:00,17:00:00,18:00:00}'),
 
('Extraccion Dental', 'Extracción segura y sin dolor', 800.00,
 '{Lunes,Martes,Miércoles,Jueves,Viernes,Sábado}',
 '{09:00:00,10:00:00,11:00:00,12:00:00,13:00:00,14:00:00,15:00:00,16:00:00,17:00:00,18:00:00}'),
 
('Resinas Estéticas', 'Reconstrucción de dientes con resina', 650.00,
 '{Lunes,Martes,Miércoles,Jueves,Viernes,Sábado}',
 '{09:00:00,10:00:00,11:00:00,12:00:00,13:00:00,14:00:00,15:00:00,16:00:00,17:00:00,18:00:00}'),
 
('Prótesis Dentales', 'Diseño y colocación de prótesis', 3500.00,
 '{Lunes,Martes,Miércoles,Jueves,Viernes,Sábado}',
 '{09:00:00,10:00:00,11:00:00,12:00:00,13:00:00,14:00:00,15:00:00,16:00:00,17:00:00,18:00:00}');