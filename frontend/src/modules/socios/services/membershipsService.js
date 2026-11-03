import { httpClient } from '../../../core/api/httpClient';

export async function renovarMembresia(idUsuario, idPlan) {
  return httpClient.post(`/memberships/${idUsuario}/renovar`, { idPlan });
}