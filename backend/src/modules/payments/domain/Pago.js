import { InvalidPaymentTransitionError } from '../errors.js';

export const ESTADOS_PAGO = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
  REEMBOLSADO: 'REEMBOLSADO'
});

const TRANSICIONES_PERMITIDAS = Object.freeze({
  [ESTADOS_PAGO.PENDIENTE]: new Set([
    ESTADOS_PAGO.PENDIENTE,
    ESTADOS_PAGO.APROBADO,
    ESTADOS_PAGO.RECHAZADO
  ]),
  [ESTADOS_PAGO.APROBADO]: new Set([ESTADOS_PAGO.REEMBOLSADO]),
  [ESTADOS_PAGO.RECHAZADO]: new Set(),
  [ESTADOS_PAGO.REEMBOLSADO]: new Set()
});

export class Pago {
  constructor({
    id = null,
    userId,
    reservaId = null,
    monto,
    moneda = 'ARS',
    metodoPago,
    concepto = 'Pago FitZone Sports',
    estado = ESTADOS_PAGO.PENDIENTE,
    transaccionExternaId = null,
    idempotencyKey = null,
    motivoRechazo = null,
    fechaPago = new Date().toISOString()
  }) {
    this.id = id;
    this.userId = userId;
    this.reservaId = reservaId;
    this.monto = Number(monto);
    this.moneda = moneda;
    this.metodoPago = metodoPago;
    this.concepto = concepto;
    this.estado = estado;
    this.transaccionExternaId = transaccionExternaId;
    this.idempotencyKey = idempotencyKey;
    this.motivoRechazo = motivoRechazo;
    this.fechaPago = fechaPago;
  }

  #transicionarA(nuevoEstado, accion) {
    const permitidos = TRANSICIONES_PERMITIDAS[this.estado] || new Set();
    if (!permitidos.has(nuevoEstado)) {
      throw new InvalidPaymentTransitionError(this.estado, accion);
    }
    this.estado = nuevoEstado;
  }

  aprobar(transaccionExternaId) {
    this.#transicionarA(ESTADOS_PAGO.APROBADO, 'aprobar');
    this.transaccionExternaId = transaccionExternaId;
    this.motivoRechazo = null;
  }

  rechazar(motivo, transaccionExternaId = null) {
    this.#transicionarA(ESTADOS_PAGO.RECHAZADO, 'rechazar');
    this.motivoRechazo = motivo || 'Operación rechazada por la pasarela.';
    if (transaccionExternaId) {
      this.transaccionExternaId = transaccionExternaId;
    }
  }

  mantenerPendiente(transaccionExternaId) {
    this.#transicionarA(ESTADOS_PAGO.PENDIENTE, 'mantenerPendiente');
    this.transaccionExternaId = transaccionExternaId;
  }

  reembolsar() {
    this.#transicionarA(ESTADOS_PAGO.REEMBOLSADO, 'reembolsar');
  }

  toPrimitives() {
    return {
      id: this.id,
      pago_id: this.id,
      id_usuario: this.userId,
      userId: this.userId,
      id_reserva_cancha: this.reservaId,
      reserva_id: this.reservaId,
      reservaId: this.reservaId,
      monto: this.monto,
      moneda: this.moneda,
      medio_pago: this.metodoPago,
      metodoPago: this.metodoPago,
      concepto: this.concepto,
      estado: this.estado,
      transaccion_externa_id: this.transaccionExternaId,
      transaccionExternaId: this.transaccionExternaId,
      idempotency_key: this.idempotencyKey,
      idempotencyKey: this.idempotencyKey,
      motivo_rechazo: this.motivoRechazo,
      motivoRechazo: this.motivoRechazo,
      fecha_pago: this.fechaPago,
      fecha_creacion: this.fechaPago
    };
  }
}