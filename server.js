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
    const { nombre, ap_paterno, ap_materno, edad, telefono, correo, usuario, contrasena } = req.body;

    if (!nombre || !correo || !usuario || !contrasena) 
        return res.status(400).json({ success: false, message: 'Datos incompletos' });

    try {
        const check = await pool.query(
            `SELECT usuario_id FROM Usuario WHERE usuario = $1 OR correo = $2`,
            [usuario, correo]
        );

        if (check.rowCount > 0)
            return res.status(400).json({ success: false, message: 'Usuario ya existe' });

        const insert = `INSERT INTO Usuario 
            (nombre, ap_paterno, ap_materno, edad, telefono, correo, usuario, contraseña)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

        await pool.query(insert, [
            nombre, ap_paterno, ap_materno, edad, telefono, correo, usuario, contrasena
        ]);

        res.status(201).json({ success: true, message: 'Registro exitoso' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al registrar' });
    }
});

// --- CITAS ---

// 1. OBTENER TODAS LAS CITAS
app.get('/api/citas', async (req, res) => {
    try {
        const query = `
            SELECT c.cita_id AS id, 
                   TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha, 
                   TO_CHAR(c.hora, 'HH24:MI') AS hora,
                   c.estatus AS estado, 
                   c.comentario,
                   u.nombre || ' ' || u.ap_paterno || ' ' || COALESCE(u.ap_materno, '') AS paciente, 
                   s.nombre AS servicio
            FROM Cita c
            JOIN Usuario u ON c.usuario_id = u.usuario_id
            LEFT JOIN Detalle_cita dc ON c.cita_id = dc.cita_id
            LEFT JOIN Servicio s ON dc.servicio_id = s.servicio_id
        `;

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
        console.error(error);

        if (error.message === "Horario ocupado") {
            return res.status(400).json({ success: false, message: 'Horario ocupado.' });
        }

        const msg = error.message.includes('Falta hora')
            ? error.message
            : 'Error al crear cita';

        res.status(500).json({ success: false, message: msg });
    }
});

// --- AUXILIARES ---

// Buscar Paciente (CORREGIDO Y OPTIMIZADO)
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
        const result = await pool.query(
            'SELECT servicio_id, nombre, precio FROM Servicio'
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
                     '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00'];

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

// Servir archivos estáticos
app.use(express.static(__dirname));

// Encender Servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
