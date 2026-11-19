/**
 * Valida los invariantes de entrada antes de consultar infraestructura.
 */
export const validarCredencialesEntrada = (nombreUsuario, contrasenia) => {
  if (!nombreUsuario || !String(nombreUsuario).trim()) {
    const error = new Error('AUTH_FAILED');
    error.domainCode = 'CREDENCIALES_VACIAS';
    throw error;
  }

  if (!contrasenia || !String(contrasenia).trim()) {
    const error = new Error('AUTH_FAILED');
    error.domainCode = 'CREDENCIALES_VACIAS';
    throw error;
  }

  return {
    identificadorNormalizado: String(nombreUsuario).trim(),
    contraseniaNormalizada: String(contrasenia).trim()
  };
};

/**
 * Construye el payload estándar del token JWT para la sesión.
 */
export const construirPayloadSesion = (usuario) => ({
  id: usuario.id,
  dni: usuario.dni,
  rol: usuario.id_rol
});

/**
 * Proyecta los datos públicos del usuario autenticado omitiendo información sensible.
 */
export const construirUsuarioAutenticadoDTO = (usuario) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  rol: usuario.id_rol,
  foto: usuario.foto || null
});