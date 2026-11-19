import { useCallback, useEffect, useRef, useState } from 'react';
import { useSede } from '../../../shared/context/SedeContext';
import {
  getClases,
  createClase,
  updateClase,
  deleteClase,
  getInscripcionesClase,
  reservarClase,
  cancelarReservaClase,
  anotarListaEspera,
  aceptarOfertaListaEspera
} from '../services/claseService';

const unwrap = (payload) => payload?.data ?? payload;
const toList = (data) => Array.isArray(data) ? data : data?.data ?? [];

const loadClases = async (incluirPasadas, idSede) =>
  toList(await getClases(incluirPasadas, idSede));

export const useClases = (options = {}) => {
  const { incluirPasadas = false } = options;
  const { sedeSeleccionada } = useSede();
  const idSede = Object.hasOwn(options, 'idSede')
    ? options.idSede
    : sedeSeleccionada?.id ?? null;
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [inscriptosPorClase, setInscriptosPorClase] = useState({});
  const [cargandoInscriptosPorClase, setCargandoInscriptosPorClase] = useState({});
  const [errorInscriptosPorClase, setErrorInscriptosPorClase] = useState({});
  const [pendingActions, setPendingActions] = useState({});
  const pendingActionsRef = useRef(new Set());
  const requestIdRef = useRef(0);

  const fetchClases = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const data = await loadClases(incluirPasadas, idSede);
      if (requestId !== requestIdRef.current) return false;

      setClases(data);
      setHasLoaded(true);
      setError(null);
      return true;
    } catch (err) {
      if (requestId === requestIdRef.current) setError(err.message);
      return false;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [incluirPasadas, idSede]);

  /**
   * Decisión de diseño: Sondeo automático (polling) cada 30 segundos.
   * Se realizan dos consultas por vista (clases y notificaciones) para mantener
   * sincronizados en tiempo real el estado de los cupos, reservas y ofertas de lista
   * de espera, garantizando una experiencia fluida sin sobrecargar el servidor.
   */
  useEffect(() => {
    let activo = true;
    const actualizar = () => {
      if (activo) void fetchClases();
    };
    actualizar();
    const intervalId = window.setInterval(actualizar, 30000);

    return () => {
      activo = false;
      requestIdRef.current += 1;
      window.clearInterval(intervalId);
    };
  }, [fetchClases]);

  const cargarInscriptos = useCallback(async (idClase) => {
    const key = String(idClase);
    setCargandoInscriptosPorClase((actuales) => ({ ...actuales, [key]: true }));
    setErrorInscriptosPorClase((actuales) => ({ ...actuales, [key]: null }));

    try {
      const resultado = await getInscripcionesClase(idClase);
      setInscriptosPorClase((actuales) => ({
        ...actuales,
        [key]: toList(resultado)
      }));
    } catch (err) {
      setErrorInscriptosPorClase((actuales) => ({
        ...actuales,
        [key]: err.message
      }));
    } finally {
      setCargandoInscriptosPorClase((actuales) => ({
        ...actuales,
        [key]: false
      }));
    }
  }, []);

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
    clases,
    loading,
    hasLoaded,
    error,
    actionError,
    inscriptosPorClase,
    cargandoInscriptosPorClase,
    errorInscriptosPorClase,
    cargarInscriptos,
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
