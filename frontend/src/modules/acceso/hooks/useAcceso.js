import { useState } from 'react';
import { accesoService } from '../services/accesoService.js';

export const useAcceso = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [resultado, setResultado] = useState(null); 

    const registrarIngresoUI = async (qrCode, sedeId) => {
        setLoading(true);
        setError(null);
        setResultado(null);

        try {
            const res = await accesoService.registrarEscaneo(qrCode, sedeId);
            const payload = res?.data?.data || res?.data || res;

            setResultado(payload);
            return payload;
        } catch (err) {
            const mensajeError = err.message || "Error al procesar la operación.";
            setError(mensajeError);
            throw err; 
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        resultado,
        registrarIngresoUI
    };
};