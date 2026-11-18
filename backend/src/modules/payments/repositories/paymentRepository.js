import { pool } from '../../../db.js';
import { DuplicatePaymentError } from '../errors.js';

export class PostgresPagoRepository {
  async findById(id) {
    const result = await pool.query('SELECT * FROM pagos WHERE id = $1 LIMIT 1;', [id]);
    return result.rows[0] || null;
  }

  async findByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    const result = await pool.query(
      'SELECT * FROM pagos WHERE idempotency_key = $1 LIMIT 1;',
      [idempotencyKey]
    );
    return result.rows[0] || null;
  }

  async findApprovedByReservaId(reservaId) {
    if (!reservaId) return null;
    const result = await pool.query(
      `SELECT * FROM pagos
       WHERE id_reserva_cancha = $1 AND estado = 'APROBADO'
       LIMIT 1;`,
      [reservaId]
    );
    return result.rows[0] || null;
  }

  async createPayment(paymentData) {
    const {
      userId,
      reservaId,
      monto,
      moneda = 'ARS',
      metodoPago,
      transaccionExternaId,
      estado,
      idempotencyKey,
      motivoRechazo
    } = paymentData;

    const query = `
      INSERT INTO pagos
      (id_usuario, id_reserva_cancha, monto, moneda, medio_pago, transaccion_externa_id, estado, idempotency_key, motivo_rechazo, fecha_pago)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *;
    `;

    const values = [
      userId || 1,
      reservaId || null,
      monto || 0,
      moneda,
      metodoPago || 'TARJETA',
      transaccionExternaId,
      estado,
      idempotencyKey || null,
      motivoRechazo || null
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        if (idempotencyKey) {
          const existente = await this.findByIdempotencyKey(idempotencyKey);
          if (existente) return existente;
        }
        if (reservaId) {
          throw new DuplicatePaymentError(reservaId);
        }
      }
      throw error;
    }
  }

  async getByReservaId(reservaId) {
    const query = `
      SELECT * FROM pagos
      WHERE id_reserva_cancha = $1
      ORDER BY fecha_pago DESC
      LIMIT 1;
    `;
    const result = await pool.query(query, [reservaId]);
    return result.rows[0] || null;
  }
}

const defaultRepository = new PostgresPagoRepository();
export default defaultRepository;