import pool from '../../../config/db.js';

/**
 * Registra una entrada de acceso.
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
 * Obtiene todos los registros de control de acceso.
 */
const getAllAccesses = async () => {
    const query = `SELECT * FROM control_acceso ORDER BY fecha_entrada DESC;`;
    const result = await pool.query(query);
    return result.rows;
};

// Exportación por defecto que espera el service
export default {
    createAccess,
    getAllAccesses,
};