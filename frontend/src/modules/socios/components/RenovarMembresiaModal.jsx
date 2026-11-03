import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getPlans } from '../services/plansService';
import { renovarMembresia } from '../services/membershipsService';
import './NuevoSocioModal.css';

const FORMATO_PRECIO = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function RenovarMembresiaModal({ socio, onClose, onRenovado }) {
  const [plans, setPlans] = useState([]);
  const [idPlan, setIdPlan] = useState('');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    getPlans({ soloActivos: true })
      .then((data) => {
        setPlans(data);
        if (data.length > 0) setIdPlan(String(data[0].id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingPlans(false));
  }, []);

  async function handlePagar(e) {
    e.preventDefault();
    setPaying(true);
    setError(null);
    try {
      const data = await renovarMembresia(socio.id, Number(idPlan));
      setResultado(data);
      if (data.pagoAprobado) {
        await onRenovado();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="nuevo-socio-overlay">
      <div
        className="nuevo-socio-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="renovar-title"
      >
        <div className="nuevo-socio-header">
          <h2 id="renovar-title">Renovar membresía</h2>
          <button type="button" className="nuevo-socio-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {!resultado && (
          <form className="nuevo-socio-form" onSubmit={handlePagar}>
            <label htmlFor="plan-elegido">Plan</label>
            {loadingPlans ? (
              <p>Cargando planes...</p>
            ) : (
              <select
                id="plan-elegido"
                value={idPlan}
                onChange={(e) => setIdPlan(e.target.value)}
                required
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre} — {FORMATO_PRECIO.format(plan.precio)}
                  </option>
                ))}
              </select>
            )}

            {error && <p className="nuevo-socio-error">{error}</p>}

            <div className="nuevo-socio-actions">
              <button type="button" className="nuevo-socio-cancel" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="primary-button" disabled={paying || !idPlan}>
                {paying ? 'Procesando pago...' : 'Pagar y renovar'}
              </button>
            </div>
          </form>
        )}

        {resultado && (
          <div className="nuevo-socio-form">
            <p style={{ color: resultado.pagoAprobado ? '#169768' : '#e34c4c', fontWeight: 600 }}>
              {resultado.pagoAprobado ? 'Pago aprobado' : 'Pago no aprobado'}
            </p>
            <p>{resultado.mensaje}</p>
            <div className="nuevo-socio-actions">
              <button type="button" className="primary-button" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}