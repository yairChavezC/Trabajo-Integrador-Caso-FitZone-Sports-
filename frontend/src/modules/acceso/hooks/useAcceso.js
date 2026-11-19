
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

            // El servicio ya devuelve el resultado del backend.
            // No debemos extraer res.data porque puede contener
            // el registro de acceso de una salida.
            setResultado(res);

            return res;
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
