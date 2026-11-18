export const createAuthController = (authService) => {
  const login = async (req, res, next) => {
    try {
      const { nombre_usuario, contrasenia } = req.body;
      const resultado = await authService.realizarLogin(nombre_usuario, contrasenia);
      return res.json({ mensaje: 'Login exitoso', ...resultado });
    } catch (error) {
      if (error.message === 'AUTH_FAILED') {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }
      next(error);
    }
  };

  return {
    login
  };
};