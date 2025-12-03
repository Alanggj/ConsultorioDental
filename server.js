// 1. Cargar las herramientas
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

// 2. Configurar la conexión a la Base de Datos
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// 3. Crear el servidor
const app = express();
const PORT = 3000;

// 4. Middlewares
app.use(cors());
app.use(express.json());

// --- RUTAS (ENDPOINTS) ---

// Prueba de conexión
app.get('/api/prueba_conexion', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ message: '¡Conexión exitosa!', hora_bd: result.rows[0].now });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena)
        return res.status(400).json({ success: false, message: 'Faltan datos' });

    try {
        // Buscar Admin
        const adminQuery = `SELECT admin_id AS id, nombre, ap_paterno, tipo 
                            FROM Admin 
                            WHERE usuario = $1 AND contraseña = $2`;
        const adminRes = await pool.query(adminQuery, [usuario, contrasena]);

        if (adminRes.rowCount > 0) {
            const admin = adminRes.rows[0];
            return res.json({
                success: true,
                user: {
                    id: admin.id,
                    nombre: `${admin.nombre} ${admin.ap_paterno}`,
                    tipo: 'admin',
                    rol: admin.tipo
                }
            });
        }

        // Buscar Usuario
        const userQuery = `SELECT usuario_id AS id, nombre, ap_paterno, correo 
                           FROM Usuario 
                           WHERE usuario = $1 AND contraseña = $2`;
        const userRes = await pool.query(userQuery, [usuario, contrasena]);

        if (userRes.rowCount > 0) {
            const u = userRes.rows[0];
            return res.json({
                success: true,
                user: {
                    id: u.id,
                    nombre: `${u.nombre} ${u.ap_paterno}`,
                    email: u.correo,
                    tipo: 'usuario'
                }
            });
        }

        return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error de servidor' });
    }
});

