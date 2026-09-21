import { useState } from 'react';
import { accesoService } from '../services/accesoService.js';

export const useAcceso = () => {
    // Definimos los tres estados principales que pide la tarea
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [resultado, setResultado] = useState(null); 

    // Esta es la función que va a llamar el botón de la interfaz
    const registrarIngresoUI = async (qrCode, sedeId) => {
        // 1. Reiniciamos los estados y prendemos el "cargando"
        setLoading(true);
        setError(null);
        setResultado(null);

        try {
            // 2. Llamamos al servicio (T06)
            const data = await accesoService.registrarIngreso(qrCode, sedeId);
            
            // 3. Si todo sale bien, guardamos el resultado (que incluye el aforo actual)
            setResultado(data.data); // data.data porque así lo mandamos del backend
            return data.data; 

        } catch (err) {
            // 4. Si el backend rechaza el QR (ej: cuota vencida), guardamos el error
            setError(err);
            throw err; 
        } finally {
            // 5. Pase lo que pase (éxito o error), apagamos el "cargando"
            setLoading(false);
        }
    };

    // Devolvemos los estados y la función para que las pantallas los puedan usar
    return {
        loading,
        error,
        resultado,
        registrarIngresoUI
    };
};