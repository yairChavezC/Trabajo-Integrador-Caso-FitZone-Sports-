// backend/src/modules/canchas/services/canchaService.js
import {
  construirGrillaCancha,
  seleccionarEstrategiaTarifa
} from '../domain/canchaDomain.js';

export const createCanchaService = (
  canchaRepo,
  selectorEstrategia = seleccionarEstrategiaTarifa
) => {
  const obtenerGrillaCanchas = async (idSede, fechaStr) => {
    const fecha = new Date(`${fechaStr}T00:00:00`);
    const diaSemana = fecha.getDay();

    const [canchas, reservas] = await Promise.all([
      canchaRepo.findCanchasConConfigPorSede(idSede, diaSemana),
      canchaRepo.findReservasPorSedeYFecha(idSede, fechaStr)
    ]);

    return canchas.map((cancha) => {
      const reservasDeEstaCancha = reservas.filter(
        (r) => Number(r.id_cancha) === Number(cancha.id)
      );

      return construirGrillaCancha(cancha, reservasDeEstaCancha, selectorEstrategia);
    });
  };

  return { obtenerGrillaCanchas };
};