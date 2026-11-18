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

// Recibe TODAS sus dependencias desde el ensamblador, nada se importa directo acá
export function createSubscriptionsService({ plansRepository, subscriptionsRepository, paymentService, pool }) {
  async function renovarMembresia({ idUsuario, idPlan }) {
    const plan = await plansRepository.findById(idPlan);
    if (!plan || !plan.activo) {
      throw httpError('El plan no existe o no está disponible', 400);
    }

    const resultadoPago = await paymentService.processPayment({
      userId: idUsuario,
      monto: Number(plan.precio),
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

    return {
      pagoAprobado: true,
      pago: resultadoPago.payment,
      suscripcion,
      mensaje: resultadoPago.message,
    };
  }

  return { renovarMembresia };
}