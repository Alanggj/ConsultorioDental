-- 1. CREACIÓN DE ENUMS (Tipos de datos personalizados)

-- Enum para el tipo de admin (solicitado)
CREATE TYPE admin_tipo AS ENUM ('doctor', 'asistente');

-- Enum para el estado de la cita (solicitado al final)
CREATE TYPE cita_estatus AS ENUM ('agendada', 'atendida', 'cancelada');


-- 2. TABLAS PRINCIPALES

-- Tabla Admin
CREATE TABLE Admin (
    admin_id SERIAL PRIMARY KEY,
    usuario VARCHAR(10) UNIQUE NOT NULL,
    contraseña VARCHAR(8) NOT NULL, 
    tipo admin_tipo NOT NULL,            
    nombre VARCHAR(30) NOT NULL,
    ap_paterno VARCHAR(20) NOT NULL,
    ap_materno VARCHAR(20),
    cedula_profesional VARCHAR(20) UNIQUE, 
    instituto_egreso VARCHAR(25),
    especialidad VARCHAR(20)
);

-- Tabla Usuario (Pacientes)
CREATE TABLE Usuario (
    usuario_id SERIAL PRIMARY KEY,
    usuario VARCHAR(10) UNIQUE NOT NULL, 
    contraseña VARCHAR(8) NOT NULL, 
    nombre VARCHAR(30) NOT NULL,
    ap_paterno VARCHAR(20) NOT NULL,
    ap_materno VARCHAR(20),
    correo VARCHAR(30) UNIQUE NOT NULL,
    telefono VARCHAR(10),
    direccion VARCHAR(50),
    fecha_nacimiento DATE,
    alergias VARCHAR(30),
    enfermedades_cronicas VARCHAR(30),
	nombre_tutor VARCHAR(80),
	sexo CHAR(1) --F(Femenino), M(Masculino)
);

-- Tabla Servicio
CREATE TABLE Servicio (
    servicio_id SERIAL PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL,
    descripcion VARCHAR(255),
    precio DECIMAL(10, 2) NOT NULL, 
    dias_disponible TEXT[], -- PostgreSQL soporta arrays nativos          
    horas_disponible TEXT[]           
);


-- 3. TABLAS TRANSACCIONALES

-- Tabla Cita
CREATE TABLE Cita (
    cita_id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES Usuario(usuario_id),
    admin_id INT NOT NULL REFERENCES Admin(admin_id), 
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    comentario VARCHAR(30),
    estatus cita_estatus NOT NULL DEFAULT 'agendada' 
);

-- Tabla Detalle_cita
-- Aquí es donde se conecta el Servicio con la Cita (según tu diagrama)
CREATE TABLE Detalle_cita(
    detallec_id SERIAL PRIMARY KEY,
    cita_id INTEGER NOT NULL REFERENCES Cita(cita_id),
    servicio_id INTEGER NOT NULL REFERENCES Servicio(servicio_id),
    total FLOAT
);

-- Tabla Expediente
CREATE TABLE Expediente (
    expediente_id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES Usuario(usuario_id),
    admin_id INT NOT NULL REFERENCES Admin(admin_id),
    fecha_creacion DATE NOT NULL,
	diagnostico TEXT DEFAULT '',
	tratamiento TEXT DEFAULT '',
	UNIQUE(usuario_id)
);

-- Tabla Periodo_vacacional
CREATE TABLE Periodo_vacacional(
    vacacion_id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES Admin(admin_id), 
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    descripcion VARCHAR(255)
);

-- Tabla Receta
CREATE TABLE Receta(
    receta_id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
	diagnostico VARCHAR(255),
    tratamiento VARCHAR(255),
	cita_id INTEGER NOT NULL REFERENCES Cita(cita_id)
);

CREATE TABLE Pago(
	id_pago SERIAL PRIMARY KEY,
	cita_id INTEGER NOT NULL REFERENCES Cita(cita_id),
	monto FLOAT
);

--INDICES
-- Creamos un índice único que IGNORA las citas canceladas
CREATE UNIQUE INDEX idx_cita_unica_activa 
ON Cita (admin_id, fecha, hora) 
WHERE estatus != 'cancelada';

--********************TRIGGERS*****************
-- Función de validación 
CREATE OR REPLACE FUNCTION trg_fn_validar_vacaciones()
RETURNS TRIGGER AS $$
DECLARE
    esta_de_vacaciones BOOLEAN;
