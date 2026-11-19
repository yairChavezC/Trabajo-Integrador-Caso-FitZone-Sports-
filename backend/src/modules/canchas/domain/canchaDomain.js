// ============================================================================
// 1. PATRÓN STRATEGY: Políticas de Tarifas (RN-03)
// ============================================================================

/**
 * Estrategia Estándar / Externo: aplica tarifa base o tarifa de hora pico.
 */
export const tarifaEstandarStrategy = ({ precioBase, precioHoraPico, esPico }) => {
  if (esPico && precioHoraPico) return Number(precioHoraPico);
  return Number(precioBase || 18000);
};

/**
 * Estrategia Socio al Día: aplica 15% de descuento sobre la tarifa correspondiente.
 */
export const tarifaSocioStrategy = (contexto) => {
  const tarifaBase = tarifaEstandarStrategy(contexto);
  return Math.round(tarifaBase * 0.85);
};

/**
 * Estrategia Socio en Mora (RN-03): pierde el beneficio y abona como externo.
 */
export const tarifaSocioEnMoraStrategy = (contexto) => {
  return tarifaEstandarStrategy(contexto);
};

/**
 * Selector de estrategia según la condición comercial del cliente.
 */
export const seleccionarEstrategiaTarifa = ({ esSocio = false, enMora = false } = {}) => {
  if (!esSocio) return tarifaEstandarStrategy;
  if (enMora) return tarifaSocioEnMoraStrategy;
  return tarifaSocioStrategy;
};

// ============================================================================
// 2. REGLAS DE DOMINIO: Cálculo de Grilla y Slots Horarios
// ============================================================================

export const parsearMinutos = (horaStr) => {
  if (!horaStr) return 0;
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
};

export const formatearHora = (minutosTotales) => {
  const h = String(Math.floor(minutosTotales / 60)).padStart(2, '0');
  const m = String(minutosTotales % 60).padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Genera los slots horarios de una cancha evaluando solapamientos, hora pico
 * y aplicando las estrategias de tarifa inyectadas.
 */
export const construirGrillaCancha = (
  cancha,
  reservasDeCancha,
  selectorEstrategia = seleccionarEstrategiaTarifa
) => {
  const slots = [];

  if (cancha.hora_apertura && cancha.hora_cierre) {
    const inicioMin = parsearMinutos(cancha.hora_apertura);
    const finMin = parsearMinutos(cancha.hora_cierre);
    const duracion = cancha.duracion_slot || 60;

    const picoInicio = parsearMinutos(cancha.inicio_hora_pico);
    const picoFin = parsearMinutos(cancha.fin_hora_pico);

    const reservasNormalizadas = reservasDeCancha.map((r) => ({
      inicioMin: parsearMinutos(r.hora_inicio),
      finMin: parsearMinutos(r.hora_fin),
      estado: r.estado
    }));

    const calcularExterno = selectorEstrategia({ esSocio: false });
    const calcularSocio = selectorEstrategia({ esSocio: true, enMora: false });

    for (let actual = inicioMin; actual + duracion <= finMin; actual += duracion) {
      const slotInicio = actual;
      const slotFin = actual + duracion;

      const esPico = Boolean(
        cancha.inicio_hora_pico && slotInicio >= picoInicio && slotInicio < picoFin
      );

      const contextoTarifa = {
        precioBase: cancha.precio_base,
        precioHoraPico: cancha.precio_hora_pico,
        esPico
      };

      const reservaExistente = reservasNormalizadas.find(
        (r) => slotInicio < r.finMin && slotFin > r.inicioMin
      );

      slots.push({
        inicio: formatearHora(slotInicio),
        fin: formatearHora(slotFin),
        esPico,
        precio: calcularExterno(contextoTarifa),
        precioSocio: calcularSocio(contextoTarifa),
        estado: reservaExistente ? reservaExistente.estado : 'libre'
      });
    }
  }

  return {
    id: cancha.id,
    nombre: cancha.nombre,
    tipo: cancha.tipo || 'PAD',
    descripcion: cancha.descripcion || 'Césped Sintético Monofilamento Azul WPT',
    precioBase: Number(cancha.precio_base || 18000),
    slots
  };
};