const ROL_RECEPCIONISTA = 1;
const ROL_GERENTE = 4;
const METODOS_PERMITIDOS = ['MERCADOPAGO', 'MODO'];
const CAMPOS_SENSIBLES = ['cardNumber', 'numeroTarjeta', 'numero_tarjeta', 'cvv', 'cvc'];

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  return error;
}

export function createSubscriptionsController(service) {
  async function renovar(req, res, next) {
    try {
      const idUsuario = Number(req.params.idUsuario);
      const idPlan = Number(req.body.idPlan);

      if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        throw httpError('El id de usuario debe ser un número entero positivo', 400);
      }
      if (!Number.isInteger(idPlan) || idPlan <= 0) {
        throw httpError('Debe indicar un plan válido', 400);
      }

      // Socio / cliente externo: solo pueden renovar su propia membresía
      const rol = Number(req.usuario?.rol);
      const esPersonal = rol === ROL_RECEPCIONISTA || rol === ROL_GERENTE;
      if (!esPersonal && Number(req.usuario?.id) !== idUsuario) {
        throw httpError('Solo podés renovar tu propia membresía', 403);
      }

      // RNF-02: nunca datos crudos de tarjeta
      if (CAMPOS_SENSIBLES.some((campo) => req.body[campo] !== undefined)) {
        throw httpError(
          'Por seguridad (RNF-02), no se aceptan datos crudos de tarjeta ni CVV. Envíe un token de pasarela.',
          422
        );
      }

      const metodoPago = String(req.body.metodoPago ?? '').trim().toUpperCase();
      if (!METODOS_PERMITIDOS.includes(metodoPago)) {
        throw httpError('El método de pago debe ser MERCADOPAGO o MODO', 400);
      }
      const paymentToken = String(req.body.paymentToken ?? '').trim();
      if (!paymentToken) {
        throw httpError('Falta el token de pago', 400);
      }
      const idempotencyKey = req.body.idempotencyKey
        ? String(req.body.idempotencyKey).trim()
        : null;

      const resultado = await service.renovarMembresia({
        idUsuario, idPlan, metodoPago, paymentToken, idempotencyKey,
      });
      res.json(resultado);
    } catch (error) { next(error); }
  }

  return { renovar };
}