// REGISTRO
app.post('/api/registro', async (req, res) => {
    // 1. Recibimos también 'nombre_tutor'
    const { nombre, ap_paterno, ap_materno, fecha_nacimiento, sexo, nombre_tutor, telefono, correo, usuario, contrasena } = req.body;

    // 2. Validar campos vacíos básicos
   if (!nombre || !correo || !usuario || !contrasena || !fecha_nacimiento || !sexo)
        return res.status(400).json({ success: false, message: 'Datos incompletos' });
    // Validar valor correcto de sexo
    if (sexo !== 'M' && sexo !== 'F') {
        return res.status(400).json({ success: false, message: 'Sexo inválido.' });
    }

    // 3. VALIDACIÓN DE CONTRASEÑA (Tu lógica original)
    const tieneMayuscula = /[A-Z]/.test(contrasena);
    const tieneMinuscula = /[a-z]/.test(contrasena);
    const tieneNumero = /[0-9]/.test(contrasena);
    const tieneSimbolo = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(contrasena);
    const longitudValida = contrasena.length >= 8;

    if (!longitudValida || !tieneMayuscula || !tieneMinuscula || !tieneNumero || !tieneSimbolo) {
        return res.status(400).json({
            success: false,
            message: 'La contraseña es débil. Debe tener 8+ caracteres, mayúscula, minúscula, número y símbolo.'
        });
    }

    // 4. LÓGICA DE FECHA Y EDAD
    const fechaNacDate = new Date(fecha_nacimiento);
    const hoy = new Date();

    // A. Validar fecha futura
    if (fechaNacDate > hoy) {
        return res.status(400).json({ success: false, message: 'Fecha de nacimiento inválida (futura)' });
    }

    // B. Calcular edad exacta
    let edadCalculada = hoy.getFullYear() - fechaNacDate.getFullYear();
    const m = hoy.getMonth() - fechaNacDate.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fechaNacDate.getDate())) {
        edadCalculada--;
    }

    // C. Validar tope de edad
    if (edadCalculada > 100) {
        return res.status(400).json({ success: false, message: 'La edad no puede ser mayor a 100 años.' });
    }

    // Validación de edad mínima (1 año) 
    if (edadCalculada < 1) {
        return res.status(400).json({ success: false, message: 'Lo sentimos, la edad mínima para atención es de 1 año.' });
    }

    // D. VALIDACIÓN DE TUTOR (NUEVO)
    // Si es menor de 18 y NO envió tutor
    if (edadCalculada < 18 && !nombre_tutor) {
        return res.status(400).json({ success: false, message: 'Para menores de edad, el nombre del tutor es obligatorio.' });
    }

    // E. Limpieza de datos
    // Si es mayor de 18, forzamos a que el tutor sea null (aunque envíen algo)
    const tutorFinal = edadCalculada >= 18 ? null : nombre_tutor;

    try {
        const check = await pool.query(
            `SELECT usuario_id FROM Usuario WHERE usuario = $1 OR correo = $2`,
            [usuario, correo]
        );

        if (check.rowCount > 0)
            return res.status(400).json({ success: false, message: 'El usuario o correo ya existen' });

        // 5. INSERT ACTUALIZADO (Con nombre_tutor)
        const insert = `INSERT INTO Usuario 
            (nombre, ap_paterno, ap_materno, fecha_nacimiento, sexo, nombre_tutor, telefono, correo, usuario, contraseña)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;

        await pool.query(insert, [
            nombre, ap_paterno, ap_materno, fecha_nacimiento, sexo, tutorFinal, telefono, correo, usuario, contrasena
        ]);

        res.status(201).json({ success: true, message: 'Registro exitoso' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// --- CITAS ---

// 1. OBTENER TODAS LAS CITAS
app.get('/api/citas', async (req, res) => {
    try {
        const query = `SELECT * FROM Vista_Agenda_Maestra ORDER BY fecha ASC, hora ASC`;
        
        const result = await pool.query(query);
        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener citas' });
    }
});

// 2. ACTUALIZAR ESTADO (atendida / cancelada)
app.put('/api/citas/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    try {
        await pool.query(
            'UPDATE Cita SET estatus = $1 WHERE cita_id = $2',
            [estado, id]
        );

        res.json({ success: true, message: 'Estado actualizado' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// 3. CREAR CITA (CON VALIDACIÓN DE HORARIO LIBRE SI NO ESTÁ CANCELADA)
app.post('/api/citas', async (req, res) => {
    const { usuario_id, admin_id, fecha, citas, comentario } = req.body;

    if (!usuario_id || !fecha || !citas || citas.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Faltan datos obligatorios.'
        });
    }

    try {
        await pool.query('BEGIN');

        for (const item of citas) {

            if (!item.hora || item.hora === '') {
                throw new Error(`Falta hora para el servicio ${item.servicio_id}`);
            }

            // ⭐⭐⭐ VALIDACIÓN IMPORTANTE ⭐⭐⭐
            // Si existe una cita en esa fecha+hora que NO esté cancelada → horario ocupado
            const conflict = await pool.query(
                `SELECT cita_id 
                 FROM Cita 
                 WHERE fecha = $1 AND hora = $2 AND estatus != 'cancelada'`,
                [fecha, item.hora]
            );

            if (conflict.rowCount > 0) {
                throw new Error("Horario ocupado");
            }

            // INSERT cita
            const citaRes = await pool.query(
                `INSERT INTO Cita (usuario_id, admin_id, fecha, hora, comentario, estatus) 
                 VALUES ($1, $2, $3, $4, $5, 'agendada') 
                 RETURNING cita_id`,
                [usuario_id, admin_id, fecha, item.hora, comentario || '']
            );

            // INSERT detalle
            await pool.query(
                `INSERT INTO Detalle_cita (cita_id, servicio_id, total)
                 VALUES ($1, $2, (SELECT precio FROM Servicio WHERE servicio_id = $2))`,
                [citaRes.rows[0].cita_id, item.servicio_id]
            );
        }

        await pool.query('COMMIT');
        res.status(201).json({ success: true });

   } catch (error) {
        await pool.query('ROLLBACK');
        console.error(error); // Verás el error en la consola del servidor

        // 1. Error de horario ocupado (lógica de JS)
        if (error.message === "Horario ocupado") {
            return res.status(400).json({ success: false, message: 'Horario ocupado.' });
        }

        // 2. Error del Trigger de Vacaciones (lógica de BD)
        // PostgreSQL devuelve el mensaje del RAISE EXCEPTION dentro de error.message
        if (error.message.includes('VACACIONES_CONFLICTO')) {
            return res.status(400).json({ 
                success: false, 
                message: 'No se puede agendar: El doctor está de vacaciones en la fecha seleccionada.' 
            });
        }

        // 3. Otros errores
        const msg = error.message.includes('Falta hora')
            ? error.message
            : 'Error interno al crear la cita.';

        res.status(500).json({ success: false, message: msg });
    }
});

// --- AUXILIARES ---

// Buscar Paciente 
app.get('/api/buscar-paciente', async (req, res) => {
    const { query } = req.query;

    if (!query) return res.json([]);

    try {
        // 1. Truco de Búsqueda: Reemplazamos espacios por comodines '%'
        // Si el usuario escribe "Juan Perez", buscamos "%Juan%Perez%"
        // Esto ayuda a encontrar coincidencias aunque haya dobles espacios o falte un segundo nombre.
        const searchTerms = query.trim().split(/\s+/).join('%');
        const searchPattern = `%${searchTerms}%`;

        const sql = `
            SELECT usuario_id, nombre, ap_paterno, ap_materno, correo, telefono 
            FROM Usuario 
            WHERE 
                -- Búsqueda individual (útil si buscan solo por apellido)
                nombre ILIKE $1 
                OR ap_paterno ILIKE $1 
                OR ap_materno ILIKE $1 
                
                -- Búsqueda por Nombre Completo ROBUSTA
                -- NULLIF convierte cadenas vacías '' en NULL para que CONCAT_WS las ignore correctamente
                OR CONCAT_WS(' ', 
                    TRIM(nombre), 
                    TRIM(ap_paterno), 
                    NULLIF(TRIM(ap_materno), '') 
                ) ILIKE $1
            LIMIT 5`;

        const result = await pool.query(sql, [searchPattern]);
        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error buscando paciente' });
    }
});


// Obtener Servicios 
app.get('/api/servicios', async (req, res) => {
    try {
        // Ahora seleccionamos TODO (*) para tener descripción y horarios
        const result = await pool.query(
            'SELECT * FROM Servicio ORDER BY servicio_id ASC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo servicios' });
    }
});

// Calcular Horarios Disponibles
app.get('/api/horarios-disponibles', async (req, res) => {
    const { fecha } = req.query;

    if (!fecha)
        return res.status(400).json({ error: 'Fecha requerida' });

    try {
        const fechaObj = new Date(fecha + 'T00:00:00');
        const diaSemana = fechaObj.getDay();
        let slots = [];

        if (diaSemana === 0) return res.json([]); // Domingo cerrado
        else if (diaSemana === 6)
            slots = ['10:00:00', '11:00:00', '12:00:00', '13:00:00', '14:00:00'];
        else
            slots = ['09:00:00', '10:00:00', '11:00:00', '12:00:00', '13:00:00',
                '14:00:00', '15:00:00', '16:00:00', '17:00:00'];

        const occupied = await pool.query(
            `SELECT hora 
             FROM Cita 
             WHERE fecha = $1 
               AND estatus != 'cancelada'`,
            [fecha]
        );

        const busyHours = occupied.rows.map(r => r.hora);

        res.json(slots.filter(s => !busyHours.includes(s)));

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error calculando horarios' });
    }
});

// --- RUTAS DE VACACIONES ---

// 1. CREAR VACACIONES (POST)
app.post('/api/vacaciones', async (req, res) => {
    const { fecha_inicio, fecha_fin, descripcion } = req.body;
    const admin_id = 1; 

    try {
        // Validar traslape
        const conflicto = await pool.query(
            `SELECT vacacion_id FROM Periodo_vacacional 
             WHERE fecha_inicio <= $2 AND fecha_fin >= $1`,
            [fecha_inicio, fecha_fin]
        );

        if (conflicto.rowCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un periodo vacacional en esas fechas.'
            });
        }

        // Insertar
        const insert = `INSERT INTO Periodo_vacacional (admin_id, fecha_inicio, fecha_fin, descripcion) 
                        VALUES ($1, $2, $3, $4) RETURNING *`;

        const result = await pool.query(insert, [admin_id, fecha_inicio, fecha_fin, descripcion]);

        res.status(201).json({ success: true, data: result.rows[0] });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
}); 

// 2. OBTENER LISTA DE VACACIONES (GET) 
app.get('/api/vacaciones', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Periodo_vacacional ORDER BY fecha_inicio ASC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener vacaciones' });
    }
});

// 3. ELIMINAR VACACIONES (DELETE) 
app.delete('/api/vacaciones/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM Periodo_vacacional WHERE vacacion_id = $1', [id]);
        res.json({ success: true, message: 'Periodo eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

//GANANCIAS
app.get('/api/ganancias', async (req, res) => {
    try {
        const { filtro } = req.query;
        let query = `SELECT *, SUM(monto) OVER() as total_periodo FROM Vista_Reporte_Ganancias`;
        let params = [];

        // Filtramos sobre la VISTA, no sobre las tablas originales
        if (filtro === 'today') {
            query += " WHERE fecha = CURRENT_DATE";
        } else if (filtro === 'month') {
            query += " WHERE mes = EXTRACT(MONTH FROM CURRENT_DATE) AND anio = EXTRACT(YEAR FROM CURRENT_DATE)";
        } else if (filtro === 'year') {
            query += " WHERE anio = EXTRACT(YEAR FROM CURRENT_DATE)";
        }
        
        query += " ORDER BY fecha DESC";
        
        const result = await pool.query(query, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener historial de ganancias' });
    }
});

//OBTENER DATOS COMPLETOS DE UN USUARIO ESPECÍFICO
app.get('/api/usuario/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const sql = `
            SELECT 
                nombre, ap_paterno, ap_materno, correo, telefono, 
                usuario, direccion, alergias, enfermedades_cronicas, 
                nombre_tutor, TO_CHAR(fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento
            FROM Usuario 
            WHERE usuario_id = $1`;
        
        const result = await pool.query(sql, [id]);
        
        if (result.rowCount > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error al obtener usuario' });
    }
});

//ACTUALIZAR DATOS DEL USUARIO
app.put('/api/usuario/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        telefono, direccion, alergias, 
        enfermedades_cronicas, nombre_tutor, 
        contrasena //opcional
    } = req.body;

    try {
        let sql, params;

        if (contrasena && contrasena.trim() !== "") {
            sql = `UPDATE Usuario SET 
                    telefono = $1, direccion = $2, alergias = $3, 
                    enfermedades_cronicas = $4, nombre_tutor = $5, contraseña = $6
                   WHERE usuario_id = $7`;
            params = [telefono, direccion, alergias, enfermedades_cronicas, nombre_tutor, contrasena, id];
        } else {
            sql = `UPDATE Usuario SET 
                    telefono = $1, direccion = $2, alergias = $3, 
                    enfermedades_cronicas = $4, nombre_tutor = $5
                   WHERE usuario_id = $6`;
            params = [telefono, direccion, alergias, enfermedades_cronicas, nombre_tutor, id];
        }

        await pool.query(sql, params);
        res.json({ success: true, message: 'Datos actualizados correctamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar datos' });
    }
});

// OBTENER LISTA DE EXPEDIENTES (Actualizado con Edad y Sexo)
app.get('/api/expedientes', async (req, res) => {
    try {
        const query = `
            SELECT 
                e.expediente_id,
                u.usuario_id,
                TRIM(CONCAT(u.nombre, ' ', u.ap_paterno, ' ', COALESCE(u.ap_materno, ''))) AS nombre_paciente,
                TO_CHAR(MAX(c.fecha), 'YYYY-MM-DD') AS ultima_visita,
                CASE WHEN MAX(c.fecha) IS NULL THEN 'Sin historial' ELSE TO_CHAR(MAX(c.fecha), 'YYYY-MM-DD') END AS fecha_mostrar,
                -- NUEVOS CAMPOS:
                EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.fecha_nacimiento))::int AS edad,
                u.sexo
            FROM Expediente e
            JOIN Usuario u ON e.usuario_id = u.usuario_id
            LEFT JOIN Cita c ON u.usuario_id = c.usuario_id AND c.estatus = 'atendida'
            GROUP BY e.expediente_id, u.usuario_id, u.nombre, u.ap_paterno, u.ap_materno, u.fecha_nacimiento, u.sexo
            ORDER BY u.ap_paterno ASC;
        `;

        const result = await pool.query(query);
        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cargar expedientes' });
    }
});

// --- RUTAS DE RECETAS ---

// OBTENER TODAS LAS RECETAS (CORREGIDO)
app.get('/api/recetas', async (req, res) => {
    try {
        // Ahora consultamos directamente la vista simplificada
        const query = `
            SELECT * FROM Vista_Recetas_Completas 
            ORDER BY fecha DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener recetas' });
    }
});

