import React, { useState, useRef, useEffect } from 'react';
import { useSede } from '../../core/context/SedeContext';
import './SedeSelector.css';

export function SedeSelector() {
  const { sedes, sedeSeleccionada, setSedeSeleccionada, cargando } = useSede();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);

  // Cierra el menú al hacer clic afuera
  useEffect(() => {
    const clickAfuera = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', clickAfuera);
    return () => document.removeEventListener('mousedown', clickAfuera);
  }, []);

  const handleSeleccionar = (sede) => {
    setSedeSeleccionada(sede);
    localStorage.setItem('sedeId', String(sede.id));
    setAbierto(false);
  };

  if (cargando) {
    return (
      <div className="sede-selector-wrapper">
        <div className="sede-trigger">
          <span className="sede-pin">📍</span>
          <span className="sede-texto-cargando">Cargando sedes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sede-selector-wrapper" ref={contenedorRef}>
      <button 
        type="button" 
        className={`sede-trigger ${abierto ? 'abierto' : ''}`}
        onClick={() => setAbierto(!abierto)}
      >
        <span className="sede-pin">📍</span>
        <div className="sede-info">
          <span className="sede-nombre-principal">
            {sedeSeleccionada ? sedeSeleccionada.nombre : 'Seleccionar Sede'}
          </span>
          {sedeSeleccionada && (
            <span className="sede-ciudad-tag">{sedeSeleccionada.ciudad}</span>
          )}
        </div>
        <span className={`sede-chevron ${abierto ? 'rotar' : ''}`}>▾</span>
      </button>

      {abierto && (
        <div className="sede-dropdown-menu">
          <div className="sede-dropdown-header">Sedes Disponibles</div>
          <div className="sede-dropdown-list">
            {sedes.map((s) => {
              const esActiva = sedeSeleccionada?.id === s.id;
              return (
                <button
                  type="button"
                  key={s.id}
                  className={`sede-item ${esActiva ? 'activo' : ''}`}
                  onClick={() => handleSeleccionar(s)}
                >
                  <div className="sede-item-detalle">
                    <span className="sede-item-nombre">{s.nombre}</span>
                    <span className="sede-item-ciudad">{s.ciudad}, {s.provincia}</span>
                  </div>
                  {esActiva && <span className="sede-item-check">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}