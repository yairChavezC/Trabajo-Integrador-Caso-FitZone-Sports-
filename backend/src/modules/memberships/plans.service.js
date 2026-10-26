import repository from './plans.repository.js';

// Duración en días de cada intervalo permitido
const DURACION_POR_INTERVALO = {
  mensual: 30,
  trimestral: 90,
  anual: 365,
};

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  return error;
}

function parseId(id) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw httpError('El id del plan debe ser un número entero positivo', 400);
  }
  return numero;
}

function validarNombreYPrecio({ nombre, precio }) {
  if (!nombre) {
    throw httpError('El nombre del plan es obligatorio', 400);
  }

  const precioNumero = Number(precio);
  const tipoValido = typeof precio === 'number' || typeof precio === 'string';
  if (!tipoValido || !Number.isFinite(precioNumero) || precioNumero <= 0) {
    throw httpError('El precio debe ser un número mayor a 0', 400);
  }

  return { nombre, precio: Math.round(precioNumero * 100) / 100 };
}

async function getPlans(filtros = {}) {
  return repository.findAll(filtros);
}

async function getPlanById(id) {
  const plan = await repository.findById(parseId(id));
  if (!plan) {
    throw httpError('Plan no encontrado', 404);
  }
  return plan;
}

async function createPlan(data) {
  const { nombre, precio } = validarNombreYPrecio(data);

  if (!Object.hasOwn(DURACION_POR_INTERVALO, data.intervalo)) {
    throw httpError('El intervalo debe ser mensual, trimestral o anual', 400);
  }

  return repository.create({
    nombre,
    precio,
    intervalo: data.intervalo,
    duracionDias: DURACION_POR_INTERVALO[data.intervalo],
  });
}

async function updatePlan(id, data) {
  const planId = parseId(id);
  const valores = validarNombreYPrecio(data);

  const plan = await repository.update(planId, valores);
  if (!plan) {
    throw httpError('Plan no encontrado', 404);
  }
  return plan;
}

async function setPlanActivo(id, activo) {
  const planId = parseId(id);

  if (typeof activo !== 'boolean') {
    throw httpError('El campo activo debe ser true o false', 400);
  }

  const plan = await repository.setActivo(planId, activo);
  if (!plan) {
    throw httpError('Plan no encontrado', 404);
  }
  return plan;
}

export default { getPlans, getPlanById, createPlan, updatePlan, setPlanActivo };