//obtener receta por id
app.get('/api/recetas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                r.receta_id,
                r.cita_id,
                TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
                r.diagnostico,
                r.tratamiento,
                -- Datos del Paciente
                u.nombre || ' ' || u.ap_paterno || ' ' || COALESCE(u.ap_materno, '') AS paciente_nombre,
                calcular_edad(u.fecha_nacimiento) AS paciente_edad,
                u.alergias AS paciente_alergias,
                -- Datos del Doctor
                doc.nombre || ' ' || doc.ap_paterno AS doctor_nombre,
                doc.cedula_profesional
            FROM Receta r
            JOIN Cita c ON r.cita_id = c.cita_id
            JOIN Usuario u ON c.usuario_id = u.usuario_id
            JOIN Admin doc ON c.admin_id = doc.admin_id
            WHERE r.receta_id = $1
        `;
        
        const result = await pool.query(query, [id]);

        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Receta no encontrada' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error al obtener la receta' });
    }
});

//obtener los datos precargados de la receta
app.get('/api/cita/:id/datos-receta', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                -- Concatenamos nombre completo del paciente
                u.nombre || ' ' || u.ap_paterno || ' ' || COALESCE(u.ap_materno, '') AS paciente_nombre,
                -- Usamos la función que creamos
                calcular_edad(u.fecha_nacimiento) AS paciente_edad,
                u.alergias AS paciente_alergias,
                -- Concatenamos nombre del doctor
                doc.nombre || ' ' || doc.ap_paterno || ' ' || COALESCE(doc.ap_materno, '') AS doctor_nombre,
                doc.cedula_profesional,
                -- Fecha actual formateada
                TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') as fecha_actual
            FROM Cita c
            JOIN Usuario u ON c.usuario_id = u.usuario_id
            JOIN Admin doc ON c.admin_id = doc.admin_id
            WHERE c.cita_id = $1
        `;
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener datos de la receta' });
    }
});

