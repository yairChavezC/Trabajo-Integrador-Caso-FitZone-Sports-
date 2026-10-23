import * as reservationsService from '../../modules/reservaCancha/reservaCanchaService.js';
import paymentService from '../../modules/payments/services/paymentService.js';

export const procesarReservaConPago = async ({
  idCancha,
  idUsuario,
  fechaInicio,
  fechaFin,
  monto,
  metodoPago,
  idempotencyKey
}) => {
  let reservaCreada = null;

  try {
    // 1. Crear la reserva en estado 'pendiente' (bloquea el horario en reserva_cancha)
    reservaCreada = await reservationsService.crearReservaPendiente({
      idCancha,
      idUsuario,
      fechaInicio,
      fechaFin,
      monto
    });

    // 2. Invocar tu paymentService.processPayment pasándole el id de la reserva recién creada
    const resultadoPago = await paymentService.processPayment({
      userId: idUsuario,
      reservaId: reservaCreada.id,
      monto,
      metodoPago,
      idempotencyKey
    });

    // 3. Evaluar el resultado del pago
    if (!resultadoPago.success || resultadoPago.payment.estado === 'RECHAZADO') {
      // Compensación inmediata: cancelamos la reserva pendiente para no bloquear el slot
      await reservationsService.actualizarEstadoReserva(reservaCreada.id, 'cancelada');

      return {
        success: false,
        estado: 'RECHAZADO',
        message: resultadoPago.message,
        reservaId: reservaCreada.id,
        pago: resultadoPago.payment
      };
    }

    // 4. Si el pago fue aprobado, pasamos la reserva a 'confirmada'
    const reservaFinal = await reservationsService.actualizarEstadoReserva(
      reservaCreada.id,
      resultadoPago.payment.estado === 'PENDIENTE' ? 'pendiente' : 'confirmada'
    );

    return {
      success: true,
      estado: reservaFinal.estado,
      message: resultadoPago.message,
      reserva: reservaFinal,
      pago: resultadoPago.payment
    };

  } catch (error) {
    // Si falló algo inesperado (DB caída, error de red), aplicamos compensación
    if (reservaCreada?.id) {
      try {
        await reservationsService.actualizarEstadoReserva(reservaCreada.id, 'cancelada');
      } catch (compensacionError) {
        console.error('Error al compensar reserva fallida:', compensacionError);
      }
    }
    throw error;
  }
};