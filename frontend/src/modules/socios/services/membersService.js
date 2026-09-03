import httpClient from '../../../core/api/httpClient';

export async function getMembers() {
  const { data } = await httpClient.get('/socios');
  return data;
}

export async function getMemberById(id) {
  const { data } = await httpClient.get(`/socios/${id}`);
  return data;
}

export async function createMember(memberData) {
  const { data } = await httpClient.post('/socios', memberData);
  return data;
}
