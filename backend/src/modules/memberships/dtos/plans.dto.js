import { obtenerEstrategiaDePrecio } from '../domain/pricingStrategies.js';

// Limpia lo que llega del cliente al crear un plan
export function toCreatePlanDTO(body) {
  return {
    nombre: String(body.nombre ?? '').trim(),
    precio: body.precio,
    intervalo: String(body.intervalo ?? '').trim().toLowerCase(),
  };
}

// Al editar solo se cambian nombre y precio
export function toUpdatePlanDTO(body) {
  return {
    nombre: String(body.nombre ?? '').trim(),
    precio: body.precio,
  };
}

// Define qué datos salen hacia el cliente
export function toPlanResponseDTO(plan) {
  const tipo = plan.tipo || 'REGULAR';
  const precio = Number(plan.precio);
  return {
    id: plan.id,
    nombre: plan.nombre,
    precio,
    tipo,
    precioFinal: obtenerEstrategiaDePrecio(tipo).calcular(precio),
    intervalo: plan.intervalo,
    duracionDias: plan.duracion_dias,
    activo: plan.activo,
  };
}