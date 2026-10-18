import { useCallback, useEffect, useState } from 'react';
import { useSede } from '../../../shared/context/SedeContext';
import {
  getClases,
  createClase,
  updateClase,
  deleteClase,
  reservarClase,
  cancelarReservaClase,
  anotarListaEspera,
  getNotificacionesClases,
  marcarNotificacionClaseLeida
} from '../services/claseService';

const unwrap = (payload) => payload?.data ?? payload;

export const useClases = () => {
  const { sedeSeleccionada } = useSede();
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificationError, setNotificationError] = useState(null);

  const fetchClases = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      const data = await getClases();
      const lista = Array.isArray(data) ? data : data.data ?? [];

      setClases(lista);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const fetchNotificaciones = useCallback(async () => {
    try {
      const data = await getNotificacionesClases();
      setNotificaciones(Array.isArray(data) ? data : data.data ?? []);
      setNotificationError(null);
    } catch (err) {
      setNotificationError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchClases();
  }, [fetchClases]);

  useEffect(() => {
    fetchNotificaciones();
    const intervalId = window.setInterval(() => {
      fetchNotificaciones();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [fetchNotificaciones]);

  const clasesDeSede = sedeSeleccionada
    ? clases.filter((clase) => Number(clase.idSede) === Number(sedeSeleccionada.id))
    : clases;

  const runAction = async (action) => {
    try {
      setActionError(null);
      const result = await action();
      await fetchClases();
      return unwrap(result) ?? true;
    } catch (err) {
      setActionError(err.message);
      return null;
    }
  };

  const addClase = (payload) => runAction(() => createClase(payload));
  const editClase = (id, payload) => runAction(() => updateClase(id, payload));
  const removeClase = (id) => runAction(() => deleteClase(id));
  const reservar = (id) => runAction(() => reservarClase(id));
  const cancelar = (id) => runAction(() => cancelarReservaClase(id));
  const listaEspera = (id) => runAction(() => anotarListaEspera(id));
  const marcarNotificacionLeida = async (id) => {
    try {
      await marcarNotificacionClaseLeida(id);
      await fetchNotificaciones();
    } catch (err) {
      setNotificationError(err.message);
    }
  };

  return {
    clases: clasesDeSede,
    loading,
    error,
    actionError,
    notificaciones,
    notificationError,
    marcarNotificacionLeida,
    fetchClases,
    addClase,
    editClase,
    removeClase,
    reservar,
    cancelar,
    listaEspera
  };
};
