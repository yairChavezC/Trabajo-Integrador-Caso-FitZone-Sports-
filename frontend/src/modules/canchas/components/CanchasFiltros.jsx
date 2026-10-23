import React, { useMemo } from 'react';
import { CustomDatePicker } from './CustomDatePicker';
import './CanchasFiltros.css';

export function CanchasFiltros({
  canchas = [],
  filtroTipo,
  onSelectFiltro,
  fecha,
  onChangeFecha,
}) {
  // 1. Extraer deportes únicos a partir de las canchas recibidas de la BD
  const categorias = useMemo(() => {
    const mapa = new Map();

    canchas.forEach((c) => {
      if (!c.tipo) return;

      // Toma lo que está antes del guión ("Fútbol 5 - Sintético" -> "Fútbol 5")
      const deportePrincipal = c.tipo.split(/\s*-\s*/)[0].trim();
      const clave = deportePrincipal.toUpperCase();

      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          etiqueta: deportePrincipal,
          cantidad: 1,
        });
      } else {
        mapa.get(clave).cantidad += 1;
      }
    });

    return Array.from(mapa.values());
  }, [canchas]);

  return (
    <div className="filtros-topbar">
      {/* Botones dinámicos de deporte */}
      <div className="filtros-deporte">
        {/* Opción TODAS con el conteo general */}
        <button
          type="button"
          className={`btn-pill ${filtroTipo === 'TODAS' ? 'activo' : ''}`}
          onClick={() => onSelectFiltro('TODAS')}
        >
          Todas ({canchas.length})
        </button>

        {/* Píldoras generadas por cada deporte detectado en la sede */}
        {categorias.map((cat) => (
          <button
            key={cat.clave}
            type="button"
            className={`btn-pill ${filtroTipo === cat.clave ? 'activo' : ''}`}
            onClick={() => onSelectFiltro(cat.clave)}
          >
            {cat.etiqueta} ({cat.cantidad})
          </button>
        ))}
      </div>

      {/* Selector de fecha */}
      <div className="filtros-controles">
        <CustomDatePicker fecha={fecha} onChangeFecha={onChangeFecha} />
      </div>
    </div>
  );
}