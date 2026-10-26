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
  aceptarOfertaListaEspera
} from '../services/claseService';

const unwrap = (payload) => payload?.data ?? payload;
const toList = (data) => Array.isArray(data) ? data : data?.data ?? [];

const loadClases = async () => toList(await getClases());

export const useClases = () => {
  const { sedeSeleccionada } = useSede();
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

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
  const aceptarOferta = (id) => runAction(() => aceptarOfertaListaEspera(id));

  return {
    clases: clasesDeSede,
    loading,
    error,
    actionError,
    fetchClases,
    addClase,
    editClase,
    removeClase,
    reservar,
    cancelar,
    listaEspera,
    aceptarOferta
  };
};