//guardar receta
app.post('/api/crear-receta', async (req, res) => {
    const { cita_id, diagnostico, tratamiento } = req.body;
    try {
        //fecha actual
        const query = `
            INSERT INTO Receta (fecha, diagnostico, tratamiento, cita_id)
            VALUES (CURRENT_DATE, $1, $2, $3)
            RETURNING *;
        `;
        await pool.query(query, [diagnostico, tratamiento, cita_id]);
        
        res.json({ mensaje: 'Receta creada exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar la receta' });
    }
});

//eliminar receta
app.delete('/api/recetas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM Receta WHERE receta_id = $1', [id]);
        
        if (result.rowCount > 0) {
            res.json({ success: true, message: 'Receta eliminada correctamente' });
        } else {
            res.status(404).json({ success: false, message: 'Receta no encontrada' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar la receta' });
    }
});

//editar receta
app.put('/api/recetas/:id', async (req, res) => {
    const { id } = req.params;
    const { diagnostico, tratamiento } = req.body;

    try {
        const query = `
            UPDATE Receta 
            SET diagnostico = $1, tratamiento = $2
            WHERE receta_id = $3
        `;
        
        await pool.query(query, [diagnostico, tratamiento, id]);
        res.json({ success: true, message: 'Receta actualizada correctamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar la receta' });
    }
});

