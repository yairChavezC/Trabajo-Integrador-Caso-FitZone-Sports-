import React from 'react';
import './CanchaCard.css';

export function CanchaCard({ cancha, fecha, alSeleccionar }) {
  const formatearTipo = (tipoRaw) => {
    if (!tipoRaw || typeof tipoRaw !== 'string') return 'CANCHA';
    return tipoRaw.trim().replace(/\s*[-/]\s*/g, ' • ').toUpperCase();
  };

  const precioBase = Number(cancha.precio_base ?? cancha.precioBase ?? cancha.precio ?? 0);
  const precioSocio = Math.round(precioBase * 0.85);

  // 1. Obtener fecha y hora actual local
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const fechaHoyStr = `${anio}-${mes}-${dia}`;

  const esHoy = fecha === fechaHoyStr;
  const horaActualStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

  // 2. Filtrar turnos: libres y (si es hoy) que no hayan comenzado aún
  const turnos = cancha.horarios || cancha.slots || [];
  const turnosDisponibles = turnos.filter((t) => {
    if (t.estado !== 'libre') return false;
    if (esHoy && t.inicio) {
      return t.inicio > horaActualStr;
    }
    return true;
  });

  const cantidadLibres = turnosDisponibles.length;
  const proximoTurno = turnosDisponibles[0]?.inicio || null;

  return (
    <div className="cancha-catalog-card" onClick={() => alSeleccionar(cancha)}>
      <div className="card-top-row">
        <span className="card-category-label">
          {formatearTipo(cancha.tipo)}
        </span>
        <span className={`card-badge-disponibilidad ${cantidadLibres > 0 ? 'badge-disponible' : 'badge-completo'}`}>
          <span className="badge-dot">●</span>
          {cantidadLibres > 0 ? `${cantidadLibres} libres` : 'Completo'}
        </span>
      </div>

      <h3 className="card-item-title">{cancha.nombre}</h3>

      <div className="card-price-container">
        <div className="card-price-row">
          <span className="card-price-amount">${precioBase.toLocaleString('es-AR')}</span>
          <span className="card-price-unit">ARS / hora</span>
        </div>
        <div className="card-price-socio">
          <span>Socio Club: <strong>${precioSocio.toLocaleString('es-AR')}</strong></span>
        </div>
      </div>

      {/* Métrica de disponibilidad */}
      <div className="card-info-metrics">
        <div className="metric-item">
          <span className="metric-icon">⏱</span>
          <span className="metric-label">Próximo turno libre:</span>
          <span className="metric-value">{proximoTurno ? `${proximoTurno} hs` : 'Sin turnos'}</span>
        </div>
      </div>

      <button 
        type="button" 
        className={`btn-ver-horarios-card ${cantidadLibres === 0 ? 'btn-sin-cupo' : ''}`}
      >
        {cantidadLibres > 0 ? 'Ver horarios disponibles' : 'Consultar horarios'}
      </button>
    </div>
  );
}