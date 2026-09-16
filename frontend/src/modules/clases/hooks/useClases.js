import { useEffect, useState } from 'react';
import { getClases, createClase, updateClase, deleteClase } from '../services/claseService';

export const useClases = () => {
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClases = async () => {
    try {
      setLoading(true);
      const data = await getClases();
      setClases(Array.isArray(data) ? data : data.data ?? []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClases();
  }, []);

  const addClase = async (payload) => {
    const newClase = await createClase(payload);
    const created = newClase.data ?? newClase;

    setClases((prev) => [...prev, created]);
    return created;
  };

  const editClase = async (id, payload) => {
    const updated = await updateClase(id, payload);
    const result = updated.data ?? updated;

    setClases((prev) =>
      prev.map((clase) => (clase.id === id ? result : clase))
    );

    return result;
  };

  const removeClase = async (id) => {
    await deleteClase(id);
    setClases((prev) => prev.filter((clase) => clase.id !== id));
  };

  return {
    clases,
    loading,
    error,
    fetchClases,
    addClase,
    editClase,
    removeClase
  };
};