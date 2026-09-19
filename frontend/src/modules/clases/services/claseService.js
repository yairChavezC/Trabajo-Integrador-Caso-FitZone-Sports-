const API_URL = 'http://localhost:3000/api';

const getToken = () => localStorage.getItem('token');

const buildHeaders = (body = null) => {
  const headers = {
    Authorization: `Bearer ${getToken()}`
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

export const getClases = async () => {
  const res = await fetch(`${API_URL}/clases`, {
    method: 'GET',
    headers: buildHeaders()
  });

  if (!res.ok) {
    throw new Error('No se pudieron obtener las clases');
  }

  return res.json();
};

export const getClaseById = async (id) => {
  const res = await fetch(`${API_URL}/clases/${id}`, {
    method: 'GET',
    headers: buildHeaders()
  });

  if (!res.ok) {
    throw new Error('No se pudo obtener la clase');
  }

  return res.json();
};

export const createClase = async (payload) => {
  const res = await fetch(`${API_URL}/clases`, {
    method: 'POST',
    headers: buildHeaders(payload),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error('No se pudo crear la clase');
  }

  return res.json();
};

export const updateClase = async (id, payload) => {
  const res = await fetch(`${API_URL}/clases/${id}`, {
    method: 'PUT',
    headers: buildHeaders(payload),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error('No se pudo actualizar la clase');
  }

  return res.json();
};

export const deleteClase = async (id) => {
  const res = await fetch(`${API_URL}/clases/${id}`, {
    method: 'DELETE',
    headers: buildHeaders()
  });

  if (!res.ok) {
    throw new Error('No se pudo eliminar la clase');
  }

  return res.json();
};