//1.obtener detalle
app.get('/api/expediente/:id', async (req, res) => {
    const { id } = req.params; 
    try {
        const query = `
            SELECT 
                u.usuario_id, 
                u.nombre || ' ' || u.ap_paterno || ' ' || COALESCE(u.ap_materno, '') AS nombre_completo,
                EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.fecha_nacimiento))::int AS edad,
                TO_CHAR(u.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nac,
                e.diagnostico, 
                e.tratamiento,
                -- Obtenemos la última cita atendida como referencia
                (SELECT TO_CHAR(MAX(fecha), 'YYYY-MM-DD') FROM Cita WHERE usuario_id = u.usuario_id AND estatus = 'atendida') as ultima_visita,
            
                doc.nombre || ' ' || doc.ap_paterno AS doctor_nombre,
                doc.cedula_profesional
            
            FROM Usuario u
            LEFT JOIN Expediente e ON u.usuario_id = e.usuario_id
            LEFT JOIN Admin doc ON e.admin_id = doc.admin_id
            WHERE u.usuario_id = $1
        `;
        const result = await pool.query(query, [id]);
        
        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Paciente no encontrado' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error de servidor' });
    }
});

//2.guardar o actualizar
app.post('/api/expediente', async (req, res) => {
    const { usuario_id, diagnostico, tratamiento } = req.body;  
    try {
        await pool.query('CALL sp_guardar_expediente($1, $2, $3)', 
                         [usuario_id, diagnostico, tratamiento]);

        res.json({ success: true, message: 'Expediente guardado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al guardar' });
    }
});

//3.eliminar expediente
app.delete('/api/expediente/:usuario_id', async (req, res) => {
    const { usuario_id } = req.params;
    try {
        //borrar el registro de la tabla Expediente, no al usuario ni sus citas
        await pool.query('DELETE FROM Expediente WHERE usuario_id = $1', [usuario_id]);
        res.json({ success: true, message: 'Expediente eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar' });
    }
});

// Servir archivos estáticos
app.use(express.static(__dirname));

// Encender Servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});