import ClaseCard from './ClaseCard';

export default function ClaseTable({
  clases,
  onDelete,
  onEdit,
  onReservar,
  onCancelar,
  onListaEspera,
  onAceptarOferta,
  soloLectura = false,
  modoAdministracion = false,
  isActionPending
}) {
  if (!clases.length) {
    return (
      <p className="clases-empty">
        {modoAdministracion
          ? 'No hay clases para los filtros seleccionados.'
          : 'No encontramos próximas clases para esta sede.'}
      </p>
    );
  }

  return (
    <div className="clases-grid">
      {clases.map((clase) => (
        <ClaseCard
          key={clase.id}
          clase={clase}
          modoAdministracion={modoAdministracion}
          soloLectura={soloLectura}
          onDelete={onDelete}
          onEdit={onEdit}
          onReservar={onReservar}
          onCancelar={onCancelar}
          onListaEspera={onListaEspera}
          onAceptarOferta={onAceptarOferta}
          isActionPending={isActionPending}
        />
      ))}
    </div>
  );
}
