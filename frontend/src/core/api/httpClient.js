import axios from 'axios';

// Toma la URL base del entorno (Vite) o usa localhost por defecto
const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:3000/api/';

export const httpClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor de Request: inyecta el token automáticamente antes de cada petición
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Response: simplifica la respuesta y maneja errores globales (ej: 401)
httpClient.interceptors.response.use(
  (response) => {
    // Retorna directamente los datos que envía el backend
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Sesión expirada o token inválido
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('sedeId');
        // Opcional: redirigir a login si no estás en una ruta pública
        // window.location.href = '/login';
      }

      // Propagamos el mensaje exacto que envió el backend en su JSON
      const mensaje = error.response.data?.message || error.response.data?.error || 'Error en la petición';
      return Promise.reject(new Error(mensaje));
    }

    if (error.request) {
      return Promise.reject(new Error('No se pudo conectar con el servidor. Revisa tu conexión.'));
    }

    return Promise.reject(error);
  }
);