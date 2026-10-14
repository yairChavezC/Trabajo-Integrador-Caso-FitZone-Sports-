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
            
            // Extraemos el payload con múltiples respaldos por si viene anidado o plano
            let payload = res?.data?.data || res?.data || res;
            
            // --- BLINDAJE INTELIGENTE EN EL FRONTEND ---
            // Si el backend no envía el tipo de acción explícitamente, lo deducimos
            if (payload && !payload.tipoAccion) {
                if (payload.fecha_salida || (payload.id_usuario && !payload.autorizado)) {
                    payload = {
                        ...payload,
                        autorizado: true,
                        tipoAccion: 'salida'
                    };
                } else if (payload.autorizado) {
                    payload.tipoAccion = 'ingreso';
                }
            }

            if (payload && payload.autorizado && !payload.tipoAccion) {
                payload.tipoAccion = 'ingreso';
            }

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