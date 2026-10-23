import pool from '../../config/db.js';



export const buscarUsuarioPorNombre = async (identificador) => {
  const sql = `
    SELECT id, dni, nombre, contacto, foto, password, id_rol, activo
    FROM public.usuario
    WHERE (dni = $1 OR contacto = $1) AND activo = true
  `;
  const result = await pool.query(sql, [identificador]);
  return result.rows[0];
};