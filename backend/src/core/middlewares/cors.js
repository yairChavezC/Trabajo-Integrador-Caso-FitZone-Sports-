const cors = require('cors');

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permite solicitudes sin origin (como Postman o curl) o si está en la lista blanca
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por la política de CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

module.exports = cors(corsOptions);