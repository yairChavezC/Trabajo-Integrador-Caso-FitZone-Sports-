import React from 'react';
import './CanchaCard.css';

export function CanchaCard({ cancha, alSeleccionar }) {
  const tipoTexto =
    cancha.tipoFormateado ||
    (typeof cancha.tipo === 'string'
      ? cancha.tipo.trim().replace(/\s*[-/]\s*/g, ' • ').toUpperCase()
      : 'CANCHA');

  const precioBase = Number(cancha.precioBase ?? cancha.precio_base ?? cancha.precio ?? 0);
  const precioSocio =
    cancha.precioSocio !== undefined
      ? Number(cancha.precioSocio)
      : Math.round(precioBase * 0.85);

  const cantidadLibres = Number(cancha.cantidadLibres ?? 0);
  const proximoTurno = cancha.proximoTurno || null;

  return (
    <div className="cancha-catalog-card" onClick={() => alSeleccionar(cancha)}>
      <div className="card-top-row">
        <span className="card-category-label">{tipoTexto}</span>
        <span
          className={`card-badge-disponibilidad ${
            cantidadLibres > 0 ? 'badge-disponible' : 'badge-completo'
          }`}
        >
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
          <span>
            Socio Club: <strong>${precioSocio.toLocaleString('es-AR')}</strong>
          </span>
        </div>
      </div>

      {/* Métrica de disponibilidad */}
      <div className="card-info-metrics">
        <div className="metric-item">
          <span className="metric-icon">⏱</span>
          <span className="metric-label">Próximo turno libre:</span>
          <span className="metric-value">
            {proximoTurno ? `${proximoTurno} hs` : 'Sin turnos'}
          </span>
        </div>
      </div>

      <button
        type="button"
        className={`btn-ver-horarios-card ${
          cantidadLibres === 0 ? 'btn-sin-cupo' : ''
        }`}
      >
        {cantidadLibres > 0 ? 'Ver horarios disponibles' : 'Consultar horarios'}
      </button>
    </div>
  );
}