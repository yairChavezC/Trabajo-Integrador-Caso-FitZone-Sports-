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

const TOKEN_POR_METODO = {
  MERCADOPAGO: 'tok_mp_test_ok',
  MODO: 'tok_modo_test_ok',
};

export default function RenovarMembresiaModal({ socio, onClose, onRenovado }) {
  const [plans, setPlans] = useState([]);
  const [idPlan, setIdPlan] = useState('');
  const [metodoPago, setMetodoPago] = useState('MERCADOPAGO');
  const [paymentToken, setPaymentToken] = useState(TOKEN_POR_METODO.MERCADOPAGO);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPlans({ soloActivos: true })
      .then((data) => {
        const lista = Array.isArray(data) ? data : data?.data || [];
        setPlans(lista);
        if (lista.length > 0) setIdPlan(String(lista[0].id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingPlans(false));
  }, []);

  const planSeleccionado = plans.find((p) => String(p.id) === String(idPlan));

  function handleMetodoChange(e) {
    const nuevo = e.target.value;
    setMetodoPago(nuevo);
    setPaymentToken(TOKEN_POR_METODO[nuevo] || '');
  }

  async function handlePagar(e) {
    e.preventDefault();
    if (paying) return;
    setPaying(true);
    setError(null);

    const userId = Number(socio?.id);
    const monto = planSeleccionado ? Number(planSeleccionado.precioFinal ?? planSeleccionado.precio) : 0;

    try {
      const data = await renovarMembresia(userId, {
        idPlan: Number(idPlan),
        userId,
        monto,
        moneda: 'ARS',
        metodoPago,
        paymentToken: paymentToken.trim(),
        concepto: `Renovación Membresía - ${planSeleccionado?.nombre || 'Plan'}`,
        // una clave distinta por intento evita cobros duplicados
        idempotencyKey: `ren-${userId}-${Date.now()}`,
      });

      // Pago rechazado o pendiente: no se renovó, se muestra la alerta en el modal
      if (!data?.pagoAprobado) {
        throw new Error(data?.mensaje || 'El pago no pudo ser procesado.');
      }

      await onRenovado?.({
        pagoId: data.pago?.id ?? null,
        mensaje: data.mensaje || 'Pago aprobado y membresía renovada.',
        suscripcion: data.suscripcion,
      });
      onClose();
    } catch (err) {
      // 400 (seguridad / datos) y 409 (conflicto / duplicado) llegan acá con su mensaje
      setError(err.message || 'Error al procesar el pago.');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="nuevo-socio-overlay">
      <div className="nuevo-socio-modal" role="dialog" aria-modal="true" aria-labelledby="renovar-title">
        <div className="nuevo-socio-header">
          <h2 id="renovar-title">Renovar membresía</h2>
          <button type="button" className="nuevo-socio-close" onClick={onClose} aria-label="Cerrar" disabled={paying}>
            <X size={18} />
          </button>
        </div>

        <form className="nuevo-socio-form" onSubmit={handlePagar}>
          <label htmlFor="plan-elegido">Plan</label>
          {loadingPlans ? (
            <p>Cargando planes...</p>
          ) : (
            <select id="plan-elegido" value={idPlan} onChange={(e) => setIdPlan(e.target.value)} required disabled={paying}>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.nombre} — {FORMATO_PRECIO.format(plan.precioFinal ?? plan.precio)}
                </option>
              ))}
            </select>
          )}

          <label htmlFor="metodo-pago">Método de pago</label>
          <select id="metodo-pago" value={metodoPago} onChange={handleMetodoChange} required disabled={paying}>
            <option value="MERCADOPAGO">Mercado Pago</option>
            <option value="MODO">MODO</option>
          </select>

          <label htmlFor="payment-token">Token de pago simulado (RNF-02)</label>
          <input
            id="payment-token"
            type="text"
            value={paymentToken}
            onChange={(e) => setPaymentToken(e.target.value)}
            placeholder="Ej: tok_mp_test_ok"
            required
            autoComplete="off"
            disabled={paying}
          />
          <small style={{ color: '#666', fontSize: '0.82rem', marginTop: '-4px' }}>
            Por seguridad no se ingresan datos de tarjeta ni CVV: se usa un token de pasarela.
          </small>

          {planSeleccionado && (
            <p style={{ margin: '10px 0 0', fontWeight: 600 }}>
              Total a pagar: {FORMATO_PRECIO.format(planSeleccionado.precioFinal ?? planSeleccionado.precio)}
            </p>
          )}

          {error && (
            <div role="alert" className="nuevo-socio-alert">
              <strong>No se pudo completar el pago.</strong> {error}
            </div>
          )}

          <div className="nuevo-socio-actions">
            <button type="button" className="nuevo-socio-cancel" onClick={onClose} disabled={paying}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={paying || !idPlan}>
              {paying ? 'Procesando pago...' : 'Pagar y renovar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}