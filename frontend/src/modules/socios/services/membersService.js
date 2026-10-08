import { httpClient } from '../../../core/api/httpClient';

export async function getMembers() {
  return httpClient.get('/users');
}

export async function getMemberById(id) {
  return httpClient.get(`/users/${id}`);
}

export async function createMember(memberData) {
  return httpClient.post('/users', memberData);
}