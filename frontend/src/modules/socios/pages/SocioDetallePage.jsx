import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, ChevronRight, Info, User } from 'lucide-react';
import { getMemberById } from '../services/membersService';
import './SocioDetallePage.css';

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
  const [socio, setSocio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getMemberById(id)
      .then((data) => {
        setSocio(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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
        <Link to="/socios" className="detalle-btn detalle-btn-secondary">
          <ArrowLeft size={15} /> Volver a socios
        </Link>
      </main>
    );
  }

  const estado = getEstado(socio);
  const numeroSocio = `FZ-${String(socio.id).padStart(5, '0')}`;
  const tieneMembresia = Boolean(socio.fechaProximoVencimiento);
  const dias = tieneMembresia ? diasRestantes(socio.fechaProximoVencimiento) : null;

  return (
    <main className="detalle-page">
      <section className="detalle-heading">
        <nav className="detalle-breadcrumb" aria-label="Ruta de navegación">
          <span>Administración</span>
          <ChevronRight size={12} />
          <Link to="/socios">Socios</Link>
          <ChevronRight size={12} />
          <span className="detalle-breadcrumb-current">Detalle del socio</span>
        </nav>

        <div className="detalle-title-row">
          <div>
            <h1>Detalle del socio</h1>
            <p className="detalle-description">
              Consultá la información personal y el estado de su membresía.
            </p>
          </div>
          <Link to="/socios" className="detalle-btn detalle-btn-secondary">
            <ArrowLeft size={15} /> Volver a socios
          </Link>
        </div>
      </section>

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
          <button
            type="button"
            className="detalle-btn detalle-btn-secondary"
            disabled
            title="Próximamente"
          >
            Editar socio
          </button>
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
            <h3 className="detalle-card-title">Actividad reciente</h3>
            <p className="detalle-empty">
              Todavía no hay actividad registrada para este socio.
            </p>
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
              disabled
              title="Próximamente"
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
    </main>
  );
}