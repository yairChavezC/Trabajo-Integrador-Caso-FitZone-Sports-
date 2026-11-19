import axios from 'axios';

// La URL puede configurarse para despliegues con frontend y API en hosts distintos.
const baseURL = import.meta.env?.VITE_API_BASE_URL || '/api/';

export const httpClient = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // Timeout de 10 segundos
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

// Interceptor de Response: simplifica la respuesta y maneja errores globales
httpClient.interceptors.response.use(
    (response) => {
        // Retorna directamente los datos enviados por el backend
        return response.data;
    },
    (error) => {
        if (error.response) {
            const status = error.response.status;

            if (status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('sedeId');
                localStorage.removeItem('usuario');

                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }

            // Extrae y propaga el mensaje exacto enviado por el backend
            const mensaje = error.response.data?.mensaje || error.response.data?.message || error.response.data?.error || 'Error en la petición';
            return Promise.reject(new Error(mensaje));
        }

        if (error.request) {
            return Promise.reject(new Error('No se pudo conectar con el servidor. Revise su conexión.'));
        }

        return Promise.reject(error);
    }
);