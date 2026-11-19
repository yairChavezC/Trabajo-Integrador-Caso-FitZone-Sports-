import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getPlans } from '../services/plansService';
import './NuevoSocioModal.css';

const API_BASE_URL = import.meta.env?.VITE_API_URL || '';

const FORMATO_PRECIO = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// 1. Función para descargar el PDF desde GET /api/pagos/:id/comprobante
async function descargarComprobantePdf(pagoId) {
  if (!pagoId) {
    throw new Error('No se encontró el ID del pago para descargar el comprobante.');
  }

  const tokenAuth = localStorage.getItem('token') || localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}/api/pagos/${pagoId}/comprobante`, {
    method: 'GET',
    headers: {
      ...(tokenAuth ? { Authorization: `Bearer ${tokenAuth}` } : {}),
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'No se pudo descargar el comprobante PDF.');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `comprobante-pago-${pagoId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function RenovarMembresiaModal({ socio, onClose, onRenovado }) {
  const [plans, setPlans] = useState([]);
  const [idPlan, setIdPlan] = useState('');
  const [metodoPago, setMetodoPago] = useState('MERCADOPAGO');
  const [paymentToken, setPaymentToken] = useState('tok_mp_test_ok');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [paying, setPaying] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
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

  const handleMetodoChange = (e) => {
    const nuevoMetodo = e.target.value;
    setMetodoPago(nuevoMetodo);
    if (nuevoMetodo === 'MODO') setPaymentToken('tok_modo_test_ok');
    else if (nuevoMetodo === 'MERCADOPAGO') setPaymentToken('tok_mp_test_ok');
    else setPaymentToken('tok_test_aprobado_123');
  };

  async function handlePagar(e) {
    e.preventDefault();
    setPaying(true);
    setError(null);

    const planSeleccionado = plans.find((p) => String(p.id) === String(idPlan));
    const monto = planSeleccionado ? Number(planSeleccionado.precio) : 0;
    const userId = socio?.id || socio?.id_usuario || 1;
    const idempotencyKey = `ren-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const payload = {
      userId: Number(userId),
      monto,
      moneda: 'ARS',
      metodoPago,
      paymentToken: paymentToken.trim(),
      concepto: `Renovación Membresía - ${planSeleccionado?.nombre || 'Plan'}`,
      idempotencyKey,
    };

    try {
      const tokenAuth = localStorage.getItem('token') || localStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/api/pagos/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenAuth ? { Authorization: `Bearer ${tokenAuth}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'El pago no pudo ser procesado.');
      }

      setResultado(data);
      const pagoId = data.payment?.id || data.data?.id;
      await onRenovado?.(pagoId);
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  }

  const pagoIdAprobado = resultado?.payment?.id || resultado?.data?.id;

  async function handleDescargarPdf() {
    if (!pagoIdAprobado) return;
    setDownloadingPdf(true);
    setError(null);
    try {
      await descargarComprobantePdf(pagoIdAprobado);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingPdf(false);
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

        {!resultado ? (
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

            <label htmlFor="metodo-pago">Método de pago / Pasarela</label>
            <select
              id="metodo-pago"
              value={metodoPago}
              onChange={handleMetodoChange}
              required
            >
              <option value="MERCADOPAGO">Mercado Pago</option>
              <option value="MODO">MODO</option>
              <option value="TARJETA">Tarjeta (Mock / Pasarela genérica)</option>
            </select>

            <label htmlFor="payment-token">Token de pago simulado (Seguridad RNF-02)</label>
            <input
              id="payment-token"
              type="text"
              value={paymentToken}
              onChange={(e) => setPaymentToken(e.target.value)}
              placeholder="Ej: tok_test_aprobado_123"
              required
              autoComplete="off"
            />
            <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '-4px' }}>
              Por seguridad, no se permiten tarjetas en crudo. Utilice un token de pasarela.
            </small>

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
        ) : (
          <div className="nuevo-socio-form">
            <p style={{ color: resultado.success ? '#169768' : '#e34c4c', fontWeight: 600 }}>
              {resultado.success ? '¡Pago aprobado y membresía renovada!' : 'Pago rechazado'}
            </p>
            <p>{resultado.message}</p>
            {pagoIdAprobado && <p>Comprobante de pago #{pagoIdAprobado}</p>}
            {error && <p className="nuevo-socio-error">{error}</p>}

            <div className="nuevo-socio-actions">
              {/* 2. Botón para descargar el comprobante PDF cuando el pago fue aprobado */}
              {resultado.success && pagoIdAprobado && (
                <button
                  type="button"
                  className="nuevo-socio-cancel"
                  onClick={handleDescargarPdf}
                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? 'Descargando PDF...' : 'Descargar Comprobante PDF'}
                </button>
              )}
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