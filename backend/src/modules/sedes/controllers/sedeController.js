import * as sedeService from '../services/sedeService.js';

export const getSedes = async (req, res) => {
  try {
    const sedes = await sedeService.obtenerSedes();
    res.status(200).json({
      success: true,
      data: sedes
    });
  } catch (error) {
    console.error('Error al obtener sedes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al recuperar sedes'
    });
  }
};