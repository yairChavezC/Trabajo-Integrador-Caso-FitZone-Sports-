import { useState } from 'react';
import { X } from 'lucide-react';
import { createMember } from '../services/membersService';
import './NuevoSocioModal.css';

const INITIAL = { nombre: '', dni: '', contacto: '', password: '' };

export default function NuevoSocioModal({ onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createMember({
        nombre: form.nombre.trim(),
        dni: form.dni.trim(),
        contacto: form.contacto.trim(),
        password: form.password,
      });
      await onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="nuevo-socio-overlay">
      <div
        className="nuevo-socio-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nuevo-socio-title"
      >
        <div className="nuevo-socio-header">
          <h2 id="nuevo-socio-title">Nuevo socio</h2>
          <button
            type="button"
            className="nuevo-socio-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form className="nuevo-socio-form" onSubmit={handleSubmit}>
          <label htmlFor="nombre">Nombre completo</label>
          <input id="nombre" name="nombre" value={form.nombre} onChange={handleChange} required />

          <label htmlFor="dni">DNI</label>
          <input
            id="dni"
            name="dni"
            value={form.dni}
            onChange={handleChange}
            inputMode="numeric"
            pattern="[0-9]{7,8}"
            title="El DNI tiene 7 u 8 números, sin puntos"
            required
          />

          <label htmlFor="contacto">Contacto (email o teléfono)</label>
          <input id="contacto" name="contacto" value={form.contacto} onChange={handleChange} required />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            minLength={6}
            required
          />

          {error && <p className="nuevo-socio-error">{error}</p>}

          <div className="nuevo-socio-actions">
            <button type="button" className="nuevo-socio-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar socio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}