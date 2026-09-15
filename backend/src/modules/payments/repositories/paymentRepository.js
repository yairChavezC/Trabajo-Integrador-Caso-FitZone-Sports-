import pool from '../../../config/db.js';

/**
 * Inserta un nuevo registro de pago en la tabla oficial 'pagos'.
 * @param {Object} paymentData - Datos del pago.
 * @returns {Object} El pago recién creado.
 */
const createPayment = async (paymentData) => {
    // Mapeo seguro: captura cualquier variante que mande el controlador o el body
    const userId = paymentData.userId || paymentData.id_usuario;
    const idSuscripcion = paymentData.idSuscripcion || paymentData.id_suscripcion || null;
    const idReservaCancha = paymentData.idReservaCancha || paymentData.id_reserva_cancha || null;
    
    // Captura 'monto' o 'amount' sin importar de dónde venga
    const monto = paymentData.monto !== undefined ? paymentData.monto : (paymentData.amount !== undefined ? paymentData.amount : null);
    
    const medioPago = paymentData.medioPago || paymentData.medio_pago || 'tarjeta_mock';
    const transaccionExternaId = paymentData.transaccionExternaId || paymentData.transaccion_externa_id || null;
    const estado = paymentData.estado || 'completado';

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