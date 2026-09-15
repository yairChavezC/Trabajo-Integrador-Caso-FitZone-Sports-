import paymentService from '../services/paymentService.js';

/**
 * Controlador para procesar un pago nuevo.
 */
const createPayment = async (req, res) => {
    try {
        const { userId, idSuscripcion, idReservaCancha, amount, concept, cardToken } = req.body;

        // Validación básica de entrada (defendiendo la API)
        if (!userId || !amount || !cardToken) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos obligatorios (userId, amount o cardToken).'
            });
        }

        // Llamamos al Service para que procese la pasarela y guarde en la BD
        const result = await paymentService.processPayment({
            userId,
            idSuscripcion: idSuscripcion || null,
            idReservaCancha: idReservaCancha || null,
            amount,
            concept: concept || 'Pago general FitZone',
            cardToken
        });

        // Si la pasarela aprobó y se guardó, respondemos con 201 (Creado)
        if (result.success) {
            return res.status(201).json({
                success: true,
                message: result.message,
                data: result.payment
            });
        } else {
            // Si la tarjeta fue rechazada, respondemos con 400 (Bad Request) pero la operación queda registrada
            return res.status(400).json({
                success: false,
                message: result.message,
                data: result.payment
            });
        }

    } catch (error) {
        console.error('Error en paymentController.createPayment:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor al procesar el pago.'
        });
    }
};

export default {
    createPayment,
};