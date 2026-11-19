import { useState } from 'react';
import { X } from 'lucide-react';
import { updateMember } from '../services/membersService';
import './NuevoSocioModal.css';

export default function EditarSocioModal({ socio, onClose, onUpdated }) {
  const [form, setForm] = useState({
    nombre: socio?.nombre ?? '',
    contacto: socio?.contacto ?? '',
    activo: Boolean(socio?.activo),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'activo' ? value === 'true' : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateMember(socio.id, {
        nombre: form.nombre.trim(),
        contacto: form.contacto.trim(),
        activo: form.activo,
      });
      await onUpdated?.();
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el socio.');
      setSaving(false);
    }
  }

  return (
    <div className="nuevo-socio-overlay">
      <div
        className="nuevo-socio-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-socio-title"
      >
        <div className="nuevo-socio-header">
          <h2 id="editar-socio-title">Editar socio</h2>
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
          <label htmlFor="edit-nombre">Nombre completo</label>
          <input
            id="edit-nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
          />

          <label htmlFor="edit-contacto">Contacto</label>
          <input
            id="edit-contacto"
            name="contacto"
            value={form.contacto}
            onChange={handleChange}
            required
          />

          <label htmlFor="edit-activo">Estado</label>
          <select
            id="edit-activo"
            name="activo"
            value={String(form.activo)}
            onChange={handleChange}
          >
            <option value="true">Activo</option>
            <option value="false">Suspendido</option>
          </select>

          {error && <p className="nuevo-socio-error">{error}</p>}

          <div className="nuevo-socio-actions">
            <button type="button" className="nuevo-socio-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}