import paymentRepository from '../repositories/paymentRepository.js';

/**
 * Simulación flexible de la pasarela de pagos.
 */
const simulatePaymentGateway = async (amount, tokenOrMethod) => {
    const token = String(tokenOrMethod || '').toLowerCase();

    return new Promise((resolve) => {
        setTimeout(() => {
            if (token.includes('rechazad')) {
                resolve({ 
                    estado: 'RECHAZADO', 
                    mensaje: 'El pago fue rechazado por la entidad emisora.' 
                });
                return;
            }

            if (token.includes('pendient')) {
                resolve({ 
                    estado: 'PENDIENTE', 
                    mensaje: 'La operación se encuentra a la espera de acreditación.' 
                });
                return;
            }

            resolve({ 
                estado: 'APROBADO', 
                mensaje: 'Operación exitosa.' 
            });
        }, 300);
    });
};

/**
 * Procesa un intento de cobro y persiste en Supabase.
 */
const processPayment = async ({ userId, reservaId, amount, monto, concept, concepto, cardToken, metodoPago, idempotencyKey }) => {
    const finalAmount = monto !== undefined ? monto : amount;
    const finalMethod = cardToken || metodoPago || 'TARJETA';

    // 1. Simular respuesta de la pasarela
    const gateway = await simulatePaymentGateway(finalAmount, finalMethod);
    const success = gateway.estado !== 'RECHAZADO';

    // 2. Armar el objeto para DB
    const paymentData = {
        userId: userId || 1,
        reservaId: reservaId || null,
        monto: finalAmount || 0,
        moneda: 'ARS',
        metodoPago: finalMethod,
        transaccionExternaId: `txn_${Date.now()}`,
        estado: gateway.estado, // 'APROBADO', 'RECHAZADO', 'PENDIENTE'
        idempotencyKey,
        motivoRechazo: gateway.estado === 'RECHAZADO' ? gateway.mensaje : null
    };

    // 3. Persistir en la base de datos (incluso si es rechazado o pendiente queda registrado)
    const savedPayment = await paymentRepository.createPayment(paymentData);

    // 4. Construir objeto unificado para Frontend y Orquestador
    const paymentObj = {
        id: savedPayment.id,
        pago_id: savedPayment.id,
        reserva_id: savedPayment.id_reserva_cancha,
        id_usuario: savedPayment.id_usuario,
        monto: savedPayment.monto,
        medio_pago: savedPayment.medio_pago,
        estado: savedPayment.estado,
        transaccion_externa_id: savedPayment.transaccion_externa_id,
        fecha_pago: savedPayment.fecha_pago,
        fecha_creacion: savedPayment.fecha_pago,
        mensaje: gateway.mensaje
    };

    return {
        success,
        message: gateway.mensaje,
        mensaje: gateway.mensaje,
        payment: paymentObj,
        data: paymentObj
    };
};

/**
 * Consulta estado de pago por reserva.
 */
const getPaymentByReserva = async (reservaId) => {
    return await paymentRepository.getByReservaId(reservaId);
};

export default { 
    processPayment,
    getPaymentByReserva
};