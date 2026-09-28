import React, { useState, useRef } from 'react';
import { procesarPago } from '../services/paymentService';

export default function PagosScreen() {
  const [monto, setMonto] = useState('');
  const [medioPago, setMedioPago] = useState('tarjeta_mock');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  
  const comprobanteRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResultado(null);

    const token = localStorage.getItem('token') || ''; 

    try {
      const paymentData = {
        amount: Number(monto),
        cardToken: medioPago,
        userId: 1,
        concept: 'Suscripción / Membresía FitZone'
      };

      const res = await procesarPago(paymentData, token);
      
      // Extraemos el objeto del pago que manda tu backend
      const datosRespuesta = res.payment || res.data || res;
      setResultado(datosRespuesta);

      setTimeout(() => {
        comprobanteRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);

    } catch (err) {
      setError('Ocurrió un error de conexión al procesar el pago.');
    } finally {
      setLoading(false);
    }
  }; // <--- ¡Acá estaba faltando cerrar la llave correctamente!

  const handlePrint = () => {
    window.print();
  };

  const obtenerConfigEstado = (estado) => {
    const est = (estado || 'APROBADO').toUpperCase();
    switch (est) {
      case 'RECHAZADO':
        return {
          texto: 'RECHAZADO',
          bg: '#fee2e2',
          color: '#991b1b',
          mensaje: 'El pago no pudo ser procesado por la entidad.'
        };
      case 'PENDIENTE':
        return {
          texto: 'PENDIENTE',
          bg: '#fef3c7',
          color: '#92400e',
          mensaje: 'La operación se encuentra a la espera de acreditación.'
        };
      default:
        return {
          texto: 'APROBADO',
          bg: '#d1fae5',
          color: '#065f46',
          mensaje: 'Operación exitosa.'
        };
    }
  };

  const estadoBackend = resultado?.estado || resultado?.status;
  const configEstado = resultado ? obtenerConfigEstado(estadoBackend) : null;

  return (
    <div style={{ padding: '2rem', maxWidth: '650px', margin: '0 auto', fontFamily: 'inherit' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #comprobante-imprimible, #comprobante-imprimible * { visibility: visible; }
          #comprobante-imprimible {
            position: absolute; left: 0; top: 0; width: 100%;
            border: none !important; box-shadow: none !important;
            margin: 0 !important; padding: 1rem !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print">
        <h2 style={{ color: '#111827', marginBottom: '0.5rem' }}>Módulo de Pagos - FitZone Sports</h2>
        <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>Completá los datos para procesar tu pago.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#ffffff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontWeight: '600', color: '#374151' }}>Monto ($):</label>
            <input 
              type="number" 
              value={monto} 
              onChange={(e) => setMonto(e.target.value)} 
              placeholder="Ej: 5000" 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontWeight: '600', color: '#374151' }}>Medio de Pago:</label>
            <select 
              value={medioPago} 
              onChange={(e) => setMedioPago(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem', background: '#fff', boxSizing: 'border-box' }}
            >
              <option value="tarjeta_mock">Tarjeta de Prueba (Mock)</option>
              <option value="tarjeta_rechazada">Tarjeta Simulada (Rechazada)</option>
              <option value="transferencia_pendiente">Transferencia (Pendiente)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '0.85rem', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            {loading ? 'Procesando pago...' : 'Pagar Ahora'}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', border: '1px solid #f87171' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {resultado && configEstado && (
        <div 
          id="comprobante-imprimible"
          ref={comprobanteRef} 
          style={{ 
            marginTop: '2rem', padding: '2rem', backgroundColor: '#ffffff', 
            borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            maxWidth: '500px', marginInline: 'auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
        >
          <div style={{ textAlign: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', color: '#4f46e5', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.5px' }}>FitZone Sports</h3>
            <p style={{ margin: 0, color: '#374151', fontSize: '1.05rem', fontWeight: 'bold' }}>Comprobante de Operación</p>
            <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.85rem' }}>
              {new Date(resultado.fecha_pago || Date.now()).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'medium' })}
            </p>
          </div>

          <div style={{ textAlign: 'center', margin: '1.5rem 0', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Total abonado</span>
            <span style={{ fontSize: '2rem', fontWeight: '800', color: '#111827' }}>
              ${Number(resultado.monto || monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ backgroundColor: configEstado.bg, color: configEstado.color, padding: '0.2rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                {configEstado.texto}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem', marginBottom: 0 }}>
              {configEstado.mensaje}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', color: '#374151', fontSize: '0.9rem', borderTop: '1px solid #f3f4f6', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Concepto:</span>
              <span style={{ fontWeight: '600', textAlign: 'right' }}>{resultado.concepto || 'Suscripción / Membresía FitZone'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Medio de pago:</span>
              <span style={{ fontWeight: '600', textAlign: 'right' }}>{resultado.medio_pago || medioPago}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Socio:</span>
              <span style={{ fontWeight: '600', textAlign: 'right' }}>Usuario ID: {resultado.id_usuario || '1'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e5e7eb', paddingTop: '0.85rem', marginTop: '0.25rem' }}>
              <span style={{ color: '#6b7280' }}>ID de Transacción:</span>
              <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{resultado.transaccion_externa_id || 'N/A'}</span>
            </div>
          </div>

          <div className="no-print" style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button 
              onClick={handlePrint}
              style={{ width: '100%', padding: '0.75rem', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem', transition: 'background 0.2s' }}
            >
              🖨️ Descargar / Imprimir Comprobante (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}