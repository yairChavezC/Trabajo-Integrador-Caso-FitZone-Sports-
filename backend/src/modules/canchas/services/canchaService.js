import * as canchaRepo from '../repositories/canchaRepository.js';

const parsearMinutos = (horaStr) => {
  if (!horaStr) return 0;
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
};

const formatearHora = (minutosTotales) => {
  const h = String(Math.floor(minutosTotales / 60)).padStart(2, '0');
  const m = String(minutosTotales % 60).padStart(2, '0');
  return `${h}:${m}`;
};

export const obtenerGrillaCanchas = async (idSede, fechaStr) => {
  const fecha = new Date(`${fechaStr}T00:00:00`);
  const diaSemana = fecha.getDay(); // 0: Domingo, 1: Lunes, etc.

  const canchas = await canchaRepo.findCanchasConConfigPorSede(idSede, diaSemana);

  return canchas.map((c) => {
    const slots = [];
    if (c.hora_apertura && c.hora_cierre) {
      const inicioMin = parsearMinutos(c.hora_apertura);
      const finMin = parsearMinutos(c.hora_cierre);
      const duracion = c.duracion_slot || 60;

      const picoInicio = parsearMinutos(c.inicio_hora_pico);
      const picoFin = parsearMinutos(c.fin_hora_pico);

      for (let actual = inicioMin; actual + duracion <= finMin; actual += duracion) {
        const slotInicio = actual;
        const slotFin = actual + duracion;

        const esPico = c.inicio_hora_pico && slotInicio >= picoInicio && slotInicio < picoFin;
        const precio = esPico && c.precio_hora_pico ? Number(c.precio_hora_pico) : Number(c.precio_base || 18000);

        slots.push({
          inicio: formatearHora(slotInicio),
          fin: formatearHora(slotFin),
          esPico,
          precio,
          precioSocio: Math.round(precio * 0.85),
          estado: 'libre'
        });
      }
    }

    return {
      id: c.id,
      nombre: c.nombre,
      tipo: c.tipo || 'PAD',
      descripcion: c.descripcion || 'Césped Sintético Monofilamento Azul WPT',
      precioBase: Number(c.precio_base || 18000),
      slots
    };
  });
};