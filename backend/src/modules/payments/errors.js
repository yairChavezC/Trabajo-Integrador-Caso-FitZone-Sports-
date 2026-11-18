export class PaymentDomainError extends Error {
  constructor(message, statusCode = 400, code = 'PAYMENT_DOMAIN_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class SensitiveCardDataError extends PaymentDomainError {
  constructor(
    message = 'Por seguridad (RNF-02), no se aceptan datos crudos de tarjeta ni CVV. Envíe un token de pasarela.'
  ) {
    super(message, 422, 'SENSITIVE_CARD_DATA_REJECTED');
  }
}

export class InvalidPaymentTransitionError extends PaymentDomainError {
  constructor(estadoActual, accion) {
    super(
      `Transición inválida: no se puede ejecutar '${accion}' cuando el pago está en estado '${estadoActual}'.`,
      409,
      'INVALID_PAYMENT_STATE_TRANSITION'
    );
  }
}

export class DuplicatePaymentError extends PaymentDomainError {
  constructor(reservaId) {
    super(
      `La reserva #${reservaId} ya posee un pago aprobado registrado.`,
      409,
      'DUPLICATE_RESERVATION_PAYMENT'
    );
  }
}

export class UnsupportedGatewayError extends PaymentDomainError {
  constructor(metodoPago) {
    super(
      `Medio de pago o pasarela no soportada: '${metodoPago}'.`,
      400,
      'UNSUPPORTED_PAYMENT_GATEWAY'
    );
  }
}