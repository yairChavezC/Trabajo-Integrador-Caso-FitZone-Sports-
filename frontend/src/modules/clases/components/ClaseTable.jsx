function estadoLabel(inscripcion) {
  if (!inscripcion) return 'Sin inscripción';
  if (inscripcion.estado === 'confirmado') return 'Reservada';
  if (inscripcion.estado === 'en espera') return 'En lista de espera';
  if (inscripcion.estado === 'notificado') return 'Cupo liberado';
  return inscripcion.estado;
}

export default function ClaseTable({
  clases,
  onDelete,
  onEdit,
  onReservar,
  onCancelar,
  onListaEspera
}) {
  if (!clases.length) {
    return <p className="clases-empty">No hay clases cargadas para esta sede.</p>;
  }

  return (
    <div className="clases-grid">
      {clases.map((clase) => {
        const llena = Number(clase.cupoDisponible) <= 0;
        const mia = clase.miInscripcion;

        return (
          <article key={clase.id} className="clase-card">
            <span className="clase-chip">{clase.nombre}</span>
            <h3>{clase.profesor}</h3>
            <p>
              {new Date(clase.fechaInicio).toLocaleString()} —{' '}
              {new Date(clase.fechaFin).toLocaleTimeString()}
            </p>
            <p>
              Cupo {clase.inscriptosConfirmados ?? 0}/{clase.cupo} · disponibles:{' '}
              {clase.cupoDisponible ?? clase.cupo}
            </p>
            <p className="clase-estado">{estadoLabel(mia)}</p>

            <div className="clase-actions">
              {!mia && !llena && (
                <button type="button" onClick={() => onReservar(clase.id)}>
                  Reservar
                </button>
              )}
              {!mia && llena && (
                <button type="button" onClick={() => onListaEspera(clase.id)}>
                  Lista de espera
                </button>
              )}
              {mia && (
                <button type="button" onClick={() => onCancelar(clase.id)}>
                  Cancelar
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => onEdit(clase)}>
                Editar
              </button>
              <button type="button" className="btn-danger" onClick={() => onDelete(clase.id)}>
                Eliminar
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
