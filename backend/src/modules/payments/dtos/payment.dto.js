import { PaymentDomainError, SensitiveCardDataError } from '../errors.js';

const PAN_REGEX = /\b(?:\d[ -]*?){13,19}\b/;

export const validateCreatePaymentDto = (body = {}, authenticatedUserId = null) => {
  if (
    body.cardNumber !== undefined ||
    body.numeroTarjeta !== undefined ||
    body.numero_tarjeta !== undefined ||
    body.cvv !== undefined ||
    body.cvc !== undefined
  ) {
    throw new SensitiveCardDataError();
  }

  const rawToken = String(body.cardToken || body.paymentToken || body.metodoPago || body.metodo_pago || '');
  if (PAN_REGEX.test(rawToken)) {
    throw new SensitiveCardDataError();
  }

  const rawMonto = body.amount !== undefined ? body.amount : body.monto;
  if (rawMonto === undefined || rawMonto === null || rawMonto === '') {
    throw new PaymentDomainError('Falta el monto a cobrar.', 400, 'MISSING_AMOUNT');
  }

  const monto = Number(rawMonto);
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new PaymentDomainError('El monto a cobrar debe ser un número mayor a cero.', 422, 'INVALID_AMOUNT');
  }

  const userId = authenticatedUserId || body.userId || body.id_usuario || 1;
  const reservaId = body.reservaId || body.reserva_id || body.idReservaCancha || null;
  const metodoPago = body.metodoPago || body.metodo_pago || body.cardToken || 'TARJETA';
  const concepto = body.concept || body.concepto || (reservaId ? `Reserva de cancha #${reservaId}` : 'Membresía FitZone Sports');
  const idempotencyKey = body.idempotencyKey || body.idempotency_key || null;
  const moneda = body.moneda || 'ARS';

  return {
    userId: Number(userId),
    reservaId: reservaId !== null ? Number(reservaId) : null,
    monto,
    moneda,
    metodoPago: String(metodoPago).trim(),
    concepto: String(concepto).trim(),
    idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : null
  };
};