require('dotenv').config();
const express = require('express');
const pool = require('./config/db');
const initGlobalMiddlewares = require('./core/middlewares/globalMiddlewares');
const errorHandler = require('./core/middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Aplicacion middlewares globales
initGlobalMiddlewares(app);


app.use(errorHandler);

// Ruta de prueba contra Supabase
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ mensaje: 'Conexión exitosa a Supabase', timestamp: result.rows[0].now });
  } catch (error) {
    console.error('Error al conectar a la DB:', error);
    res.status(500).json({ error: 'Error al conectar con la base de datos' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}/test-db`);
});