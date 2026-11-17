import React, { useState } from 'react';

export const IngresoExternoModal = ({ onClose, onGuardar, loading }) => {
  const [formData, setFormData] = useState({ nombre: '', dni: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onGuardar(formData);
  };

  return (
    <div className="acceso-modal-overlay">
      <div className="acceso-modal-card">
        <h3 className="acceso-modal-title">Registro de Cliente Externo</h3>
        <p className="acceso-modal-desc">
          El cliente externo se registrará en la base de datos pero no sumará al contador de aforo de la sucursal.
        </p>

        <form onSubmit={handleSubmit} className="acceso-modal-form">
          <div>
            <label className="acceso-modal-label">Nombre Completo</label>
            <input
              type="text"
              required
              placeholder="Ej: Juan Pérez"
              className="acceso-modal-input"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
          </div>
          <div>
            <label className="acceso-modal-label">DNI</label>
            <input
              type="number"
              required
              placeholder="Sin puntos ni espacios"
              className="acceso-modal-input"
              value={formData.dni}
              onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
            />
          </div>

          <div className="acceso-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="acceso-btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="acceso-btn-primary"
            >
              {loading ? 'Registrando...' : 'Registrar Ingreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};