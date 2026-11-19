import ClaseCard from './ClaseCard';

export default function ClaseTable({
  clases,
  onDelete,
  onEdit,
  onReservar,
  onCancelar,
  onListaEspera,
  onAceptarOferta,
  modoAdministracion = false,
  isActionPending,
  inscriptosPorClase = {},
  cargandoInscriptosPorClase = {},
  errorInscriptosPorClase = {},
  onLoadInscriptos
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
          onDelete={onDelete}
          onEdit={onEdit}
          onReservar={onReservar}
          onCancelar={onCancelar}
          onListaEspera={onListaEspera}
          onAceptarOferta={onAceptarOferta}
          isActionPending={isActionPending}
          inscriptos={inscriptosPorClase[clase.id]}
          cargandoInscriptos={cargandoInscriptosPorClase[clase.id]}
          errorInscriptos={errorInscriptosPorClase[clase.id]}
          onLoadInscriptos={onLoadInscriptos}
        />
      ))}
    </div>
  );
}
