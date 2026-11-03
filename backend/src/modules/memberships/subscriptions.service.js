import plansRepository from './plans.repository.js';
import subscriptionsRepository from './subscriptions.repository.js';
import paymentService from '../payments/services/paymentService.js';
import pool from '../../config/db.js';

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  return error;
}

function sumarDias(fecha, dias) {
  const resultado = new Date(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

async function renovarMembresia({ idUsuario, idPlan }) {
  const plan = await plansRepository.findById(idPlan);
  if (!plan || !plan.activo) {
    throw httpError('El plan no existe o no está disponible', 400);
  }

  // Cobra a través del módulo de pagos (sin reserva asociada)
  const resultadoPago = await paymentService.processPayment({
    userId: idUsuario,
    monto: Number(plan.precio),
    concepto: `Membresía - ${plan.nombre}`,
  });

  if (!resultadoPago.success) {
    // Pago rechazado o pendiente: no se toca la suscripción
    return {
      pagoAprobado: false,
      pago: resultadoPago.payment,
      mensaje: resultadoPago.message,
    };
  }

  // Pago aprobado: calculamos la nueva fecha de vencimiento
  const suscripcionActual = await subscriptionsRepository.findByUsuario(idUsuario);
  const hoy = new Date();
  const vencimientoActual = suscripcionActual?.fecha_proximo_vencimiento
    ? new Date(suscripcionActual.fecha_proximo_vencimiento)
    : null;

  // Si todavía no venció, sumamos los días desde esa fecha, para no perder lo que ya tenía pagado
  const base = vencimientoActual && vencimientoActual > hoy ? vencimientoActual : hoy;
  const nuevoVencimiento = sumarDias(base, plan.duracion_dias);

  const suscripcion = await subscriptionsRepository.upsert({
    idUsuario,
    idPlan,
    fechaProximoVencimiento: nuevoVencimiento.toISOString().slice(0, 10),
  });

  // Vinculamos el pago con la suscripción que acaba de pagar
  await pool.query('UPDATE pagos SET id_suscripcion = $1 WHERE id = $2', [
    suscripcion.id,
    resultadoPago.payment.id,
  ]);

  return {
    pagoAprobado: true,
    pago: resultadoPago.payment,
    suscripcion,
    mensaje: resultadoPago.message,
  };
}

export default { renovarMembresia };