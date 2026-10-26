import { httpClient } from '../../../core/api/httpClient';
import { PERFILES_LISTADO } from '../constants';

// Trae socios y clientes externos (rol 2 y 3)
export async function getMembers() {
  return httpClient.get('/users', { params: { rol: PERFILES_LISTADO.join(',') } });
}

export async function getMemberById(id) {
  return httpClient.get(`/users/${id}`);
}

export async function createMember(memberData) {
  return httpClient.post('/users', memberData);
}