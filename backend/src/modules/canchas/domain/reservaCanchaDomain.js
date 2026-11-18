// ============================================================================
// 1. PATRÓN STATE: Ciclo de Vida y Transiciones Válidas de la Reserva
// ============================================================================

const TRANSICIONES_VALIDAS = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['cancelada'],
  cancelada: [] // Estado terminal: una reserva cancelada no puede reactivarse
};

/**
 * Valida si es legal transicionar una reserva de su estado actual al nuevo estado.
 * Lanza un error de dominio puro (sin acoplamiento a HTTP).
 */
export const validarTransicionReserva = (estadoActual, nuevoEstado) => {
  if (estadoActual === nuevoEstado) return;

  const permitidos = TRANSICIONES_VALIDAS[estadoActual];

  if (!permitidos) {
    const error = new Error(`Estado de reserva desconocido: '${estadoActual}'.`);
    error.domainCode = 'ESTADO_DESCONOCIDO';
    throw error;
  }

  if (!permitidos.includes(nuevoEstado)) {
    const error = new Error(
      `Transición inválida: no se puede pasar una reserva de '${estadoActual}' a '${nuevoEstado}'.`
    );
    error.domainCode = 'TRANSICION_INVALIDA';
    throw error;
  }
};

// ============================================================================
// 2. INVARIANTES DEL DOMINIO DE RESERVAS
// ============================================================================

/**
 * Valida las reglas intrínsecas de una nueva reserva antes de persistirla.
 */
export const validarInvariantesNuevaReserva = ({ fechaInicio, fechaFin, monto }) => {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    const error = new Error('Las fechas de inicio y fin deben tener un formato válido.');
    error.domainCode = 'FECHA_INVALIDA';
    throw error;
  }

  if (inicio >= fin) {
    const error = new Error('La fecha/hora de inicio debe ser anterior a la de fin.');
    error.domainCode = 'INTERVALO_INVALIDO';
    throw error;
  }

  if (monto !== undefined && Number(monto) < 0) {
    const error = new Error('El monto de la reserva no puede ser negativo.');
    error.domainCode = 'MONTO_INVALIDO';
    throw error;
  }
};