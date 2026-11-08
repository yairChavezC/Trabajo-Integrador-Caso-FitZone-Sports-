import EstadoBadge from './EstadoBadge';

export default function InscriptosList({ inscriptos }) {
  return (
    <section className="clase-inscriptos" aria-label="Participantes de la clase">
      <h4>Participantes ({inscriptos.length})</h4>
      {inscriptos.length === 0 ? (
        <p>No hay inscriptos aún.</p>
      ) : (
        <ul>
          {inscriptos.map((inscripcion) => (
            <li key={inscripcion.id}>
              <strong>{inscripcion.nombreUsuario || `Usuario #${inscripcion.idUsuario}`}</strong>
              <EstadoBadge estado={inscripcion.estado} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
