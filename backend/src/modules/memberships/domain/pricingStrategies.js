export const pricingStrategies = {
  REGULAR: {
    calcular: (precioBase) => precioBase
  },
  VIP: {
    calcular: (precioBase) => {
      // 10% de recargo por servicios premium o acceso total
      return precioBase * 1.10;
    }
  },
  STUDENT: {
    calcular: (precioBase) => {
      // 20% de descuento para estudiantes
      return precioBase * 0.80;
    }
  },
  PROMO_ANUAL: {
    calcular: (precioBase) => {
      // 30% de descuento por pago anual por adelantado
      return precioBase * 0.70;
    }
  }
};

// Función selector o Contexto para obtener la estrategia correcta
export function obtenerEstrategiaDePrecio(tipoPlan) {
  const estrategia = pricingStrategies[String(tipoPlan || 'REGULAR').toUpperCase()];
  if (!estrategia) {
    throw new Error(`Tipo de plan no soportado: ${tipoPlan}`);
  }
  return {
    calcular: (precioBase) => Math.round(estrategia.calcular(precioBase) * 100) / 100,
  };
}