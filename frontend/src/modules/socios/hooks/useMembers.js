import { useState, useEffect, useCallback } from 'react';
import { getMembers } from '../services/membersService';

export function useMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    return getMembers()
      .then((data) => {
        setMembers(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { members, loading, error, reload: load };
}