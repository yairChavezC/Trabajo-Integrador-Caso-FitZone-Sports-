import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, ChevronRight, Download, Info, Receipt, User } from 'lucide-react';
import { httpClient } from '../../../core/api/httpClient';
import { getMemberById, getMemberPagos } from '../services/membersService';
import { esSocioOExterno } from '../session';
import RenovarMembresiaModal from '../components/RenovarMembresiaModal';
import EditarSocioModal from '../components/EditarSocioModal';
import './SocioDetallePage.css';

const FORMATO_PRECIO = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const ESTADO_PAGO = {
  APROBADO: { texto: 'Aprobado', clase: 'is-active' },
  RECHAZADO: { texto: 'Rechazado', clase: 'is-expired' },
  PENDIENTE: { texto: 'Pendiente', clase: 'is-suspended' },
};

async function descargarComprobantePdf(pagoId) {
  if (!pagoId) {
    throw new Error('No se encontró el identificador del pago para descargar el comprobante.');
  }

  const blobData = await httpClient.get(`/payments/${pagoId}/comprobante`, {
    responseType: 'blob',
  });

  const blob = blobData instanceof Blob ? blobData : new Blob([blobData], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `comprobante-${pagoId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function formatFecha(valor, timeZone) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  });
}

function diasRestantes(valor) {
  const hoy = new Date();
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const vence = new Date(valor);
  const venceUTC = Date.UTC(vence.getUTCFullYear(), vence.getUTCMonth(), vence.getUTCDate());
  return Math.round((venceUTC - hoyUTC) / 86400000);
}

function textoDias(dias) {
  if (dias > 1) return `${dias} días restantes`;
  if (dias === 1) return '1 día restante';
  if (dias === 0) return 'Vence hoy';
  if (dias === -1) return 'Venció ayer';
  return `Venció hace ${Math.abs(dias)} días`;
}

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
}

function getEstado(socio) {
  if (!socio.activo) return { texto: 'Suspendido', clase: 'is-suspended' };
  if (socio.enMora) return { texto: 'Vencido', clase: 'is-expired' };
  return { texto: 'Activo', clase: 'is-active' };
}

export default function SocioDetallePage() {
  const { id } = useParams();
  const restringido = esSocioOExterno();
  const [socio, setSocio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRenovar, setShowRenovar] = useState(false);
  const [showEditar, setShowEditar] = useState(false);

  const [ultimoPagoId, setUltimoPagoId] = useState(null);
  const [mensajePago, setMensajePago] = useState(null);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [errorComprobante, setErrorComprobante] = useState(null);

  const [pagos, setPagos] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(true);
  const [errorPagos, setErrorPagos] = useState(null);

  const cargarSocio = useCallback(() => {
    return getMemberById(id)
      .then((data) => {
        setSocio(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const cargarPagos = useCallback(() => {
    setLoadingPagos(true);
    return getMemberPagos(id)
      .then((data) => {
        setPagos(data);
        setErrorPagos(null);
      })
      .catch((err) => setErrorPagos(err.message))
      .finally(() => setLoadingPagos(false));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    cargarSocio();
    cargarPagos();
  }, [cargarSocio, cargarPagos]);

  if (loading) {
    return (
      <main className="detalle-page">
        <p className="detalle-state">Cargando socio...</p>
      </main>
    );
  }

  if (error || !socio) {
    return (
      <main className="detalle-page">
        <p className="detalle-state detalle-state-error">
          {error || 'No se encontró al socio.'}
        </p>
        {!restringido && (
          <Link to="/socios" className="detalle-btn detalle-btn-secondary">
            <ArrowLeft size={15} /> Volver a socios
          </Link>
        )}
      </main>
    );
  }

  const estado = getEstado(socio);
  const numeroSocio = `FZ-${String(socio.id).padStart(5, '0')}`;
  const tieneMembresia = Boolean(socio.fechaProximoVencimiento);
  const dias = tieneMembresia ? diasRestantes(socio.fechaProximoVencimiento) : null;

  async function handleRenovado(resultadoPago) {
    if (resultadoPago?.pagoId) {
      setUltimoPagoId(resultadoPago.pagoId);
    }
    setMensajePago(
      resultadoPago?.mensaje || 'Pago aprobado y membresía renovada correctamente.'
    );
    setErrorComprobante(null);
    await cargarSocio();
    await cargarPagos();
  }

  async function handleDescargarComprobante(pagoId) {
    setDescargandoPdf(true);
    setErrorComprobante(null);
    try {
      await descargarComprobantePdf(pagoId);
    } catch (err) {
      setErrorComprobante(err.message || 'No se pudo descargar el comprobante PDF.');
    } finally {
      setDescargandoPdf(false);
    }
  }

  return (
    <main className="detalle-page">
      <section className="detalle-heading">
        <nav className="detalle-breadcrumb" aria-label="Ruta de navegación">
          <span>Administración</span>
          <ChevronRight size={12} />
          {!restringido ? (
            <>
              <Link to="/socios">Socios</Link>
              <ChevronRight size={12} />
            </>
          ) : null}
          <span className="detalle-breadcrumb-current">Detalle del socio</span>
        </nav>

        <div className="detalle-title-row">
          <div>
            <h1>Detalle del socio</h1>
            <p className="detalle-description">
              Consultá la información personal y el estado de su membresía.
            </p>
          </div>
          {!restringido && (
            <Link to="/socios" className="detalle-btn detalle-btn-secondary">
              <ArrowLeft size={15} /> Volver a socios
            </Link>
          )}
        </div>
      </section>

      {mensajePago && (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: '#eaf7f0',
            color: '#169768',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span>
            {mensajePago} {ultimoPagoId ? `(Pago #${ultimoPagoId})` : ''}
          </span>
          {ultimoPagoId && (
            <button
              type="button"
              className="detalle-btn detalle-btn-secondary"
              onClick={() => handleDescargarComprobante(ultimoPagoId)}
              disabled={descargandoPdf}
            >
              <Download size={14} />
              {descargandoPdf ? 'Descargando PDF...' : 'Descargar comprobante PDF'}
            </button>
          )}
        </div>
      )}

      {errorComprobante && (
        <p className="detalle-state-error" role="alert">
          {errorComprobante}
        </p>
      )}

      <section className="detalle-profile">
        <span className="detalle-avatar">{iniciales(socio.nombre)}</span>
        <div className="detalle-profile-info">
          <h2>{socio.nombre}</h2>
          <p>
            Socio {numeroSocio} · Desde el {formatFecha(socio.creadoAt)}
          </p>
        </div>
        <div className="detalle-profile-actions">
          <span className={`detalle-status ${estado.clase}`}>{estado.texto}</span>
          {!restringido && (
            <button
              type="button"
              className="detalle-btn detalle-btn-secondary"
              onClick={() => setShowEditar(true)}
            >
              Editar socio
            </button>
          )}
        </div>
      </section>

      <div className="detalle-grid">
        <div className="detalle-column">
          <section className="detalle-card">
            <h3 className="detalle-card-title">
              <User size={16} /> Datos personales
            </h3>
            <dl className="detalle-data">
              <div>
                <dt>Nombre completo</dt>
                <dd>{socio.nombre}</dd>
              </div>
              <div>
                <dt>DNI</dt>
                <dd>{socio.dni}</dd>
              </div>
              <div>
                <dt>Contacto</dt>
                <dd>{socio.contacto}</dd>
              </div>
              <div>
                <dt>Fecha de alta</dt>
                <dd>{formatFecha(socio.creadoAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="detalle-card">
            <h3 className="detalle-card-title">
              <Receipt size={16} /> Historial de pagos
            </h3>

            {loadingPagos && <p className="detalle-empty">Cargando pagos...</p>}
            {errorPagos && <p className="detalle-empty">{errorPagos}</p>}

            {!loadingPagos && !errorPagos && pagos.length === 0 && (
              <p className="detalle-empty">Este socio todavía no registra pagos.</p>
            )}

            {!loadingPagos && !errorPagos && pagos.length > 0 && (
              <ul className="detalle-pagos">
                {pagos.map((pago) => {
                  const estadoPago = ESTADO_PAGO[pago.estado] || {
                    texto: pago.estado,
                    clase: 'is-suspended',
                  };
                  return (
                    <li key={pago.id} className="detalle-pago-item">
                      <div>
                        <strong>{FORMATO_PRECIO.format(pago.monto)}</strong>
                        <span className="detalle-pago-meta">
                          {formatFecha(pago.fechaPago)} · {pago.medioPago}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`detalle-status ${estadoPago.clase}`}>
                          {estadoPago.texto}
                        </span>
                        {pago.estado === 'APROBADO' && (
                          <button
                            type="button"
                            className="detalle-btn detalle-btn-secondary"
                            onClick={() => handleDescargarComprobante(pago.id)}
                            disabled={descargandoPdf}
                            title="Descargar comprobante PDF"
                          >
                            <Download size={14} /> PDF
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="detalle-column">
          <section className="detalle-card">
            <h3 className="detalle-card-title">
              <BadgeCheck size={16} /> Membresía
            </h3>

            {tieneMembresia ? (
              <>
                <div className="detalle-expiry">
                  <span className="detalle-expiry-label">Fecha de vencimiento</span>
                  <strong>{formatFecha(socio.fechaProximoVencimiento, 'UTC')}</strong>
                  <span className="detalle-expiry-days">{textoDias(dias)}</span>
                </div>
                <p className={`detalle-standing ${socio.enMora ? 'is-expired' : 'is-active'}`}>
                  {socio.enMora ? 'Cuota vencida' : 'Al día'}
                </p>
              </>
            ) : (
              <p className="detalle-empty">
                Este socio todavía no tiene una membresía cargada.
              </p>
            )}

            <button
              type="button"
              className="detalle-btn detalle-btn-primary"
              onClick={() => setShowRenovar(true)}
            >
              Renovar membresía
            </button>

            <p className="detalle-note">
              <Info size={14} />
              La membresía permite el acceso a la sede y la reserva de clases hasta su
              vencimiento.
            </p>
          </section>
        </aside>
      </div>

      {showRenovar && (
        <RenovarMembresiaModal
          socio={socio}
          onClose={() => setShowRenovar(false)}
          onRenovado={handleRenovado}
        />
      )}

      {showEditar && !restringido && (
        <EditarSocioModal
          socio={socio}
          onClose={() => setShowEditar(false)}
          onUpdated={async () => {
            await cargarSocio();
            setUltimoPagoId(null);
            setMensajePago('Socio actualizado correctamente.');
          }}
        />
      )}
    </main>
  );
}