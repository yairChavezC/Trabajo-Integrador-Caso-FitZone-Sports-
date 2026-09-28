import paymentRepository from '../repositories/paymentRepository.js';

/**
 * Función privada para simular la pasarela de pagos (Mock).
 */
const simulatePaymentGateway = async (amount, cardToken) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Si el usuario eligió explícitamente tarjeta rechazada
            if (cardToken === 'tarjeta_rechazada') {
                resolve({ 
                    status: 'REJECTED', 
                    estado: 'RECHAZADO',
                    message: 'El pago no pudo ser procesado por la entidad.' 
                });
                return;
            }

            // Si el usuario eligió transferencia pendiente
            if (cardToken === 'transferencia_pendiente') {
                resolve({ 
                    status: 'PENDING', 
                    estado: 'PENDIENTE',
                    message: 'La operación se encuentra a la espera de acreditación.' 
                });
                return;
            }

            // Por defecto (tarjeta_mock u otro), se aprueba
            resolve({ 
                status: 'APPROVED', 
                estado: 'APROBADO',
                message: 'Operación exitosa.' 
            });
        }, 500);
    });
};

/**
 * Procesa un intento de cobro completo.
 */
const processPayment = async ({ userId, idSuscripcion, idReservaCancha, amount, concept, cardToken }) => {
    // 1. Llamamos a la pasarela simulada pasándole el cardToken
    const gatewayResponse = await simulatePaymentGateway(amount, cardToken);

    // 2. Definimos el éxito basándonos en la respuesta de la pasarela
    const estado = gatewayResponse.estado;
    const success = estado !== 'RECHAZADO';
    const message = gatewayResponse.message;

    // 3. Armamos el objeto del comprobante con la información real procesada
    const payment = {
        id_usuario: userId,
        monto: amount,
        concepto: concept,
        medio_pago: cardToken,
        estado: estado, 
        transaccion_externa_id: `txn_${Math.floor(Math.random() * 1000000)}`,
        fecha_pago: new Date().toISOString()
    };

    // (Acá podés descomentar o integrar tu repositorio si guardás en base de datos)
    // await paymentRepository.save(payment);

    // 4. Devolvemos el resultado al controlador
    return {
        success,
        message,
        payment // Este es el objeto que el frontend usará para armar el comprobante
    };
};

// Un solo export default al final del archivo
export default { 
    processPayment 
};