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
const toList = (data) => Array.isArray(data) ? data : data?.data ?? [];

const loadClases = async () => toList(await getClases());
const loadNotificaciones = async () => toList(await getNotificacionesClases());

export const useClases = () => {
  const { sedeSeleccionada } = useSede();
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificationError, setNotificationError] = useState(null);

  const fetchClases = useCallback(async () => {
    try {
      setLoading(true);
      setClases(await loadClases());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotificaciones = useCallback(async () => {
    try {
      setNotificaciones(await loadNotificaciones());
      setNotificationError(null);
    } catch (err) {
      setNotificationError(err.message);
    }
  }, []);

  useEffect(() => {
    let desmontado = false;
    const cargar = async () => {
      try {
        const data = await loadClases();
        if (desmontado) return;
        setClases(data);
        setError(null);
      } catch (err) {
        if (!desmontado) setError(err.message);
      } finally {
        if (!desmontado) setLoading(false);
      }
    };

    void cargar();
    return () => {
      desmontado = true;
    };
  }, []);

  useEffect(() => {
    let desmontado = false;
    const cargar = async () => {
      try {
        const data = await loadNotificaciones();
        if (desmontado) return;
        setNotificaciones(data);
        setNotificationError(null);
      } catch (err) {
        if (!desmontado) setNotificationError(err.message);
      }
    };

    void cargar();
    const intervalId = window.setInterval(() => {
      void cargar();
    }, 30000);

    return () => {
      desmontado = true;
      window.clearInterval(intervalId);
    };
  }, []);

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
