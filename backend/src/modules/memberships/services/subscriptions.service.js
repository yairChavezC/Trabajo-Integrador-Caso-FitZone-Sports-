import { obtenerEstrategiaDePrecio } from '../domain/pricingStrategies.js';
import {
  createSubscriptionSubject,
  auditRenewalObserver,
  welcomeNotificationObserver,
} from '../domain/subscriptionObserver.js';

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

// Agregamos subscriptionSubject como parámetro opcional
export function createSubscriptionsService({
  plansRepository,
  subscriptionsRepository,
  paymentService,
  pool,
  subscriptionSubject,
}) {
  // Inicializamos el subject con los observers base si no viene inyectado desde afuera
  const subject = subscriptionSubject ?? (() => {
    const defaultSubject = createSubscriptionSubject();
    defaultSubject.subscribe(auditRenewalObserver);
    defaultSubject.subscribe(welcomeNotificationObserver);
    return defaultSubject;
  })();

  async function renovarMembresia({ idUsuario, idPlan }) {
    const plan = await plansRepository.findById(idPlan);
    if (!plan || !plan.activo) {
      throw httpError('El plan no existe o no está disponible', 400);
    }

    // Strategy: calculamos el precio final según el tipo de plan
    const tipoPlan = plan.tipo || plan.categoria || 'REGULAR';
    const estrategia = obtenerEstrategiaDePrecio(tipoPlan);
    const precioFinal = Number(estrategia.calcular(Number(plan.precio)));

    const resultadoPago = await paymentService.processPayment({
      userId: idUsuario,
      monto: precioFinal,
      concepto: `Membresía - ${plan.nombre}`,
    });

    if (!resultadoPago.success) {
      return {
        pagoAprobado: false,
        pago: resultadoPago.payment,
        mensaje: resultadoPago.message,
      };
    }

    const suscripcionActual = await subscriptionsRepository.findByUsuario(idUsuario);
    const hoy = new Date();
    const vencimientoActual = suscripcionActual?.fecha_proximo_vencimiento
      ? new Date(suscripcionActual.fecha_proximo_vencimiento)
      : null;

    const base = vencimientoActual && vencimientoActual > hoy ? vencimientoActual : hoy;
    const nuevoVencimiento = sumarDias(base, plan.duracion_dias);

    const suscripcion = await subscriptionsRepository.upsert({
      idUsuario,
      idPlan,
      fechaProximoVencimiento: nuevoVencimiento.toISOString().slice(0, 10),
    });

    await pool.query('UPDATE pagos SET id_suscripcion = $1 WHERE id = $2', [
      suscripcion.id,
      resultadoPago.payment.id,
    ]);

    // Observer: notificamos a todos los suscriptores tras confirmar la renovación
    await subject.notify({
      tipo: 'MEMBRESIA_RENOVADA',
      idUsuario,
      idPlan,
      planNombre: plan.nombre,
      montoPagado: precioFinal,
      fechaProximoVencimiento: suscripcion.fecha_proximo_vencimiento,
    });

    return {
      pagoAprobado: true,
      pago: resultadoPago.payment,
      suscripcion,
      mensaje: resultadoPago.message,
    };
  }

  return { renovarMembresia };
}