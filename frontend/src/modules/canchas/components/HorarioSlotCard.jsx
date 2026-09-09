import React from 'react';

export function HorarioSlotCard({ slot, onReservar, onExpress }) {
  const precioBase = slot.precioBase || slot.precio_base || 22000;
  const precioFinal = slot.precioSocio || Math.round(precioBase * 0.85);

  return (
    <div className={`slot-row-item ${slot.esPico ? 'slot-pico' : ''}`}>
      {/* 1. Módulo Horario Diferenciado */}
      <div className="slot-col-horario">
        <div className="slot-hora-badge">
          <span className="slot-hora-icon">🕒</span>
          <span className="slot-rango">{slot.inicio} - {slot.fin}</span>
        </div>
        {slot.esPico && <span className="slot-badge-pico">PICO</span>}
      </div>

      {/* 2. Bloque Precios con tachado arriba del precio socio */}
      <div className="slot-col-precio">
        <span className="slot-precio-base-tachado">
          ${precioBase.toLocaleString('es-AR')}
        </span>
        <div className="slot-precio-socio-fila">
          <span className="slot-precio-socio">
            ${precioFinal.toLocaleString('es-AR')}
          </span>
          <span className="slot-descuento-pill">-15% Socio</span>
        </div>
      </div>

      {/* 3. Acciones */}
      <div className="slot-col-acciones">
        <button 
          type="button" 
          className="btn-reservar-sm" 
          onClick={() => onReservar?.(slot)}
        >
          Reservar
        </button>
        <button 
          type="button" 
          className="btn-rayo-sm" 
          title="Reserva Express"
          onClick={() => onExpress?.(slot)}
        >
          ⚡
        </button>
      </div>
    </div>
  );
}