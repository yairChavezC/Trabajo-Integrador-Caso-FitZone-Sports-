import React from 'react';

export const HistorialAccesosTable = ({ historial = [] }) => {
  const obtenerClaseBadge = (estado) => {
    if (estado === 'Autorizado') return 'acceso-badge acceso-badge--success';
    if (estado === 'Finalizado') return 'acceso-badge acceso-badge--info';
    return 'acceso-badge acceso-badge--danger';
  };

  return (
    <section className="acceso-history-card">
      <div className="acceso-history-header">
        <h3 className="acceso-history-title">Últimos Movimientos en Puerta</h3>
      </div>

      {historial.length === 0 ? (
        <div className="acceso-history-empty">
          No hay ingresos recientes registrados en esta sucursal.
        </div>
      ) : (
        <table className="acceso-history-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Evento</th>
              <th className="acceso-text-right">Estado</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((mov) => (
              <tr key={mov.id}>
                <td className="acceso-history-time">{mov.hora}</td>
                <td className="acceso-history-event">{mov.evento}</td>
                <td className="acceso-text-right">
                  <span className={obtenerClaseBadge(mov.estado)}>
                    {mov.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};