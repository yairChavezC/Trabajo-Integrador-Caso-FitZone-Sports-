import pool from '../../config/db.js';

const COLUMNAS = 'id, id_usuario, id_plan, estado, fecha_inicio, fecha_proximo_vencimiento, fecha_fin, descuento';

async function findByUsuario(idUsuario) {
  const result = await pool.query(
    `SELECT ${COLUMNAS} FROM suscripcion WHERE id_usuario = $1`,
    [idUsuario]
  );
  return result.rows[0] || null;
}

// Si el socio no tiene suscripción, la crea. Si ya tiene, la actualiza (una sola fila por socio).
async function upsert({ idUsuario, idPlan, fechaProximoVencimiento }) {
  const result = await pool.query(
    `INSERT INTO suscripcion (id_usuario, id_plan, estado, fecha_inicio, fecha_proximo_vencimiento)
     VALUES ($1, $2, 'activa', CURRENT_DATE, $3)
     ON CONFLICT (id_usuario) DO UPDATE SET
       id_plan = EXCLUDED.id_plan,
       estado = 'activa',
       fecha_proximo_vencimiento = EXCLUDED.fecha_proximo_vencimiento
     RETURNING ${COLUMNAS}`,
    [idUsuario, idPlan, fechaProximoVencimiento]
  );
  return result.rows[0];
}

export default { findByUsuario, upsert };