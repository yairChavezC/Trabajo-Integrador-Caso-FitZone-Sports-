import { useCallback, useEffect, useRef, useState } from 'react';
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

const loadClases = async (incluirPasadas) => toList(await getClases(incluirPasadas));

export const useClases = ({ incluirPasadas = false } = {}) => {
  const { sedeSeleccionada } = useSede();
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [pendingActions, setPendingActions] = useState({});
  const pendingActionsRef = useRef(new Set());

  const fetchClases = useCallback(async () => {
    try {
      setClases(await loadClases(incluirPasadas));
      setError(null);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [incluirPasadas]);

  useEffect(() => {
    let desmontado = false;
    const cargar = async () => {
      try {
        const data = await loadClases(incluirPasadas);
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
  }, [incluirPasadas]);

  const clasesDeSede = sedeSeleccionada
    ? clases.filter((clase) => Number(clase.idSede) === Number(sedeSeleccionada.id))
    : clases;

  const runAction = async (nombre, id, action) => {
    const key = `${nombre}:${id}`;
    if (pendingActionsRef.current.has(key)) return null;

    pendingActionsRef.current.add(key);
    setPendingActions((actuales) => ({ ...actuales, [key]: true }));
    try {
      setActionError(null);
      const result = await action();
      await fetchClases();
      return unwrap(result) ?? true;
    } catch (err) {
      setActionError(err.message);
      return null;
    } finally {
      pendingActionsRef.current.delete(key);
      setPendingActions((actuales) => {
        const nuevas = { ...actuales };
        delete nuevas[key];
        return nuevas;
      });
    }
  };

  const isActionPending = useCallback(
    (nombre, id) => Boolean(pendingActions[`${nombre}:${id}`]),
    [pendingActions]
  );
  const addClase = (payload) => runAction('crear', 'nuevo', () => createClase(payload));
  const editClase = (id, payload) => runAction('editar', id, () => updateClase(id, payload));
  const removeClase = (id) => runAction('eliminar', id, () => deleteClase(id));
  const reservar = (id) => runAction('reservar', id, () => reservarClase(id));
  const cancelar = (id) => runAction('cancelar', id, () => cancelarReservaClase(id));
  const listaEspera = (id) => runAction('lista-espera', id, () => anotarListaEspera(id));
  const aceptarOferta = (id) => runAction('aceptar-oferta', id, () => aceptarOfertaListaEspera(id));

  return {
    clases: clasesDeSede,
    loading,
    error,
    actionError,
    fetchClases,
    isActionPending,
    addClase,
    editClase,
    removeClase,
    reservar,
    cancelar,
    listaEspera,
    aceptarOferta
  };
};
