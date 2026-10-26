import { useEffect, useState } from 'react';

function estadoLabel(inscripcion) {
  if (!inscripcion) return null;
  if (inscripcion.estado === 'confirmado') {
    return inscripcion.fechaExpiracionOferta
      ? 'Cupo confirmado desde la lista de espera'
      : 'Reserva confirmada';
  }
  if (inscripcion.estado === 'en espera') return 'En lista de espera';
  if (inscripcion.estado === 'notificado') {
    return `Tenés un lugar ofrecido hasta ${formatoFecha(inscripcion.fechaExpiracionOferta)}`;
  }
  return inscripcion.estado;
}

const horasHastaInicio = (fechaInicio, ahora) =>
  (new Date(fechaInicio).getTime() - ahora) / (1000 * 60 * 60);

const formatoFecha = (fecha) =>
  new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(fecha));

export default function ClaseTable({
  clases,
  onDelete,
  onEdit,
  onReservar,
  onCancelar,
  onListaEspera,
  onAceptarOferta,
  soloLectura = false,
  modoAdministracion = false
}) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setAhora(Date.now()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  const clasesVisibles = modoAdministracion
    ? clases
    : clases.filter((clase) => new Date(clase.fechaInicio).getTime() >= ahora);

  if (!clasesVisibles.length) {
    return (
      <p className="clases-empty">
        {modoAdministracion
          ? 'Todavía no hay clases programadas para esta sede.'
          : 'No encontramos próximas clases para esta sede.'}
      </p>
    );
  }

  return (
    <div className="clases-grid">
      {clasesVisibles.map((clase) => {
        const llena = Number(clase.cupoDisponible) <= 0;
        const mia = clase.miInscripcion;
        const horasRestantes = horasHastaInicio(clase.fechaInicio, ahora);
        const reservaHabilitada = horasRestantes > 0 && horasRestantes <= 48;
        const listaEsperaHabilitada = horasRestantes > 0;
        const cancelacionHabilitada = horasRestantes >= 2;

        return (
          <article key={clase.id} className="clase-card">
            <h3>{clase.nombre}</h3>
            <p><strong>Instructor:</strong> {clase.profesor}</p>
            <p>
              <strong>Horario:</strong> {formatoFecha(clase.fechaInicio)} —{' '}
              {new Intl.DateTimeFormat('es-AR', { timeStyle: 'short' }).format(
                new Date(clase.fechaFin)
              )}
            </p>
            <p><strong>Lugares:</strong> {clase.cupoDisponible ?? clase.cupo} disponibles de {clase.cupo}</p>
            <p><strong>Sede:</strong> {clase.sede || `Sede ${clase.idSede}`}</p>
            {!modoAdministracion && mia && <p className="clase-estado">{estadoLabel(mia)}</p>}
            <div className="clase-actions">
              {!modoAdministracion && !soloLectura && !mia && !llena && (
                <button
                  type="button"
                  disabled={!reservaHabilitada}
                  title={
                    horasRestantes > 48
                      ? 'La reserva se habilita 48 h antes del inicio.'
                      : horasRestantes <= 0
                        ? 'La clase ya comenzó.'
                        : undefined
                  }
                  onClick={() => onReservar(clase.id)}
                >
                  {reservaHabilitada
                    ? 'Reservar lugar'
                    : horasRestantes > 48
                      ? 'Reserva disponible 48 h antes'
                      : 'Clase comenzada'}
                </button>
              )}
              {!modoAdministracion && !soloLectura && !mia && llena && (
                <button
                  type="button"
                  disabled={!listaEsperaHabilitada}
                  title={!listaEsperaHabilitada ? 'La lista de espera se cierra cuando comienza la clase.' : undefined}
                  onClick={() => onListaEspera(clase.id)}
                >
                  {listaEsperaHabilitada ? 'Sumarme a la lista de espera' : 'Clase comenzada'}
                </button>
              )}
              {!modoAdministracion && !soloLectura && mia?.estado === 'notificado' && (
                <button
                  type="button"
                  onClick={() => onAceptarOferta(clase.id)}
                >
                  Aceptar lugar ofrecido
                </button>
              )}
              {!modoAdministracion && !soloLectura && mia && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={!cancelacionHabilitada}
                  title={!cancelacionHabilitada ? 'La cancelación cierra 2 h antes del inicio.' : undefined}
                  onClick={() => onCancelar(clase.id)}
                >
                  {cancelacionHabilitada
                    ? mia.estado === 'notificado'
                      ? 'Rechazar lugar ofrecido'
                      : 'Cancelar inscripción'
                    : 'Cancelación cerrada (menos de 2 h)'}
                </button>
              )}
              {modoAdministracion && (
                <>
                  <button type="button" className="btn-secondary" onClick={() => onEdit(clase)}>
                    Editar
                  </button>
                  <button type="button" className="btn-danger" onClick={() => onDelete(clase.id)}>
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
