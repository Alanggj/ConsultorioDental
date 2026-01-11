require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function fixSchema() {
    try {
        console.log('Iniciando actualización del esquema...');

        // 1. Fix Usuario table
        await pool.query('ALTER TABLE Usuario ALTER COLUMN contraseña TYPE VARCHAR(255)');
        await pool.query('ALTER TABLE Usuario ALTER COLUMN usuario TYPE VARCHAR(50)');
        console.log('Tabla Usuario actualizada.');

        // 2. Fix Admin table (just in case)
        await pool.query('ALTER TABLE Admin ALTER COLUMN contraseña TYPE VARCHAR(255)');
        await pool.query('ALTER TABLE Admin ALTER COLUMN usuario TYPE VARCHAR(50)');
        console.log('Tabla Admin actualizada.');

        console.log('¡Corrección completada con éxito!');
    } catch (error) {
        console.error('Error al actualizar el esquema:', error);
    } finally {
        await pool.end();
    }
}

fixSchema();
