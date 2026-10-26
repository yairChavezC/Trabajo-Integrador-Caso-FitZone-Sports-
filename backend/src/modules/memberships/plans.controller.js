import service from './plans.service.js';
import { toCreatePlanDTO, toUpdatePlanDTO, toPlanResponseDTO } from './plans.dto.js';

// GET /plans            -> todos los planes
// GET /plans?activos=true -> solo los habilitados
async function getPlans(req, res, next) {
  try {
    const soloActivos = req.query.activos === 'true';
    const plans = await service.getPlans({ soloActivos });
    res.json(plans.map(toPlanResponseDTO));
  } catch (error) {
    next(error);
  }
}

async function getPlan(req, res, next) {
  try {
    const plan = await service.getPlanById(req.params.id);
    res.json(toPlanResponseDTO(plan));
  } catch (error) {
    next(error);
  }
}

async function createPlan(req, res, next) {
  try {
    const plan = await service.createPlan(toCreatePlanDTO(req.body));
    res.status(201).json(toPlanResponseDTO(plan));
  } catch (error) {
    next(error);
  }
}

async function updatePlan(req, res, next) {
  try {
    const plan = await service.updatePlan(req.params.id, toUpdatePlanDTO(req.body));
    res.json(toPlanResponseDTO(plan));
  } catch (error) {
    next(error);
  }
}

// PATCH /plans/:id/activo con { "activo": true | false }
async function setPlanActivo(req, res, next) {
  try {
    const plan = await service.setPlanActivo(req.params.id, req.body.activo);
    res.json(toPlanResponseDTO(plan));
  } catch (error) {
    next(error);
  }
}

export default { getPlans, getPlan, createPlan, updatePlan, setPlanActivo };