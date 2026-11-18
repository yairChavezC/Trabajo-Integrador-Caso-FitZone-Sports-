import * as defaultAuthDomain from './authDomain.js';

export const createAuthService = ({
  authRepo,
  jwtLib,
  jwtSecret,
  authDomain = defaultAuthDomain
}) => {
  if (!jwtSecret) {
    throw new Error('Falta la configuración JWT_SECRET al inicializar authService.');
  }

  const realizarLogin = async (nombre_usuario, contrasenia) => {
    // 1. Validar invariantes de entrada en el dominio
    const { identificadorNormalizado, contraseniaNormalizada } =
      authDomain.validarCredencialesEntrada(nombre_usuario, contrasenia);

    // 2. Buscar usuario activo en el repositorio
    const usuario = await authRepo.buscarUsuarioPorNombre(identificadorNormalizado);
    if (!usuario) {
      throw new Error('AUTH_FAILED');
    }

    // 3. Verificar contraseña delegando al repositorio
    const esValida = await authRepo.verificarPassword(
      contraseniaNormalizada,
      usuario.password
    );
    if (!esValida) {
      throw new Error('AUTH_FAILED');
    }

    // 4. Construir payload y firmar token JWT
    const payload = authDomain.construirPayloadSesion(usuario);
    const token = jwtLib.sign(payload, jwtSecret, { expiresIn: '30m' });

    return {
      token,
      usuario: authDomain.construirUsuarioAutenticadoDTO(usuario)
    };
  };

  return {
    realizarLogin
  };
};