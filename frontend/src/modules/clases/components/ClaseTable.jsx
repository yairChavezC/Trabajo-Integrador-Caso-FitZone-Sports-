function estadoLabel(inscripcion) {
  if (!inscripcion) return 'Sin inscripción';
  if (inscripcion.estado === 'confirmado') {
    return inscripcion.fechaExpiracionOferta
      ? 'Cupo confirmado desde la lista de espera'
      : 'Reserva confirmada';
  }
  if (inscripcion.estado === 'en espera') return 'En lista de espera';
  if (inscripcion.estado === 'notificado') return 'Cupo liberado';
  return inscripcion.estado;
}

const horasHastaInicio = (fechaInicio) =>
  (new Date(fechaInicio).getTime() - Date.now()) / (1000 * 60 * 60);

const formatoFecha = (fecha) =>
  new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(fecha));

export default function ClaseTable({
  clases,
  onDelete,
  onEdit,
  onReservar,
  onCancelar,
  onListaEspera,
  modoAdministracion = false
}) {
  const clasesVisibles = modoAdministracion
    ? clases
    : clases.filter((clase) => new Date(clase.fechaInicio).getTime() >= Date.now());

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
        const horasRestantes = horasHastaInicio(clase.fechaInicio);
        const reservaHabilitada = horasRestantes >= 48;
        const cancelacionHabilitada = horasRestantes >= 2;

        return (
          <article key={clase.id} className="clase-card">
            <span className="clase-chip">Clase grupal</span>
            <h3>{clase.nombre}</h3>
            <p><strong>Instructor:</strong> {clase.profesor}</p>
            <p>
              <strong>Horario:</strong> {formatoFecha(clase.fechaInicio)} —{' '}
              {new Intl.DateTimeFormat('es-AR', { timeStyle: 'short' }).format(
                new Date(clase.fechaFin)
              )}
            </p>
            <p><strong>Lugares:</strong> {clase.cupoDisponible ?? clase.cupo} disponibles de {clase.cupo}</p>
            {!modoAdministracion && <p className="clase-estado">{estadoLabel(mia)}</p>}
            <div className="clase-actions">
              {!modoAdministracion && !mia && !llena && (
                <button
                  type="button"
                  disabled={!reservaHabilitada}
                  title={!reservaHabilitada ? 'La reserva cierra 48 h antes del inicio.' : undefined}
                  onClick={() => onReservar(clase.id)}
                >
                  {reservaHabilitada ? 'Reservar lugar' : 'Reserva cerrada (menos de 48 h)'}
                </button>
              )}
              {!modoAdministracion && !mia && llena && (
                <button
                  type="button"
                  disabled={!reservaHabilitada}
                  title={!reservaHabilitada ? 'La lista de espera cierra 48 h antes del inicio.' : undefined}
                  onClick={() => onListaEspera(clase.id)}
                >
                  {reservaHabilitada ? 'Sumarme a la lista de espera' : 'Lista de espera cerrada'}
                </button>
              )}
              {!modoAdministracion && mia && mia.estado !== 'notificado' && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={!cancelacionHabilitada}
                  title={!cancelacionHabilitada ? 'La cancelación cierra 2 h antes del inicio.' : undefined}
                  onClick={() => onCancelar(clase.id)}
                >
                  {cancelacionHabilitada ? 'Cancelar inscripción' : 'Cancelación cerrada (menos de 2 h)'}
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
