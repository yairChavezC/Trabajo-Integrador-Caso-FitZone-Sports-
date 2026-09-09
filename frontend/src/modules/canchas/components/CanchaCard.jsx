import React from 'react';

export function CanchaCard({ cancha, alSeleccionar }) {
  const esFutbol = cancha.tipo?.toUpperCase() === 'FUT';
  // const precio = Number(cancha.precio_base || cancha.precioBase || 0);
  const precioBruto = 
  cancha.precioBase ?? 
  cancha.precio_base ?? 
  cancha.tarifaBase ?? 
  cancha.tarifa_base ?? 
  cancha.precio;

  const precio = Number(precioBruto) || 0;
  return (
    <div className="cancha-catalog-card" onClick={() => alSeleccionar(cancha)}>
      {/* Ceja superior de categoría */}
      <span className="card-category-label">
        {esFutbol ? 'FÚTBOL 5 • SINTÉTICO' : 'PADDLE • BLINDEX PANORÁMICO'}
      </span>

      {/* Nombre */}
      <h3 className="card-item-title">{cancha.nombre}</h3>

      {/* Precio con formato idéntico a membresías */}
      <div className="card-price-row">
        <span className="card-price-amount">${precio.toLocaleString()}</span>
        <span className="card-price-unit">ARS / hora</span>
      </div>

      {/* Lista de características con tildes verdes */}
      <ul className="card-benefits-list">
        <li>
          <span className="check-icon">✔</span>
          <span>All week</span>
        </li>
        <li>
          <span className="check-icon">✔</span>
          <span>Iluminación LED</span>
        </li>
        <li>
          <span className="check-icon">✔</span>
          <span>15% de descuento para socios con cuota al día</span>
        </li>
      </ul>

      

      {/* Botón de acción con el azul de la captura */}
      <button type="button" className="btn-ver-horarios-card">
        Ver horarios disponibles
      </button>
    </div>
  );
}