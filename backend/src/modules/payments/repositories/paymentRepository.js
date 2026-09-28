import pool from '../../../config/db.js';

/**
 * Inserta un nuevo registro de pago.
 */
const createPayment = async (paymentData) => {
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

    const result = await pool.query(query, values);
    return result.rows[0];
};

/**
 * Busca un pago asociado a una reserva (para el orquestador).
 */
const getByReservaId = async (reservaId) => {
    const query = `
        SELECT * FROM pagos 
        WHERE id_reserva_cancha = $1 
        ORDER BY fecha_pago DESC 
        LIMIT 1;
    `;
    const result = await pool.query(query, [reservaId]);
    return result.rows[0] || null;
};

export default {
    createPayment,
    getByReservaId
};