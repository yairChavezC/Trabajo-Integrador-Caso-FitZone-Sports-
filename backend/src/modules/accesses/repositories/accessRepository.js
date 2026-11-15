import pool from '../../../config/db.js';

/**
 * Busca un usuario a partir de su código QR y normaliza el estado de su suscripción.
 */
const findUserByQR = async (qrCode) => {
    try {
        const partes = qrCode.split('-');
        if (partes.length < 2 || partes[0] !== 'FITZONE') {
            return null;
        }
        
        const userId = partes[1];
        
        const query = `
            SELECT u.*, LOWER(TRIM(s.estado)) AS estado_suscripcion 
            FROM usuario u 
            LEFT JOIN suscripcion s ON u.id = s.id_usuario 
            WHERE u.id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    } catch (error) {
        console.error("Error al buscar usuario por QR:", error);
        return null;
    }
};

/**
 * RN-01: Verifica si el usuario ya se encuentra dentro de alguna sede.
 */
const checkAccesoActivoGlobal = async (idUserId) => {
    const query = `
        SELECT id FROM control_acceso 
        WHERE id_usuario = $1 AND fecha_salida IS NULL;
    `;
    const result = await pool.query(query, [idUserId]);
    return result.rows.length > 0;
};

/**
 * Registra una entrada de acceso a una sede.
 */
const createAccess = async (accessData) => {
    const { idSede, idUserId, fechaEntrada } = accessData;
    const query = `
        INSERT INTO control_acceso (id_sede, id_usuario, fecha_entrada)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const values = [idSede, idUserId, fechaEntrada || new Date()];
    const result = await pool.query(query, values);
    return result.rows[0];
};

/**
 * Registra la salida de un usuario de una sede.
 */
const registrarSalida = async (idUserId, idSede, fechaSalida = null) => {
    const query = `
        UPDATE control_acceso 
        SET fecha_salida = $1 
        WHERE id_usuario = $2 AND id_sede = $3 AND fecha_salida IS NULL 
        RETURNING *;
    `;
    const values = [fechaSalida ? new Date(fechaSalida) : new Date(), idUserId, idSede];
    const result = await pool.query(query, values);
    return result.rows[0]; 
};

/**
 * RF-05: Obtiene el aforo actual de una sede específica.
 * REGLA: Los clientes externos (id_rol = 2) NO suman al aforo.
 */
const getAforoPorSede = async (idSede) => {
    const query = `
        SELECT COUNT(*) as personas_adentro 
        FROM control_acceso ca
        JOIN usuario u ON ca.id_usuario = u.id
        WHERE ca.id_sede = $1 
          AND ca.fecha_salida IS NULL
          AND u.id_rol != 2;
    `;
    const values = [idSede];
    const result = await pool.query(query, values);
    return parseInt(result.rows[0].personas_adentro, 10);
};

/**
 * Obtiene los últimos movimientos en puerta de una sede específica.
 */
const getUltimosMovimientosPorSede = async (idSede, limite = 5) => {
    try {
        const query = `
            SELECT 
                ca.id, 
                ca.fecha_entrada, 
                ca.fecha_salida, 
                ca.id_usuario, 
                COALESCE(u.nombre, 'Socio #' || ca.id_usuario) AS nombre
            FROM control_acceso ca
            LEFT JOIN usuario u ON ca.id_usuario = u.id
            WHERE ca.id_sede::text = $1::text
            ORDER BY COALESCE(ca.fecha_salida, ca.fecha_entrada) DESC
            LIMIT $2;
        `;
        
        const result = await pool.query(query, [idSede, limite]);
        return result.rows;
    } catch (error) {
        console.error("Error al obtener últimos movimientos por sede:", error);
        return [];
    }
};

/**
 * Busca un usuario por DNI (ignorando espacios laterales) para validar si ya existe
 * como socio o como cliente externo registrado.
 */
const findUserByDni = async (dni) => {
    try {
        const dniLimpio = String(dni || '').trim();
        const query = `
            SELECT u.*, LOWER(TRIM(s.estado)) AS estado_suscripcion
            FROM usuario u
            LEFT JOIN suscripcion s ON u.id = s.id_usuario
            WHERE TRIM(u.dni) = $1
            ORDER BY s.id DESC
            LIMIT 1;
        `;
        const result = await pool.query(query, [dniLimpio]);
        return result.rows[0] || null;
    } catch (error) {
        console.error("Error al buscar usuario por DNI:", error);
        return null;
    }
};

/**
 * Crea el perfil del cliente externo (id_rol = 2) en la tabla usuario cuando no estaba registrado.
 * Se asigna su DNI hasheado como contraseña inicial para cumplir la restricción NOT NULL de la BD.
 */
const createUserPublic = async (userData) => {
    const { nombre, dni, id_rol } = userData;
    const dniLimpio = String(dni).trim();
    const nombreLimpio = String(nombre).trim();
    const contactoGenerado = `externo.${dniLimpio}@fitzone.com`;

    try {
        const query = `
            INSERT INTO usuario (nombre, dni, contacto, password, id_rol, activo)
            VALUES ($1, $2, $3, encode(digest($4, 'sha256'), 'hex'), $5, true)
            RETURNING id, nombre, dni, contacto, id_rol, activo;
        `;
        const values = [nombreLimpio, dniLimpio, contactoGenerado, dniLimpio, id_rol || 2]; 
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error("Error al crear usuario público:", error);
        throw error;
    }
};

/**
 * Obtiene el historial personal de un socio específico.
 */
const getHistorialByUser = async (userId) => {
    try {
        const query = `
            SELECT 
                ca.id, 
                ca.fecha_entrada, 
                ca.fecha_salida,
                s.nombre as sede_nombre
            FROM control_acceso ca
            LEFT JOIN sede s ON ca.id_sede = s.id
            WHERE ca.id_usuario = $1
            ORDER BY ca.fecha_entrada DESC
            LIMIT 20;
        `;
        const result = await pool.query(query, [userId]);
        
        return result.rows.map(row => ({
            id: row.id,
            fecha_entrada: row.fecha_entrada,
            fecha_salida: row.fecha_salida,
            sede: { nombre: row.sede_nombre || 'Sede Principal' }
        }));
    } catch (error) {
        console.error("Error en getHistorialByUser:", error);
        return [];
    }
};

/**
 * RNF-01: Obtiene el padrón resumido de usuarios y su estado de membresía/presencia actual
 * para ser replicado localmente en la terminal de cada sede (contingencia offline).
 */
const getPadronOffline = async () => {
    try {
        const query = `
            SELECT 
                u.id, 
                u.dni, 
                u.nombre, 
                u.id_rol,
                COALESCE(
                    (SELECT s.estado 
                     FROM suscripcion s 
                     WHERE s.id_usuario = u.id 
                     ORDER BY s.id DESC 
                     LIMIT 1), 
                    'inactiva'
                ) AS estado_suscripcion,
                EXISTS (
                    SELECT 1 
                    FROM control_acceso ca 
                    WHERE ca.id_usuario = u.id 
                      AND ca.fecha_salida IS NULL
                ) AS esta_adentro,
                (
                    SELECT ca.id_sede 
                    FROM control_acceso ca 
                    WHERE ca.id_usuario = u.id 
                      AND ca.fecha_salida IS NULL 
                    ORDER BY ca.fecha_entrada DESC 
                    LIMIT 1
                ) AS id_sede_activa
            FROM usuario u
            WHERE u.activo = true;
        `;
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error("Error al obtener padrón offline en el repositorio:", error);
        throw error;
    }
};
/**
 * RF-05: Obtiene la capacidad máxima (cupo) configurada para una sede específica.
 */
const getCupoSede = async (idSede) => {
    try {
        const query = `SELECT cupo FROM sede WHERE id = $1 LIMIT 1;`;
        const result = await pool.query(query, [idSede]);
        const cupo = Number(result.rows[0]?.cupo);
        return cupo > 0 ? cupo : 100;
    } catch (error) {
        console.error("Error al obtener cupo de la sede:", error);
        return 100;
    }
};

export default {
    findUserByQR,
    checkAccesoActivoGlobal,
    createAccess,
    registrarSalida, 
    getAforoPorSede,
    getCupoSede,
    getUltimosMovimientosPorSede,
    findUserByDni,
    createUserPublic,
    getHistorialByUser,
    getPadronOffline
};