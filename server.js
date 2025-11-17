// 1. Cargar las herramientas
require('dotenv').config(); // Carga las variables del archivo .env (¡hazlo primero!)
const express = require('express'); // Carga el framework del servidor
const { Pool } = require('pg');      // Carga el "traductor" de PostgreSQL

// 2. Configurar la conexión a la Base de Datos
// El "Pool" es una forma eficiente de manejar las conexiones.
// Automáticamente toma los datos del archivo .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // (Opcional) Si usas SSL, puedes añadir más configuraciones aquí
});

// 3. Crear el servidor (la aplicación)
const app = express();
const PORT = 3000; // El puerto donde correrá nuestro servidor

// Sirve los archivos estáticos (HTML, CSS, JS) de tu carpeta principal
// "static" significa que son archivos que no cambian
app.use(express.static(__dirname));

// 4. Crear un "endpoint" o "ruta" de prueba
// Esto es una URL simple para verificar que el servidor y la BD funcionan.
app.get('/api/prueba_conexion', async (req, res) => {
    try {
        // Hacemos una consulta simple a la base de datos
        const result = await pool.query('SELECT NOW()'); // Pide la hora actual a Postgres
        
        // Si todo sale bien, respondemos con la hora
        res.json({
            message: '¡Conexión a PostgreSQL exitosa!',
            hora_de_la_bd: result.rows[0].now
        });

    } catch (error) {
        // Si hay un error al conectar o consultar
        console.error('Error al conectar con la BD:', error);
        res.status(500).json({
            message: 'Error al conectar con la base de datos',
            error: error.message
        });
    }
});

// 5. Encender el servidor
app.listen(PORT, () => {
    console.log(`¡Servidor intermediario corriendo en http://localhost:${PORT}`);
});