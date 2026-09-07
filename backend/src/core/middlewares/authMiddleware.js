import jwt from 'jsonwebtoken';

// Middleware para interceptar peticiones y validar que el usuario esté logueado
export const verificarToken = (req, res, next) => {
    // Extraemos el token del encabezado 'Authorization'
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Si no se envió ningún token, rechazamos el acceso
    if (!token) {
        return res.status(401).json({ 
            error: 'Acceso denegado. Se requiere un token de autenticación.' 
        });
    }

    try {
        // Verificamos si el token es válido y no ha expirado usando nuestra clave secreta
        const usuarioVerificado = jwt.verify(token, process.env.JWT_SECRET);
        
        // Guardamos los datos decodificados del usuario en la request para que los usen los controladores
        req.usuario = usuarioVerificado;
        
        // Damos paso a la ejecución de la ruta solicitada
        next();
        
    } catch (error) {
        // Atrapamos errores si el token fue adulterado o ya se venció
        return res.status(403).json({ 
            error: 'Token inválido o expirado. Acceso prohibido.' 
        });
    }
};