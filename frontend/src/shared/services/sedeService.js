import { httpClient } from '../../core/api/httpClient';

const STORAGE_SEDES_KEY = 'fitzone_sedes_offline';

export const obtenerSedesApi = async () => {
  try {
    const res = await httpClient.get('/sedes');
    const sedes = res.data || [];
    if (Array.isArray(sedes) && sedes.length > 0) {
      localStorage.setItem(STORAGE_SEDES_KEY, JSON.stringify(sedes));
    }
    return sedes;
  } catch (error) {
    const sedesRespaldo = localStorage.getItem(STORAGE_SEDES_KEY);
    if (sedesRespaldo) {
      return JSON.parse(sedesRespaldo);
    }
    throw error;
  }
};