import pool from '../../../config/db.js';

export const listarSedesActivas = async () => {
  const query = `
    SELECT 
      id,
      nombre,
      provincia,
      ciudad,
      cupo
    FROM public.sede
    WHERE activa = true
    ORDER BY id ASC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};