import { ESTADOS_PAGO } from '../domain/Pago.js';
import { DuplicatePaymentError } from '../errors.js';

export class InMemoryPagoRepository {
  constructor() {
    this.pagos = [];
    this.secuencia = 1;
  }

  async findById(id) {
    return this.pagos.find((p) => Number(p.id) === Number(id)) || null;
  }

  async findByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    return this.pagos.find((p) => p.idempotency_key === idempotencyKey) || null;
  }

  async findApprovedByReservaId(reservaId) {
    if (!reservaId) return null;
    return (
      this.pagos.find(
        (p) => Number(p.id_reserva_cancha) === Number(reservaId) && p.estado === ESTADOS_PAGO.APROBADO
      ) || null
    );
  }

  async createPayment(paymentData) {
    if (paymentData.idempotencyKey) {
      const yaExiste = await this.findByIdempotencyKey(paymentData.idempotencyKey);
      if (yaExiste) return yaExiste;
    }

    if (paymentData.reservaId && paymentData.estado === ESTADOS_PAGO.APROBADO) {
      const pagoPrevio = await this.findApprovedByReservaId(paymentData.reservaId);
      if (pagoPrevio) {
        throw new DuplicatePaymentError(paymentData.reservaId);
      }
    }

    const registro = {
      id: this.secuencia++,
      id_usuario: paymentData.userId || 1,
      id_reserva_cancha: paymentData.reservaId || null,
      monto: Number(paymentData.monto || 0),
      moneda: paymentData.moneda || 'ARS',
      medio_pago: paymentData.metodoPago || 'TARJETA',
      concepto: paymentData.concepto || 'Pago FitZone Sports',
      transaccion_externa_id: paymentData.transaccionExternaId,
      estado: paymentData.estado,
      idempotency_key: paymentData.idempotencyKey || null,
      motivo_rechazo: paymentData.motivoRechazo || null,
      fecha_pago: new Date().toISOString()
    };

    this.pagos.push(registro);
    return registro;
  }

  async getByReservaId(reservaId) {
    const encontrados = this.pagos.filter(
      (p) => Number(p.id_reserva_cancha) === Number(reservaId)
    );
    return encontrados.length ? encontrados[encontrados.length - 1] : null;
  }

  clear() {
    this.pagos = [];
    this.secuencia = 1;
  }
}