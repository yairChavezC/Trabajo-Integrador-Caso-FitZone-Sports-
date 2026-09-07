import { listarSedesActivas } from '../repositories/sedeRepository.js';

export const obtenerSedes = async () => {
  return await listarSedesActivas();
};