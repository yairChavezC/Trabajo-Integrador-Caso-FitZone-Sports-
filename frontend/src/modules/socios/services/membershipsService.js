import { httpClient } from '../../../core/api/httpClient';

// El backend cobra vía Módulo de Pagos (M5) y recién después extiende la membresía
export async function renovarMembresia(idUsuario, datos) {
  return httpClient.post(`/memberships/${idUsuario}/renovar`, datos);
}