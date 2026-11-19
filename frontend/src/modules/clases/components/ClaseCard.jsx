import { useState } from 'react';
import { estadoLabel, formatoFecha, formatoHora } from '../utils/claseUtils';
import EstadoBadge from './EstadoBadge';
import InscriptosList from './InscriptosList';
import ConfirmDialog from './ConfirmDialog';

export default function ClaseCard({
  clase,
  modoAdministracion,
  onReservar,
  onCancelar,
  onListaEspera,
  onAceptarOferta,
  onDelete,
  onEdit,
  isActionPending,
  inscriptos,
  cargandoInscriptos = false,
  errorInscriptos = null,
  onLoadInscriptos
}) {
  const [mostrarInscriptos, setMostrarInscriptos] = useState(false);
  const [confirmandoCancelacion, setConfirmandoCancelacion] = useState(false);

  const mia = clase.miInscripcion;
  const disponibles = Number(clase.cupoDisponible ?? clase.cupo ?? 0);
  const llena = disponibles <= 0;
  const tieneInscripciones = clase.tieneInscripciones === true;
  const puedeMostrarAcciones = !modoAdministracion;
  const estaPendiente = (accion) => isActionPending?.(accion, clase.id) ?? false;

  const motivoNoPuedeCancelar = mia?.estado === 'confirmado'
    ? 'Las reservas confirmadas requieren al menos 2 horas de anticipación y no se pueden cancelar después del inicio.'
    : 'No se puede cancelar una inscripción después de que comienza la clase.';

  const mensajeCancelacion = mia?.estado === 'confirmado'
    ? 'Las reservas confirmadas se pueden cancelar hasta 2 horas antes del inicio. ¿Querés continuar?'
    : mia?.estado === 'notificado'
      ? '¿Querés rechazar la oferta? El lugar se liberará para otra persona.'
      : '¿Querés salir de la lista de espera? Podés hacerlo antes de que comience la clase.';

  const toggleInscriptos = () => {
    if (mostrarInscriptos && !errorInscriptos) {
      setMostrarInscriptos(false);
      return;
    }

    setMostrarInscriptos(true);
    void onLoadInscriptos?.(clase.id);
  };
  const etiquetaInscriptos = cargandoInscriptos
    ? 'Cargando...'
    : errorInscriptos
      ? 'Reintentar carga'
      : mostrarInscriptos
        ? 'Ocultar inscriptos'
        : 'Ver inscriptos';

  const confirmarCancelacion = () => {
    setConfirmandoCancelacion(true);
  };

  return (
    <>
      <article className="clase-card">
        {/* Fila superior estilo CanchaCard: Sede arriba + Pill de cupos libres */}
        <div className="clase-card-top-row">
          <span className="clase-card-eyebrow">
            {clase.sede || `Sede ${clase.idSede}`}
          </span>
          <span className={`clase-card-badge-cupo ${!llena ? 'badge-disponible' : 'badge-completo'}`}>
            <span className="clase-card-dot">●</span>
            {!llena ? `${disponibles} libres` : 'Completa'}
          </span>
        </div>

        <h3>{clase.nombre}</h3>

        <p className="clase-card-instructor">
          <span>Instructor:</span> <strong>{clase.profesor}</strong>
        </p>

        {/* Bloque de métricas estilo .card-info-metrics */}
        <div className="clase-card-metrics">
          <div className="clase-metric-row">
            <span className="clase-metric-label">🕒 Horario</span>
            <span className="clase-metric-value">
              {formatoFecha(clase.fechaInicio)} — {formatoHora(clase.fechaFin)}
            </span>
          </div>
          <div className="clase-metric-row">
            <span className="clase-metric-label">👥 Cupos</span>
            <span className="clase-metric-value">
              {disponibles} de {clase.cupo} disponibles
            </span>
          </div>
        </div>

        {!modoAdministracion && mia && (
          <div
            className={`clase-mi-inscripcion estado-${mia.estado.replaceAll(' ', '-')}`}
            role="status"
            aria-label="Estado de inscripción"
          >
            <EstadoBadge estado={mia.estado} />
            {mia.estado === 'notificado' ? (
              <p className="clase-inscripcion-detalle">
                Aceptá antes del{' '}
                <time dateTime={mia.fechaExpiracionOferta}>
                  {formatoFecha(mia.fechaExpiracionOferta)}
                </time>
                . Si vence, el lugar se ofrecerá a otra persona.
              </p>
            ) : (
              <p className="clase-inscripcion-detalle">{estadoLabel(mia)}</p>
            )}
          </div>
        )}

        <div className="clase-actions">
          {puedeMostrarAcciones && !mia && !llena && (
            <button
              type="button"
              disabled={!clase.puedeReservar || estaPendiente('reservar')}
              onClick={() => onReservar(clase.id)}
            >
              {estaPendiente('reservar') ? 'Reservando...' : 'Reservar lugar'}
            </button>
          )}
          {puedeMostrarAcciones && !mia && llena && (
            <button
              type="button"
              disabled={!clase.puedeAnotarseListaEspera || estaPendiente('lista-espera')}
              onClick={() => onListaEspera(clase.id)}
            >
              {estaPendiente('lista-espera') ? 'Anotando...' : 'Sumarme a la lista de espera'}
            </button>
          )}
          {puedeMostrarAcciones && mia?.estado === 'notificado' && (
            <button
              type="button"
              disabled={!clase.puedeAceptarOferta || estaPendiente('aceptar-oferta')}
              onClick={() => onAceptarOferta(clase.id)}
            >
              {estaPendiente('aceptar-oferta') ? 'Aceptando...' : 'Aceptar lugar ofrecido'}
            </button>
          )}
          {puedeMostrarAcciones && mia && (
            <button
              type="button"
              className="btn-secondary"
              disabled={!clase.puedeCancelar || estaPendiente('cancelar') || confirmandoCancelacion}
              onClick={confirmarCancelacion}
            >
              {estaPendiente('cancelar')
                ? 'Cancelando...'
                : confirmandoCancelacion
                  ? 'Confirmando...'
                  : mia.estado === 'notificado'
                    ? 'Rechazar lugar ofrecido'
                    : mia.estado === 'en espera'
                      ? 'Salir de la lista de espera'
                      : 'Cancelar reserva'}
            </button>
          )}
          {puedeMostrarAcciones && mia && !clase.puedeCancelar && (
            <p className="clase-action-note" role="note">
              {motivoNoPuedeCancelar}
            </p>
          )}
          {modoAdministracion && (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={toggleInscriptos}
                disabled={cargandoInscriptos}
              >
                {etiquetaInscriptos}
              </button>
              <button type="button" className="btn-secondary" onClick={() => onEdit(clase)}>
                Editar
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => onDelete(clase.id)}
                aria-describedby={tieneInscripciones ? `clase-${clase.id}-delete-note` : undefined}
                disabled={tieneInscripciones || estaPendiente('eliminar')}
              >
                {estaPendiente('eliminar') ? 'Eliminando...' : 'Eliminar'}
              </button>
              {tieneInscripciones && (
                <p id={`clase-${clase.id}-delete-note`} className="clase-delete-note" role="note">
                  No se puede eliminar: esta clase tiene inscripciones y su historial debe conservarse.
                </p>
              )}
            </>
          )}
        </div>

        {modoAdministracion && mostrarInscriptos && errorInscriptos && (
          <p className="clases-alert" role="alert">{errorInscriptos}</p>
        )}
        {modoAdministracion && mostrarInscriptos && !errorInscriptos && Array.isArray(inscriptos) && (
          <InscriptosList inscriptos={inscriptos} />
        )}
      </article>
      <ConfirmDialog
        open={confirmandoCancelacion}
        title="Cancelar inscripción"
        message={mensajeCancelacion}
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={() => {
          onCancelar(clase.id);
          setConfirmandoCancelacion(false);
        }}
        onCancel={() => setConfirmandoCancelacion(false)}
      />
    </>
  );
}