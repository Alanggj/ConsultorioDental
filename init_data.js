const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

(async () => {
  try {
    const connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

    if (!connectionString) {
      console.error('No DATABASE_URL ni datos de DB_* configurados.');
      process.exit(1);
    }

    const client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await client.connect();
    console.log('Conectado a la base de datos');

    const insertSql = fs.readFileSync(path.join(__dirname, 'inserciones_consultorio.sql'), 'utf8');

    console.log('Ejecutando inserciones_consultorio.sql...');
    await client.query(insertSql);
    console.log('inserciones_consultorio.sql ejecutado correctamente');

    await client.end();
    console.log('Inserción de datos completada.');
    process.exit(0);
  } catch (err) {
    console.error('Error insertando datos:', err);
    process.exit(1);
  }
})();
