export default function ClaseTable({ clases, onDelete, onEdit }) {
  if (!clases.length) {
    return <p>No hay clases cargadas.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ border: '1px solid #ddd', padding: '8px' }}>Nombre</th>
          <th style={{ border: '1px solid #ddd', padding: '8px' }}>Profesor</th>
          <th style={{ border: '1px solid #ddd', padding: '8px' }}>Cupo</th>
          <th style={{ border: '1px solid #ddd', padding: '8px' }}>Inicio</th>
          <th style={{ border: '1px solid #ddd', padding: '8px' }}>Fin</th>
          <th style={{ border: '1px solid #ddd', padding: '8px' }}>Acciones</th>
        </tr>
      </thead>

      <tbody>
        {clases.map((clase) => (
          <tr key={clase.id}>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{clase.nombre}</td>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{clase.profesor}</td>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{clase.cupo}</td>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
              {new Date(clase.fechaInicio).toLocaleString()}
            </td>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
              {new Date(clase.fechaFin).toLocaleString()}
            </td>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
              <button onClick={() => onEdit(clase)} style={{ marginRight: '8px' }}>
                Editar
              </button>
              <button onClick={() => onDelete(clase.id)}>Eliminar</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}