BEGIN
    -- Verificamos si existe un periodo vacacional para ese admin en esa fecha
    SELECT EXISTS (
        SELECT 1 FROM Periodo_vacacional
        WHERE admin_id = NEW.admin_id
        AND NEW.fecha BETWEEN fecha_inicio AND fecha_fin
    ) INTO esta_de_vacaciones;

    IF esta_de_vacaciones THEN
        -- Este mensaje es el que capturará el Backend
        RAISE EXCEPTION 'VACACIONES_CONFLICTO'; 
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger (Agregamos UPDATE para mayor seguridad)
CREATE OR REPLACE TRIGGER trg_bloqueo_vacaciones
BEFORE INSERT OR UPDATE OF fecha ON Cita
FOR EACH ROW
EXECUTE FUNCTION trg_fn_validar_vacaciones();


--trigger expediente vacio para usuario nuevo
CREATE OR REPLACE FUNCTION fn_crear_expediente_automatico()
RETURNS TRIGGER AS $$
BEGIN
    --insertar expediente vacio
    INSERT INTO Expediente (usuario_id, admin_id, fecha_creacion, diagnostico, tratamiento)
    VALUES (NEW.usuario_id, 1, CURRENT_DATE, '', '');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nuevo_usuario_expediente
AFTER INSERT ON Usuario
FOR EACH ROW
EXECUTE FUNCTION fn_crear_expediente_automatico();

--CONCATENAR LO DE RECETAS EN EXPEDIENTE
CREATE OR REPLACE FUNCTION fn_actualizar_historial_expediente()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id INT;
BEGIN
    SELECT usuario_id INTO v_usuario_id
    FROM Cita
    WHERE cita_id = NEW.cita_id;

    --actualizar expediente
    UPDATE Expediente
    SET 
        diagnostico = COALESCE(diagnostico, '') || E'\n\n' || 
                      '[' || NEW.fecha || '] DIAGNÓSTICO: ' || NEW.diagnostico,
        
        tratamiento = COALESCE(tratamiento, '') || E'\n\n' || 
                      '[' || NEW.fecha || '] TRATAMIENTO: ' || NEW.tratamiento
    WHERE usuario_id = v_usuario_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historial_receta
AFTER INSERT ON Receta
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_historial_expediente();

--**************FUNCIONES********************
--funcion para calcular edad
CREATE OR REPLACE FUNCTION calcular_edad(fecha_nacimiento DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM age(CURRENT_DATE, fecha_nacimiento));
END;
$$ LANGUAGE plpgsql;

SELECT calcular_edad('1999-05-15');


