import { useState, useEffect, useCallback } from 'react';
import { obtenerDisponibilidadCanchas } from '../services/reservaCanchaService';

export function useCanchasDisponibilidad(idSede, fecha) {
  const [canchas, setCanchas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargarGrilla = useCallback(async () => {
    if (!idSede) return;

    setCargando(true);
    setError(null);
    try {
      const json = await obtenerDisponibilidadCanchas({ idSede, fecha });
      if (json && json.success) {
        setCanchas(json.data || []);
      }
    } catch (err) {
      console.error('Error cargando canchas:', err.message || err);
      setError(err.message || 'Error al obtener disponibilidad');
    } finally {
      setCargando(false);
    }
  }, [idSede, fecha]);

  useEffect(() => {
    cargarGrilla();
  }, [cargarGrilla]);

  return {
    canchas,
    setCanchas,
    cargando,
    error,
    recargar: cargarGrilla,
  };
}