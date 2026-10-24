import { useState, useEffect } from 'react';
import { httpClient } from '../../../core/api/httpClient.js';

export const useHistorialSocio = () => {
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistorial = async () => {
            try {
                const response = await httpClient.get('/accesses/me/historial');
                setHistorial(response?.data?.data || response?.data || []);
            } catch (err) {
                console.error('Error cargando historial', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistorial();
    }, []);

    return { historial, loading };
};