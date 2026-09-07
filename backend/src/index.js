import 'dotenv/config';
import express from 'express';
import pool from './config/db.js';
import aplicarMiddlewares from './core/middlewares/globalMiddlewares.js';
import errorHandler from './core/middlewares/errorHandler.js';
import apiRouter from './appRouter.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middlewares globales (CORS, express.json, etc.) SIEMPRE antes de las rutas
aplicarMiddlewares(app);

// 2. Rutas de la API
app.use('/api', apiRouter);

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

// 3. Manejador de errores SIEMPRE al final de todas las rutas
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}/test-db`);
});