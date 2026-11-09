export const formatoFecha = (fecha) =>
  new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(fecha));

export const formatoHora = (fecha) =>
  new Intl.DateTimeFormat('es-AR', { timeStyle: 'short' }).format(new Date(fecha));

export const estadoLabel = (inscripcion) => {
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
};
