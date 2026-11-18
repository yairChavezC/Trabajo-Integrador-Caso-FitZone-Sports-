import paymentService from '../services/paymentService.js';
import { PaymentDomainError } from '../errors.js';

const createPayment = async (req, res) => {
  try {
    const authenticatedUserId = req.user?.id || req.user?.userId || null;
    const result = await paymentService.processPayment(req.body, authenticatedUserId);

    if (result.success) {
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result.data,
        payment: result.payment
      });
    }

    return res.status(400).json({
      success: false,
      message: result.message,
      data: result.data,
      payment: result.payment
    });
  } catch (error) {
    if (error instanceof PaymentDomainError) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    console.error('Error en paymentController.createPayment:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor al procesar el pago.'
    });
  }
};

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

const downloadComprobantePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { buffer, metadata } = await paymentService.getComprobantePdfById(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="comprobante-${metadata.numeroComprobante}.pdf"`
    );
    return res.status(200).send(buffer);
  } catch (error) {
    if (error instanceof PaymentDomainError) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }
    console.error('Error en downloadComprobantePdf:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar el comprobante PDF.'
    });
  }
};

export default {
  createPayment,
  getByReserva,
  downloadComprobantePdf
};