import { httpClient } from '../../../core/api/httpClient';

// soloActivos: true devuelve únicamente los planes habilitados
export async function getPlans({ soloActivos = false } = {}) {
  return httpClient.get('/plans', { params: soloActivos ? { activos: true } : {} });
}

export async function createPlan(plan) {
  return httpClient.post('/plans', plan);
}

// Al editar solo se cambian nombre y precio
export async function updatePlan(id, plan) {
  return httpClient.put(`/plans/${id}`, plan);
}

export async function setPlanActivo(id, activo) {
  return httpClient.patch(`/plans/${id}/activo`, { activo });
}