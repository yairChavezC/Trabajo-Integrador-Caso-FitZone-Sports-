export function createSubscriptionsRepository(pool) {
  const COLUMNAS = 'id, id_usuario, id_plan, estado, fecha_inicio, fecha_proximo_vencimiento, fecha_fin, descuento';

  async function findByUsuario(idUsuario) {
    const result = await pool.query(
      `SELECT ${COLUMNAS} FROM suscripcion WHERE id_usuario = $1`,
      [idUsuario]
    );
    return result.rows[0] || null;
  }

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

    async function vincularPago(idPago, idSuscripcion) {
    await pool.query('UPDATE pagos SET id_suscripcion = $1 WHERE id = $2', [
      idSuscripcion,
      idPago,
    ]);
  }

  return { findByUsuario, upsert, vincularPago }
}