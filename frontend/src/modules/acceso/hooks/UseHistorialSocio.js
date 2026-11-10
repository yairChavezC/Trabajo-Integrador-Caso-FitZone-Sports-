import { useState, useEffect } from 'react';
import { accesoService } from '../services/accesoService.js';

export const useHistorialSocio = () => {
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistorial = async () => {
            try {
                const data = await accesoService.obtenerMiHistorial();
                setHistorial(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error cargando historial:', err);
                setHistorial([]);
            } finally {
                setLoading(false);
            }
        };
        fetchHistorial();
    }, []);

    return { historial, loading };
};