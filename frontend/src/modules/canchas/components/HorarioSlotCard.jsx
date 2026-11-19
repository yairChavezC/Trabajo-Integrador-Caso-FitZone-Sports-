import React from 'react';
import './HorarioSlotCard.css';

const estrategiaTurnoPasado = {
  textoBoton: 'No disponible',
  disabled: true,
  claseEstado: 'slot-ocupado',
  puedeReservar: false,
};

const estrategiaTurnoOcupado = {
  textoBoton: 'Ocupado',
  disabled: true,
  claseEstado: 'slot-ocupado',
  puedeReservar: false,
};

const estrategiaTurnoDisponible = {
  textoBoton: 'Reservar',
  disabled: false,
  claseEstado: '',
  puedeReservar: true,
};

const resolverEstrategiaSlot = (slot) => {
  if (slot.esTurnoPasado) return estrategiaTurnoPasado;
  if (slot.estaOcupado) return estrategiaTurnoOcupado;
  return estrategiaTurnoDisponible;
};

export function HorarioSlotCard({ slot, onReservar }) {
  const precioBase = Number(slot.precioBase ?? slot.precio_base ?? slot.precio ?? 0);
  const precioFinal =
    slot.precioFinal !== undefined
      ? Number(slot.precioFinal)
      : slot.precioSocio
      ? Number(slot.precioSocio)
      : Math.round(precioBase * 0.85);

  const estrategia = resolverEstrategiaSlot(slot);

  const handleClick = () => {
    if (estrategia.puedeReservar) {
      onReservar?.(slot);
    }
  };

  return (
    <div
      className={`slot-row-item ${slot.esPico ? 'slot-pico' : ''} ${
        estrategia.claseEstado
      }`}
    >
      {/* 1. Módulo Horario */}
      <div className="slot-col-horario">
        <div className="slot-hora-badge">
          <span className="slot-hora-icon">🕒</span>
          <span className="slot-rango">
            {slot.inicio} - {slot.fin}
          </span>
        </div>
        {slot.esPico && <span className="slot-badge-pico">PICO</span>}
      </div>

      {/* 2. Bloque Precios */}
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

      {/* 3. Acción */}
      <div className="slot-col-acciones">
        <button
          type="button"
          className="btn-reservar-sm"
          disabled={estrategia.disabled}
          onClick={handleClick}
        >
          {estrategia.textoBoton}
        </button>
      </div>
    </div>
  );
}