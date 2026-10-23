import React from 'react';
import './HorarioSlotCard.css';

export function HorarioSlotCard({ slot, fecha, onReservar }) {
  const precioBase = Number(slot.precioBase ?? slot.precio_base ?? slot.precio ?? 0);
  const precioFinal = slot.precioSocio ? Number(slot.precioSocio) : Math.round(precioBase * 0.85);

  // Verificación de fecha y hora actual local
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const fechaHoyStr = `${anio}-${mes}-${dia}`;

  const esHoy = fecha === fechaHoyStr;
  const horaActualStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

  // Comprobar si el turno ya caducó en el día de hoy
  const esTurnoPasado = esHoy && Boolean(slot.inicio && slot.inicio <= horaActualStr);
  const estaOcupado = slot.estado?.toLowerCase() !== 'libre';
  const noDisponible = estaOcupado || esTurnoPasado;

  const textoBoton = esTurnoPasado ? 'No disponible' : estaOcupado ? 'Ocupado' : 'Reservar';

  return (
    <div
      className={`slot-row-item ${slot.esPico ? 'slot-pico' : ''} ${
        noDisponible ? 'slot-ocupado' : ''
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

      {/* 3. Acción única (sin reserva express) */}
      <div className="slot-col-acciones">
        <button
          type="button"
          className="btn-reservar-sm"
          disabled={noDisponible}
          onClick={() => onReservar?.(slot)}
        >
          {textoBoton}
        </button>
      </div>
    </div>
  );
}