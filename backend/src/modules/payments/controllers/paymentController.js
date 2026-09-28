import paymentService from '../services/paymentService.js';

/**
 * POST /api/payments/pay o /api/pagos/nuevo
 */
const createPayment = async (req, res) => {
    try {
        const { 
            userId, id_usuario, 
            reservaId, reserva_id, idReservaCancha,
            amount, monto, 
            concept, concepto, 
            cardToken, metodo_pago, metodoPago, 
            moneda, idempotency_key 
        } = req.body;

        const targetUserId = userId || id_usuario;
        const targetReservaId = reservaId || reserva_id || idReservaCancha;
        const targetMonto = amount !== undefined ? amount : monto;
        const targetMethod = cardToken || metodo_pago || metodoPago;

        if (targetMonto === undefined || targetMonto === null) {
            return res.status(400).json({
                success: false,
                message: 'Falta el monto a cobrar.'
            });
        }

        const result = await paymentService.processPayment({
            userId: targetUserId,
            reservaId: targetReservaId,
            amount: targetMonto,
            monto: targetMonto,
            concept: concept || concepto,
            cardToken: targetMethod,
            metodoPago: targetMethod,
            idempotencyKey: idempotency_key
        });

        // Si es APROBADO o PENDIENTE -> HTTP 201
        if (result.success) {
            return res.status(201).json({
                success: true,
                message: result.message,
                data: result.data,
                payment: result.payment
            });
        } else {
            // Si es RECHAZADO -> HTTP 400 (pero con toda la info del comprobante devuelta)
            return res.status(400).json({
                success: false,
                message: result.message,
                data: result.data,
                payment: result.payment
            });
        }

    } catch (error) {
        console.error('Error en paymentController.createPayment:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error interno del servidor al procesar el pago.'
        });
    }
};

/**
 * GET /api/pagos/por-reserva/:reserva_id
 */
const getByReserva = async (req, res) => {
    try {
        const { reserva_id } = req.params;
        const payment = await paymentService.getPaymentByReserva(reserva_id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró un pago para la reserva especificada.'
            });
        }

        return res.status(200).json({
            success: true,
            data: payment
        });
    } catch (error) {
        console.error('Error en getByReserva:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al consultar el pago.'
        });
    }
};

export default {
    createPayment,
    getByReserva
};