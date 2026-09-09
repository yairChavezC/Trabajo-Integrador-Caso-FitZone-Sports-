import { httpClient } from './httpClient';

export const obtenerSedesApi = async () => {
  const res = await httpClient.get('/sedes');
  return res.data || [];
};

