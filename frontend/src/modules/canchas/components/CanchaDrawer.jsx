import React from 'react';
import './CanchaDrawer.css';
import { HorarioSlotCard } from './HorarioSlotCard';

export function CanchaDrawer({ cancha, fecha, alCerrar, alReservarSlot }) {
  if (!cancha) return null;

  const formatearTipo = (tipoRaw) => {
    if (!tipoRaw || typeof tipoRaw !== 'string') return 'CANCHA';
    return tipoRaw.trim().replace(/\s*[-/]\s*/g, ' • ').toUpperCase();
  };

  const formatearFechaDisplay = (str) => {
    if (!str) return '';
    const partes = str.split('-');
    if (partes.length !== 3) return str;
    const [y, m, d] = partes;
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="drawer-overlay" onClick={alCerrar}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado del Drawer */}
        <div className="drawer-header">
          <div>
            <span className="drawer-badge">{formatearTipo(cancha.tipo)}</span>
            <h3>{cancha.nombre}</h3>
            <p className="drawer-fecha">
              Turnos para: <strong>{formatearFechaDisplay(fecha)}</strong>
            </p>
          </div>
          <button type="button" className="btn-close-drawer" onClick={alCerrar}>✕</button>
        </div>

        {/* Leyenda de colores */}
        <div className="drawer-leyenda">
          <span><span className="dot dot-libre"></span> Libre</span>
          <span><span className="dot dot-pico"></span> Pico</span>
          <span><span className="dot dot-ocupado"></span> Ocupado</span>
        </div>

        {/* Lista de slots */}
        <div className="drawer-slots-container">
          {cancha.slots && cancha.slots.length > 0 ? (
            cancha.slots.map((slot, i) => (
              <HorarioSlotCard 
                key={slot.id || i} 
                slot={slot}
                fecha={fecha}
                onReservar={alReservarSlot} 
              />
            ))
          ) : (
            <p className="drawer-no-slots">No hay horarios configurados para este día.</p>
          )}
        </div>
      </aside>
    </div>
  );
}