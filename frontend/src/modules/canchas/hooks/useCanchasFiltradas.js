import { useState, useMemo } from 'react';

export function useCanchasFiltradas(canchas = [], elementosPorPagina = 3) {
  const [filtroTipo, setFiltroTipo] = useState('TODAS');
  const [paginaActual, setPaginaActual] = useState(1);

  const handleCambiarFiltro = (tipo) => {
    setFiltroTipo(tipo);
    setPaginaActual(1);
  };

  const canchasFiltradas = useMemo(() => {
    return canchas.filter((c) => {
      if (filtroTipo === 'TODAS') return true;
      const deporteCancha = (c.tipo || '').split(/\s*-\s*/)[0].trim().toUpperCase();
      return deporteCancha === filtroTipo;
    });
  }, [canchas, filtroTipo]);

  const totalPaginas = Math.ceil(canchasFiltradas.length / elementosPorPagina) || 1;
  const indiceInicio = (paginaActual - 1) * elementosPorPagina;
  const canchasPaginadas = canchasFiltradas.slice(indiceInicio, indiceInicio + elementosPorPagina);

  return {
    filtroTipo,
    paginaActual,
    totalPaginas,
    canchasFiltradas,
    canchasPaginadas,
    setPaginaActual,
    handleCambiarFiltro,
  };
}