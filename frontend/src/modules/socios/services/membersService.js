import { httpClient } from '../../../core/api/httpClient';
import { ROL_SOCIO } from '../constants';

// Solo trae usuarios con rol "socio"
export async function getMembers() {
  return httpClient.get('/users', { params: { rol: ROL_SOCIO } });
}

export async function getMemberById(id) {
  return httpClient.get(`/users/${id}`);
}

export async function createMember(memberData) {
  return httpClient.post('/users', memberData);
}