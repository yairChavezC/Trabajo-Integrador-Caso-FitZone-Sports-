import { useCallback, useEffect, useState } from 'react';
import { useSede } from '../../../shared/context/SedeContext';
import {
  getClases,
  createClase,
  updateClase,
  deleteClase,
  reservarClase,
  cancelarReservaClase,
  anotarListaEspera
} from '../services/claseService';

const unwrap = (payload) => payload?.data ?? payload;

export const useClases = () => {
  const { sedeSeleccionada } = useSede();
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchClases = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getClases();
      const lista = Array.isArray(data) ? data : data.data ?? [];
      setClases(lista);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClases();
  }, [fetchClases]);

  const clasesDeSede = sedeSeleccionada
    ? clases.filter((clase) => Number(clase.idSede) === Number(sedeSeleccionada.id))
    : clases;

  const addClase = async (payload) => {
    const created = unwrap(await createClase(payload));
    await fetchClases();
    return created;
  };

  const editClase = async (id, payload) => {
    const result = unwrap(await updateClase(id, payload));
    await fetchClases();
    return result;
  };

  const removeClase = async (id) => {
    await deleteClase(id);
    await fetchClases();
  };

  const runSocioAction = async (action) => {
    try {
      setActionError(null);
      await action();
      await fetchClases();
    } catch (err) {
      setActionError(err.message);
      throw err;
    }
  };

  const reservar = (id) => runSocioAction(() => reservarClase(id));
  const cancelar = (id) => runSocioAction(() => cancelarReservaClase(id));
  const listaEspera = (id) => runSocioAction(() => anotarListaEspera(id));

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
    listaEspera
  };
};
