import { useState } from 'react';
import { X } from 'lucide-react';
import { createPlan, updatePlan } from '../services/plansService';
import './NuevoSocioModal.css';

const INTERVALOS = [
  { valor: 'mensual', etiqueta: 'Mensual (30 días)' },
  { valor: 'trimestral', etiqueta: 'Trimestral (90 días)' },
  { valor: 'anual', etiqueta: 'Anual (365 días)' },
];

export default function PlanFormModal({ plan, onClose, onSaved }) {
  const editando = Boolean(plan);
  const [form, setForm] = useState({
    nombre: plan?.nombre ?? '',
    precio: plan?.precio ?? '',
    intervalo: plan?.intervalo ?? 'mensual',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const datos = { nombre: form.nombre.trim(), precio: Number(form.precio) };

    try {
      if (editando) {
        await updatePlan(plan.id, datos);
      } else {
        await createPlan({ ...datos, intervalo: form.intervalo });
      }
      await onSaved();
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
        aria-labelledby="plan-form-title"
      >
        <div className="nuevo-socio-header">
          <h2 id="plan-form-title">{editando ? 'Editar plan' : 'Nuevo plan'}</h2>
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
          <label htmlFor="plan-nombre">Nombre del plan</label>
          <input
            id="plan-nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
          />

          <label htmlFor="plan-precio">Precio (ARS)</label>
          <input
            id="plan-precio"
            name="precio"
            type="number"
            min="1"
            step="0.01"
            value={form.precio}
            onChange={handleChange}
            required
          />

          <label htmlFor="plan-intervalo">Duración</label>
          <select
            id="plan-intervalo"
            name="intervalo"
            value={form.intervalo}
            onChange={handleChange}
            disabled={editando}
            title={editando ? 'La duración no se puede cambiar en un plan existente' : undefined}
          >
            {INTERVALOS.map((intervalo) => (
              <option key={intervalo.valor} value={intervalo.valor}>
                {intervalo.etiqueta}
              </option>
            ))}
          </select>

          {error && <p className="nuevo-socio-error">{error}</p>}

          <div className="nuevo-socio-actions">
            <button type="button" className="nuevo-socio-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="planes-btn planes-btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}