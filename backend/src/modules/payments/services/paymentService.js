import defaultRepository from '../repositories/paymentRepository.js';
import { PasarelaFactory } from '../gateways/PasarelaPago.js';
import { ESTADOS_PAGO, Pago } from '../domain/Pago.js';
import { validateCreatePaymentDto } from '../dtos/payment.dto.js';
import { DuplicatePaymentError, PaymentDomainError } from '../errors.js';
import { generarComprobantePdf } from './comprobantePdfService.js';

const formatearRespuestaPago = (savedPayment, mensaje, concepto = null) => {
  const paymentObj = {
    id: savedPayment.id,
    pago_id: savedPayment.id,
    reserva_id: savedPayment.id_reserva_cancha,
    id_usuario: savedPayment.id_usuario,
    monto: savedPayment.monto,
    moneda: savedPayment.moneda || 'ARS',
    medio_pago: savedPayment.medio_pago,
    concepto: concepto || savedPayment.concepto || 'Pago FitZone Sports',
    estado: savedPayment.estado,
    transaccion_externa_id: savedPayment.transaccion_externa_id,
    motivo_rechazo: savedPayment.motivo_rechazo || null,
    fecha_pago: savedPayment.fecha_pago,
    fecha_creacion: savedPayment.fecha_pago,
    mensaje
  };

  const success = savedPayment.estado !== ESTADOS_PAGO.RECHAZADO;

  return {
    success,
    message: mensaje,
    mensaje,
    payment: paymentObj,
    data: paymentObj
  };
};

export const createPaymentService = ({
  repository = defaultRepository,
  pasarelaFactory = PasarelaFactory.conPasarelasEstandar()
} = {}) => {
  const locksPorReserva = new Map();

  const ejecutarConLockDeReserva = async (reservaId, tarea) => {
    if (!reservaId) return tarea();

    const clave = String(reservaId);
    const anterior = locksPorReserva.get(clave) || Promise.resolve();
    let liberar;
    const actual = new Promise((resolve) => {
      liberar = resolve;
    });
    const cola = anterior.then(() => actual);
    locksPorReserva.set(clave, cola);

    await anterior;
    try {
      return await tarea();
    } finally {
      liberar();
      if (locksPorReserva.get(clave) === cola) {
        locksPorReserva.delete(clave);
      }
    }
  };

  const processPayment = async (rawPayload, authenticatedUserId = null) => {
    const dto = validateCreatePaymentDto(rawPayload, authenticatedUserId);

    if (dto.idempotencyKey) {
      const pagoPrevio = await repository.findByIdempotencyKey(dto.idempotencyKey);
      if (pagoPrevio) {
        return formatearRespuestaPago(
          pagoPrevio,
          pagoPrevio.motivo_rechazo || 'Operación recuperada por clave de idempotencia.',
          dto.concepto
        );
      }
    }

    return ejecutarConLockDeReserva(dto.reservaId, async () => {
      if (dto.idempotencyKey) {
        const pagoPrevio = await repository.findByIdempotencyKey(dto.idempotencyKey);
        if (pagoPrevio) {
          return formatearRespuestaPago(
            pagoPrevio,
            pagoPrevio.motivo_rechazo || 'Operación recuperada por clave de idempotencia.',
            dto.concepto
          );
        }
      }

      if (dto.reservaId) {
        const pagoAprobadoPrevio = await repository.findApprovedByReservaId(dto.reservaId);
        if (pagoAprobadoPrevio) {
          throw new DuplicatePaymentError(dto.reservaId);
        }
      }

      const pago = new Pago({
        userId: dto.userId,
        reservaId: dto.reservaId,
        monto: dto.monto,
        moneda: dto.moneda,
        metodoPago: dto.metodoPago,
        concepto: dto.concepto,
        idempotencyKey: dto.idempotencyKey
      });

      const pasarela = pasarelaFactory.crear(dto.metodoPago);
      const resultadoPasarela = await pasarela.cobrar({
        monto: dto.monto,
        moneda: dto.moneda,
        token: dto.metodoPago,
        concepto: dto.concepto,
        idempotencyKey: dto.idempotencyKey
      });

      if (resultadoPasarela.estado === ESTADOS_PAGO.APROBADO) {
        pago.aprobar(resultadoPasarela.transaccionExternaId);
      } else if (resultadoPasarela.estado === ESTADOS_PAGO.RECHAZADO) {
        pago.rechazar(resultadoPasarela.mensaje, resultadoPasarela.transaccionExternaId);
      } else {
        pago.mantenerPendiente(resultadoPasarela.transaccionExternaId);
      }

      const savedPayment = await repository.createPayment(pago.toPrimitives());
      return formatearRespuestaPago(savedPayment, resultadoPasarela.mensaje, dto.concepto);
    });
  };

  const getPaymentByReserva = async (reservaId) => {
    return repository.getByReservaId(reservaId);
  };

  const getComprobantePdfById = async (pagoId) => {
    const payment = await repository.findById(pagoId);
    if (!payment) {
      throw new PaymentDomainError(`No se encontró el pago #${pagoId}.`, 404, 'PAYMENT_NOT_FOUND');
    }
    return generarComprobantePdf(payment);
  };

  return {
    processPayment,
    getPaymentByReserva,
    getComprobantePdfById
  };
};

const paymentService = createPaymentService();
export default paymentService;