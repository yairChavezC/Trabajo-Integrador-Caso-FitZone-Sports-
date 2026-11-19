import React from 'react';

const normalizarFilaMovimiento = (mov) => {
  if (mov.hora && mov.evento && mov.estado) {
    return mov;
  }

  const tieneSalida = mov.fecha_salida !== null && mov.fecha_salida !== undefined;
  const fechaEntradaObj = mov.fecha_entrada ? new Date(mov.fecha_entrada) : null;
  const fechaSalidaObj = tieneSalida ? new Date(mov.fecha_salida) : null;

  const fechaTexto = fechaEntradaObj && !isNaN(fechaEntradaObj)
    ? fechaEntradaObj.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : '--:--';

  const horaSalidaTexto = fechaSalidaObj && !isNaN(fechaSalidaObj)
    ? fechaSalidaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const nombreSede = mov.sede?.nombre || mov.sede_nombre || 'Sede Principal';
  const eventoTexto = tieneSalida
    ? `${nombreSede} · Salida ${horaSalidaTexto}`
    : `${nombreSede} · En curso`;

  return {
    id: mov.id || Math.random(),
    hora: fechaTexto,
    evento: eventoTexto,
    estado: tieneSalida ? 'Finalizado' : 'Autorizado'
  };
};

export const HistorialAccesosTable = ({ historial = [], loading = false, compacto = false }) => {
  const obtenerClaseBadge = (estado) => {
    if (estado === 'Autorizado') return 'acceso-badge acceso-badge--success';
    if (estado === 'Finalizado') return 'acceso-badge acceso-badge--info';
    return 'acceso-badge acceso-badge--danger';
  };

  const filasNormalizadas = Array.isArray(historial)
    ? historial.map(normalizarFilaMovimiento)
    : [];

  const contenidoTabla = loading ? (
    <div className="acceso-history-empty">Cargando accesos...</div>
  ) : filasNormalizadas.length === 0 ? (
    <div className="acceso-history-empty">Sin accesos recientes.</div>
  ) : (
    <div className="socio-table-wrapper">
      <table className="acceso-history-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Sede / Detalle</th>
            <th className="acceso-text-right">Estado</th>
          </tr>
        </thead>
        <tbody>
          {filasNormalizadas.map((mov) => (
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
    </div>
  );

  if (compacto) {
    return contenidoTabla;
  }

  return (
    <section className="acceso-history-card">
      <div className="acceso-history-header">
        <h3 className="acceso-history-title">Últimos Movimientos en Puerta</h3>
      </div>
      {contenidoTabla}
    </section>
  );
};