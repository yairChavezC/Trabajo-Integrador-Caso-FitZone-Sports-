import { httpClient } from '../../../core/api/httpClient';

export const getClases = async (incluirPasadas = false) => {
  const query = incluirPasadas ? '?incluirPasadas=true' : '';
  return httpClient.get(`/clases${query}`);
};

export const getRolClases = async () => {
  return httpClient.get('/clases/mi-rol');
};

export const getClaseById = async (id) => {
  return httpClient.get(`/clases/${id}`);
};

export const createClase = async (payload) => {
  return httpClient.post('/clases', payload);
};

export const updateClase = async (id, payload) => {
  return httpClient.put(`/clases/${id}`, payload);
};

export const deleteClase = async (id) => {
  return httpClient.delete(`/clases/${id}`);
};

export const reservarClase = async (id) => {
  return httpClient.post(`/clases/${id}/reservas`);
};

export const cancelarReservaClase = async (id) => {
  return httpClient.delete(`/clases/${id}/reservas`);
};

export const anotarListaEspera = async (id) => {
  return httpClient.post(`/clases/${id}/lista-espera`);
};

export const aceptarOfertaListaEspera = async (id) => {
  return httpClient.post(`/clases/${id}/lista-espera/aceptar`);
};

export const getMisInscripciones = async () => {
  return httpClient.get('/clases/mis-inscripciones');
};

export const getNotificacionesClases = async () => {
  return httpClient.get('/clases/notificaciones');
};

export const marcarNotificacionClaseLeida = async (id) => {
  return httpClient.put(`/clases/notificaciones/${id}/leida`);
};

export const getInscripcionesClase = async (id) => {
  return httpClient.get(`/clases/${id}/inscripciones`);
};
