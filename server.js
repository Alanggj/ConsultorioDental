// 1. Cargar las herramientas
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors'); // (para el error de CORS)

// 2. Configurar la conexión a la Base de Datos
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// 3. Crear el servidor (la aplicación)
const app = express();
const PORT = 3000;

// 4. Middlewares (Traductores)
app.use(cors()); //(Permite peticiones desde tu HTML)
app.use(express.json()); // (Permite leer el req.body en formato JSON)

// 5. RUTAS (Endpoints)

// Ruta para probar la conexión a la BD (usa esta en tu navegador para ver si todo bien)
app.get('/api/prueba_conexion', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            message: '¡Conexión a PostgreSQL exitosa!',
            hora_de_la_bd: result.rows[0].now
        });
    } catch (error) {
        console.error('Error al conectar con la BD:', error);
        res.status(500).json({
            message: 'Error al conectar con la base de datos',
            error: error.message
        });
    }
});

// Ruta de Login (la que usa tu formulario)
app.post('/api/login', async (req, res) => {
    // Gracias a express.json(), req.body ahora sí existe
    const { usuario, contrasena } = req.body; 

    if (!usuario || !contrasena) {
        return res.status(400).json({ success: false, message: 'Usuario y contraseña son requeridos' });
    }

    try {
        const adminQuery = `
            SELECT id, nombre, ap_paterno, tipo 
            FROM Admin 
            WHERE usuario = $1 AND contraseña = $2
        `;
        const adminResult = await pool.query(adminQuery, [usuario, contrasena]);

        if (adminResult.rowCount > 0) {
            const admin = adminResult.rows[0];
            const nombreCompleto = `${admin.nombre} ${admin.ap_paterno}`;
            const sesionAdmin = {
                id: admin.id,
                nombre: nombreCompleto,
                tipo: 'admin',
                rol: admin.tipo
            };
            return res.json({ success: true, user: sesionAdmin });
        }

        const pacienteQuery = `
            SELECT id, nombre, ap_paterno, correo 
            FROM Paciente 
            WHERE usuario = $1 AND contraseña = $2
        `;
        const pacienteResult = await pool.query(pacienteQuery, [usuario, contrasena]);

        if (pacienteResult.rowCount > 0) {
            const paciente = pacienteResult.rows[0];
            const nombreCompleto = `${paciente.nombre} ${paciente.ap_paterno}`;
            const sesionPaciente = {
                id: paciente.id,
                nombre: nombreCompleto,
                email: paciente.correo,
                tipo: 'usuario'
            };
            return res.json({ success: true, user: sesionPaciente });
        }

        return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });

    } catch (error) {
        console.error('Error en la consulta de login:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});


app.post('/api/registro', async (req, res) => {
    // 1. Obtener TODOS los campos del body
    const { 
        nombre, ap_paterno, ap_materno, 
        edad, telefono, // <-- NUEVOS CAMPOS
        correo, usuario, contrasena 
    } = req.body;

    // 2. Validar datos de entrada (solo los requeridos por la BD)
    if (!nombre || !ap_paterno || !correo || !usuario || !contrasena) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    try {
        // 3. Verificar que el usuario o correo no existan
        const checkQuery = `SELECT id FROM Paciente WHERE usuario = $1 OR correo = $2`;
        const checkResult = await pool.query(checkQuery, [usuario, correo]);

        if (checkResult.rowCount > 0) {
            return res.status(400).json({ success: false, message: 'El usuario o correo electrónico ya está registrado' });
        }

        // 4. Insertar el nuevo paciente (CON LOS NUEVOS CAMPOS)
        const insertQuery = `
            INSERT INTO Paciente (
                nombre, ap_paterno, ap_materno, 
                edad, telefono,  -- <-- NUEVOS
                correo, usuario, contraseña
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id;
        `;
        
        // El orden DEBE coincidir con los $1, $2, etc.
        const insertParams = [
            nombre, ap_paterno, ap_materno,
            edad, telefono, // <-- NUEVOS
            correo, usuario, contrasena
        ];
        
        await pool.query(insertQuery, insertParams);

        // 5. Enviar respuesta exitosa
        return res.status(201).json({ success: true, message: 'Registro exitoso' });

    } catch (error) {
        console.error('Error en el registro:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor al registrar' });
    }
});

// Sirve los archivos estáticos (HTML, CSS, JS)
app.use(express.static(__dirname));

// 6. Encender el servidor
app.listen(PORT, () => {
    console.log(`¡Servidor intermediario corriendo en http://localhost:${PORT}`);
    console.log(`Prueba la conexión a la BD en: http://localhost:${PORT}/api/prueba_conexion`);
});