import paymentRepository from '../repositories/paymentRepository.js';


/**
 * Función privada para simular la pasarela de pagos (Mock).
 */
const simulatePaymentGateway = async (amount, cardToken) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulamos que el 80% de los pagos se aprueban
            const isApproved = Math.random() > 0.2;
            
            if (isApproved) {
                resolve({ status: 'APPROVED', transactionId: `txn_${Date.now()}` });
            } else {
                resolve({ status: 'REJECTED', reason: 'Fondos insuficientes o tarjeta denegada' });
            }
        }, 1000);
    });
};

/**
 * Procesa un intento de cobro completo.
 */
const processPayment = async (paymentIntent) => {
    const { userId, idSuscripcion, idReservaCancha, amount, concept, cardToken } = paymentIntent;

    // 1. Enviamos el token a la pasarela externa (Mock)
    const gatewayResponse = await simulatePaymentGateway(amount, cardToken);

    // 2. Determinamos el estado final
    const paymentStatus = gatewayResponse.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    // 3. Guardamos la operación en la base de datos oficial ('pagos')
    // Nota: El cardToken NO se guarda nunca (cumple RNF-02 de seguridad)
    const savedPayment = await paymentRepository.createPayment({
        userId,
        idSuscripcion: idSuscripcion || null,
        idReservaCancha: idReservaCancha || null,
        amount,
        medioPago: 'tarjeta_mock',
        transaccionExternaId: gatewayResponse.transactionId || null,
        estado: paymentStatus
    });

    // 4. Retornamos el resultado estructurado para el Controller
    return {
        success: paymentStatus === 'APPROVED',
        payment: savedPayment,
        message: gatewayResponse.reason || 'Pago procesado exitosamente'
    };
};

export default {
    processPayment,
};