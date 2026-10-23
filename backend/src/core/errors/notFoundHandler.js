const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: 'Recurso no encontrado',
    ruta: req.originalUrl,
  });
};

export default notFoundHandler;