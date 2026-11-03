import subscriptionsService from './subscriptions.service.js';

async function renovar(req, res, next) {
  try {
    const idUsuario = Number(req.params.idUsuario);
    const idPlan = Number(req.body.idPlan);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      const error = new Error('El id de usuario debe ser un número entero positivo');
      error.status = 400;
      error.statusCode = 400;
      throw error;
    }
    if (!Number.isInteger(idPlan) || idPlan <= 0) {
      const error = new Error('Debe indicar un plan válido');
      error.status = 400;
      error.statusCode = 400;
      throw error;
    }

    const resultado = await subscriptionsService.renovarMembresia({ idUsuario, idPlan });
    res.json(resultado);
  } catch (error) {
    next(error);
  }
}

export default { renovar };