import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getPlans, setPlanActivo } from '../services/plansService';
import { esGerente } from '../session';
import PlanFormModal from '../components/PlanFormModal';
import './PlanesPage.css';

const FORMATO_PRECIO = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function capitalizar(texto = '') {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function PlanesPage() {
  const gerente = esGerente();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [planEditando, setPlanEditando] = useState(null);

  // El gerente ve todos los planes; el resto, solo los activos
  const load = useCallback(async () => {
    try {
      const data = await getPlans({ soloActivos: !gerente });
      setPlans(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gerente]);

  useEffect(() => {
    load();
  }, [load]);

  function abrirNuevo() {
    setPlanEditando(null);
    setFormAbierto(true);
  }

  function abrirEdicion(plan) {
    setPlanEditando(plan);
    setFormAbierto(true);
  }

  function cerrarForm() {
    setFormAbierto(false);
    setPlanEditando(null);
  }

  async function handleToggleActivo(plan) {
    if (plan.activo && !window.confirm(`¿Desactivar el plan "${plan.nombre}"?`)) return;

    try {
      await setPlanActivo(plan.id, !plan.activo);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="planes-page">
      <section className="planes-heading">
        <nav className="planes-breadcrumb" aria-label="Ruta de navegación">
          <span>Administración</span>
          <ChevronRight size={12} />
          <Link to="/socios">Socios</Link>
          <ChevronRight size={12} />
          <span className="planes-breadcrumb-current">Planes</span>
        </nav>

        <div className="planes-title-row">
          <div>
            <h1>Planes de membresía</h1>
            <p className="planes-description">
              {gerente
                ? 'Creá, editá y habilitá los planes que se pueden contratar.'
                : 'Planes disponibles para contratar.'}
            </p>
          </div>
          <div className="planes-title-actions">
            <Link to="/socios" className="planes-btn planes-btn-secondary">
              <ArrowLeft size={15} /> Volver a socios
            </Link>
            {gerente && (
              <button type="button" className="planes-btn planes-btn-primary" onClick={abrirNuevo}>
                + Nuevo plan
              </button>
            )}
          </div>
        </div>
      </section>

      {error && <p className="planes-error">{error}</p>}
      {loading && <p className="planes-state">Cargando planes...</p>}

      {!loading && plans.length === 0 && !error && (
        <p className="planes-state">
          Todavía no hay planes cargados.
          {gerente && ' Creá el primero con "+ Nuevo plan".'}
        </p>
      )}

      {!loading && plans.length > 0 && (
        <section className="planes-grid">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`plan-card ${plan.activo ? '' : 'is-inactive'}`}
            >
              <div className="plan-card-top">
                <h2>{plan.nombre}</h2>
                <span className={`plan-status ${plan.activo ? 'is-active' : 'is-inactive'}`}>
                  {plan.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <p className="plan-price">{FORMATO_PRECIO.format(plan.precio)}</p>
              <p className="plan-detail">
                {capitalizar(plan.intervalo)} · {plan.duracionDias} días
              </p>

              {gerente && (
                <div className="plan-actions">
                  <button
                    type="button"
                    className="planes-btn planes-btn-secondary"
                    onClick={() => abrirEdicion(plan)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="planes-btn planes-btn-secondary"
                    onClick={() => handleToggleActivo(plan)}
                  >
                    {plan.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {formAbierto && (
        <PlanFormModal plan={planEditando} onClose={cerrarForm} onSaved={load} />
      )}
    </main>
  );
}