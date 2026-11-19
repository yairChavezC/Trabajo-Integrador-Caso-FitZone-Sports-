import { useState, useEffect } from 'react';
import { accesoService } from '../services/accesoService.js';

export const useHistorialSocio = () => {
    const [historial, setHistorial] = useState([]);
    const [canchasReservadas, setCanchasReservadas] = useState([]);
    const [clasesReservadas, setClasesReservadas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingCanchas, setLoadingCanchas] = useState(true);
    const [loadingClases, setLoadingClases] = useState(true);

    useEffect(() => {
        const cargarActividadSocio = async () => {
            try {
                const dataAccesos = await accesoService.obtenerMiHistorial();
                setHistorial(Array.isArray(dataAccesos) ? dataAccesos : []);
            } catch (err) {
                console.error('Error cargando historial:', err);
                setHistorial([]);
            } finally {
                setLoading(false);
            }

            try {
                const dataCanchas = await accesoService.obtenerMisReservasCanchas();
                setCanchasReservadas(dataCanchas);
            } finally {
                setLoadingCanchas(false);
            }

            try {
                const dataClases = await accesoService.obtenerMisInscripcionesClases();
                setClasesReservadas(dataClases);
            } finally {
                setLoadingClases(false);
            }
        };

        cargarActividadSocio();
    }, []);

    return {
        historial,
        canchasReservadas,
        clasesReservadas,
        loading,
        loadingCanchas,
        loadingClases
    };
};