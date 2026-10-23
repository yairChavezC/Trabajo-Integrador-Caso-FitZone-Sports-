import React, { useState } from 'react';
import './ModalCheckoutReserva.css';

export function ModalCheckoutReserva({
  cancha,
  slot,
  fecha,
  alCerrar,
  alConfirmar,
  cargando
}) {
  const [metodoPago, setMetodoPago] = useState('TARJETA');

  if (!slot || !cancha) return null;

  const precioBase = slot.precioBase || slot.precio || 22000;
  const precioFinal = slot.precioSocio || Math.round(precioBase * 0.85);

  const handleSubmit = (e) => {
    e.preventDefault();
    alConfirmar({ metodoPago, monto: precioFinal });
  };

  return (
    <div className="modal-checkout-overlay" onClick={alCerrar}>
      <div className="modal-checkout-card" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="modal-checkout-header">
          <h3>Confirmar Reserva</h3>
          <button type="button" className="btn-close-modal" onClick={alCerrar} disabled={cargando}>
            ✕
          </button>
        </div>

        {/* Resumen del turno */}
        <div className="modal-checkout-body">
          <div className="resumen-item">
            <span className="resumen-label">Cancha:</span>
            <strong>{cancha.nombre}</strong>
          </div>
          <div className="resumen-item">
            <span className="resumen-label">Fecha:</span>
            <span>{fecha}</span>
          </div>
          <div className="resumen-item">
            <span className="resumen-label">Horario:</span>
            <span>{slot.inicio} - {slot.fin} hs</span>
          </div>

          <hr className="modal-divider" />

          {/* Desglose de precios */}
          <div className="precios-desglose">
            <div className="precio-fila">
              <span>Tarifa Regular:</span>
              <span className="tachado">${precioBase.toLocaleString('es-AR')}</span>
            </div>
            <div className="precio-fila">
              <span>Descuento Socio (15%):</span>
              <span className="descuento-texto">-${(precioBase - precioFinal).toLocaleString('es-AR')}</span>
            </div>
            <div className="precio-fila total">
              <span>Total a pagar:</span>
              <strong className="total-monto">${precioFinal.toLocaleString('es-AR')}</strong>
            </div>
          </div>

          <hr className="modal-divider" />

          {/* Selector de método de pago */}
          <div className="metodo-pago-selector">
            <label className="metodo-label">Forma de Pago:</label>
            <div className="metodo-opciones">
              <label className={`metodo-chip ${metodoPago === 'TARJETA' ? 'activo' : ''}`}>
                <input
                  type="radio"
                  name="metodoPago"
                  value="TARJETA"
                  checked={metodoPago === 'TARJETA'}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  disabled={cargando}
                />
                💳 Tarjeta / Online
              </label>
              <label className={`metodo-chip ${metodoPago === 'RECEPCION' ? 'activo' : ''}`}>
                <input
                  type="radio"
                  name="metodoPago"
                  value="RECEPCION"
                  checked={metodoPago === 'RECEPCION'}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  disabled={cargando}
                />
                🏢 Pagar en Sede
              </label>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="modal-checkout-footer">
          <button
            type="button"
            className="btn-cancelar"
            onClick={alCerrar}
            disabled={cargando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-confirmar"
            onClick={handleSubmit}
            disabled={cargando}
          >
            {cargando ? 'Procesando...' : 'Pagar y Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}