--****************PROCEDURE*********************
--procedure para guardar o actualizar expediente
CREATE OR REPLACE PROCEDURE sp_guardar_expediente(
    p_usuario_id INT,
    p_diagnostico TEXT,
    p_tratamiento TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    --intentar actualizar
    UPDATE Expediente 
    SET diagnostico = p_diagnostico, 
        tratamiento = p_tratamiento,
        fecha_creacion = CURRENT_DATE 
    WHERE usuario_id = p_usuario_id;

    --si no se actualizo, insertar
    IF NOT FOUND THEN
        INSERT INTO Expediente (usuario_id, admin_id, fecha_creacion, diagnostico, tratamiento)
        VALUES (p_usuario_id, 1, CURRENT_DATE, p_diagnostico, p_tratamiento);
    END IF;
END;
$$;

--procedure reporte detallado
CREATE OR REPLACE PROCEDURE sp_generar_reporte_mensual()
LANGUAGE plpgsql
AS $$
DECLARE
    --variables para datos del cursor
    v_servicio VARCHAR(40);
    v_mes INTEGER;
    v_total_ingresos DECIMAL(10,2);
    v_promedio_venta DECIMAL(10,2);
    
    cur_finanzas CURSOR FOR
        SELECT 
            s.nombre,
            EXTRACT(MONTH FROM c.fecha)::INTEGER,
            SUM(dc.total),
            AVG(dc.total)
        FROM Cita c
        JOIN Detalle_cita dc ON c.cita_id = dc.cita_id
        JOIN Servicio s ON dc.servicio_id = s.servicio_id
        WHERE c.estatus = 'atendida' --solo citas pagadas
        --agrupar por servicio y mes
        GROUP BY ROLLUP(s.nombre, EXTRACT(MONTH FROM c.fecha))
        --mostrar grupos donde se haya ganado dinero
        HAVING SUM(dc.total) > 0
        ORDER BY s.nombre NULLS LAST, 2 NULLS LAST;

BEGIN
    OPEN cur_finanzas;
    
    RAISE NOTICE 'REPORTE DE INGRESOS MENSUALES Y PROMEDIOS';

    LOOP
        --cursor a variables
        FETCH cur_finanzas INTO v_servicio, v_mes, v_total_ingresos, v_promedio_venta;
        
        --si no hay mas filas terminar
        EXIT WHEN NOT FOUND;

        --ROLLUP (Subtotales y Totales)
        IF v_servicio IS NULL THEN
            --gran total (generada por ROLLUP cuando ambos son null)
            RAISE NOTICE '>>> INGRESOS TOTALES CONSULTORIO: $% <<<', v_total_ingresos;
            
        ELSIF v_mes IS NULL THEN
            --subtotal por servicio (generada por ROLLUP cuando mes es null)
            RAISE NOTICE '   > TOTAL HISTÓRICO %: $% (Promedio por cita: $%)', 
                         UPPER(v_servicio), v_total_ingresos, TRUNC(v_promedio_venta, 2);
            RAISE NOTICE '';
            
        ELSE
            --fila servicio + mes
            RAISE NOTICE '      - Servicio: % | Mes: % | Venta: $%', 
                         v_servicio, v_mes, v_total_ingresos;
        END IF;

    END LOOP;

    --cerrar cursos
    CLOSE cur_finanzas;
    
    RAISE NOTICE 'Fin del reporte.';
END;
$$;

---********VISTAS*******
-- Creación de la Vista para Reporte Financiero
CREATE VIEW Vista_Reporte_Ganancias AS
SELECT 
    p.id_pago,
    c.fecha,
    -- Funciones de texto
    CONCAT(u.nombre, ' ', u.ap_paterno) AS paciente,
    s.nombre AS servicio,
    p.monto,
    -- Columnas auxiliares para facilitar filtros
    EXTRACT(MONTH FROM c.fecha) as mes,
    EXTRACT(YEAR FROM c.fecha) as anio
FROM Pago p
JOIN Cita c ON p.cita_id = c.cita_id             
JOIN Usuario u ON c.usuario_id = u.usuario_id    
JOIN Detalle_cita dc ON c.cita_id = dc.cita_id   
JOIN Servicio s ON dc.servicio_id = s.servicio_id; 

-- Creación de Vista para Recetas 
CREATE OR REPLACE VIEW Vista_Recetas_Completas AS
SELECT 
    r.receta_id,
    TO_CHAR(r.fecha, 'YYYY-MM-DD') AS fecha,
    r.tratamiento AS medicamentos,
    r.diagnostico,
    -- Concatenamos nombre del paciente (Alias u)
    CONCAT(u.nombre, ' ', u.ap_paterno, ' ', COALESCE(u.ap_materno, '')) AS nombre_paciente,
    -- Concatenamos nombre del doctor (Alias doc)
    CONCAT(doc.nombre, ' ', doc.ap_paterno) AS doctor_asignado,
    doc.especialidad AS especialidad_doctor
FROM Receta r
JOIN Cita c ON r.cita_id = c.cita_id
JOIN Usuario u ON c.usuario_id = u.usuario_id 
JOIN Admin doc ON c.admin_id = doc.admin_id; 

CREATE OR REPLACE VIEW Vista_Agenda_Maestra AS
SELECT 
    c.cita_id AS id, 
    TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha, 
    TO_CHAR(c.hora, 'HH24:MI') AS hora,
    c.estatus AS estado, 
    c.comentario,
    -- Concatenación del nombre del paciente
    TRIM(CONCAT(u.nombre, ' ', u.ap_paterno, ' ', COALESCE(u.ap_materno, ''))) AS paciente, 
    -- Nombre del servicio (Usamos LEFT JOIN en la vista también)
    s.nombre AS servicio
FROM Cita c
JOIN Usuario u ON c.usuario_id = u.usuario_id      
LEFT JOIN Detalle_cita dc ON c.cita_id = dc.cita_id 
LEFT JOIN Servicio s ON dc.servicio_id = s.servicio_id;     


select * from Periodo_vacacional;
select * from Admin;
select * from Usuario;
select * from cita;
select * from expediente;
select * from servicio;

-- ALTER USER postgres WITH PASSWORD 'gasaiyuno';
INSERT INTO Admin (usuario, contraseña, tipo, nombre, ap_paterno, cedula_profesional)
VALUES ('admin', 'Admin123!', 'doctor', 'Administrador', 'Sistema', 'CED001');

SELECT COUNT(*) FROM Admin;
