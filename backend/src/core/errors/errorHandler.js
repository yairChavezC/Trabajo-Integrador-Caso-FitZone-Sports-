const errorHandler = (err, req, res, next) => {
  // Si las cabeceras ya se enviaron, delegamos al manejador por defecto de Express
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  
  // En producción, si es un error 500 no operacional, ocultamos el mensaje crudo
  const isDev = process.env.NODE_ENV === 'development';
  const defaultMessage = statusCode === 500 && !isDev 
    ? 'Ocurrió un error interno en el servidor' 
    : err.message || 'Ocurrió un error interno en el servidor';

  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: defaultMessage,
    ...(isDev && { stack: err.stack })
  });
};

export default errorHandler;