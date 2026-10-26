import { httpClient } from '../../../core/api/httpClient'; 

export const loginRequest = async (credenciales) => {
  return httpClient.post('/auth/login', credenciales);
};