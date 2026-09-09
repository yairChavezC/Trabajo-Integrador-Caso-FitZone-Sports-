import { httpClient } from '../../../core/api/httpClient'; 

export const loginRequest = async (credenciales) => {
  try {
    const data = await httpClient.post('/auth/login', credenciales);
    return data;
  } catch (error) {
    const mensaje = error.response?.data?.error || 'Error al intentar iniciar sesión';
    throw new Error(mensaje);
  }
};