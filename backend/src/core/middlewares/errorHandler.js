const errorHandler = (err, req, res, next) => {
  // Código de estado por defecto: 500 (Internal Server Error)
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Ocurrió un error interno en el servidor';

  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: message,
    // En desarrollo mostramos la traza del error para debuggear; en producción la ocultamos
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler;