// Deja pasar solo a los usuarios cuyo rol esté en la lista
export function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    // El rol del token puede venir como texto ("4") o como null
    const rol = Number(req.usuario?.rol);

    if (!rolesPermitidos.includes(rol)) {
      const error = new Error('No tenés permiso para realizar esta acción');
      error.status = 403;
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
}