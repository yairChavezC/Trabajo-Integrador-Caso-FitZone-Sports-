import { useState, useEffect } from 'react';
import { getMembers } from '../services/membersService';

export function useMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMembers()
      .then(setMembers)
      .catch(() => setError('No se pudo conectar con el backend (todavía no está disponible)'))
      .finally(() => setLoading(false));
  }, []);

  return { members, loading, error };
}