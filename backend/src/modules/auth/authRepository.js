import pool from '../../config/db.js';

export const buscarUsuarioPorNombre = async (identificador) => {
  const sql = `
    SELECT id, dni, nombre, password, id_rol, activo
    FROM usuario
    WHERE dni = $1 AND activo = true
  `;
  const result = await pool.query(sql, [identificador]);
  return result.rows[0];
};