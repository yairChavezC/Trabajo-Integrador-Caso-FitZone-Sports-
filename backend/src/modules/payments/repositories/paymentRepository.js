import pool from '../../../config/db.js';

/**
 * Inserta un nuevo registro de pago en la tabla oficial 'pagos'.
 * @param {Object} paymentData - Datos del pago.
 * @returns {Object} El pago recién creado.
 */
const createPayment = async (paymentData) => {
    const { 
        userId, 
        idSuscripcion = null, 
        idReservaCancha = null, 
        monto, 
        medioPago = 'tarjeta_mock', 
        transaccionExternaId = null, 
        estado 
    } = paymentData;

    const query = `
        INSERT INTO pagos 
        (id_usuario, id_suscripcion, id_reserva_cancha, monto, medio_pago, transaccion_externa_id, fecha_pago, estado)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        RETURNING *;
    `;

    const values = [
        userId, 
        idSuscripcion, 
        idReservaCancha, 
        monto, 
        medioPago, 
        transaccionExternaId, 
        estado
    ];

    try {
        const result = await pool.query(query, values);
        return result.rows[0]; // Retorna la fila insertada con su ID de la base de datos
    } catch (error) {
        console.error('Error en paymentRepository.createPayment:', error.message);
        throw new Error('Error al persistir el pago en la base de datos');
    }
};

export default {
    createPayment,
};