const formatearTipo = (tipoRaw) => {
  if (!tipoRaw || typeof tipoRaw !== 'string') return 'CANCHA';
  return tipoRaw.trim().replace(/\s*[-/]\s*/g, ' • ').toUpperCase();
};

const obtenerContextoHorarioActual = (ahora = new Date()) => {
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const hora = String(ahora.getHours()).padStart(2, '0');
  const min = String(ahora.getMinutes()).padStart(2, '0');

  return {
    fechaHoyStr: `${anio}-${mes}-${dia}`,
    horaActualStr: `${hora}:${min}`,
  };
};

export const adaptarSlot = (slot, { esHoy, horaActualStr }) => {
  const precioBase = Number(slot.precioBase ?? slot.precio_base ?? slot.precio ?? 0);
  const precioFinal = slot.precioSocio ? Number(slot.precioSocio) : Math.round(precioBase * 0.85);
  const esTurnoPasado = esHoy && Boolean(slot.inicio && slot.inicio <= horaActualStr);
  const estaOcupado = slot.estado?.toLowerCase() !== 'libre';

  return {
    ...slot,
    precioBase,
    precioFinal,
    esTurnoPasado,
    estaOcupado,
    disponible: !estaOcupado && !esTurnoPasado,
  };
};

export const adaptarCancha = (cancha, fechaConsultada, ahora = new Date()) => {
  const { fechaHoyStr, horaActualStr } = obtenerContextoHorarioActual(ahora);
  const esHoy = fechaConsultada === fechaHoyStr;

  const precioBase = Number(cancha.precio_base ?? cancha.precioBase ?? cancha.precio ?? 0);
  const precioSocio = Math.round(precioBase * 0.85);

  const slotsCrudos = cancha.horarios || cancha.slots || [];
  const slotsAdaptados = slotsCrudos.map((slot) =>
    adaptarSlot(slot, { esHoy, horaActualStr })
  );

  const turnosDisponibles = slotsAdaptados.filter((s) => s.disponible);

  return {
    ...cancha,
    tipoFormateado: formatearTipo(cancha.tipo),
    precioBase,
    precioSocio,
    slots: slotsAdaptados,
    cantidadLibres: turnosDisponibles.length,
    proximoTurno: turnosDisponibles[0]?.inicio || null,
  };
};

export const adaptarListaCanchas = (listaCruda = [], fechaConsultada, ahora = new Date()) => {
  return listaCruda.map((cancha) => adaptarCancha(cancha, fechaConsultada, ahora));
};