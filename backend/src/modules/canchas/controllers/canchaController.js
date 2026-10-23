import * as canchaService from '../services/canchaService.js';

export const getDisponibilidad = async (req, res, next) => {
  try {
    
    const { idSede, fecha } = req.query;
    if (!idSede || !fecha) {
      return res.status(400).json({
        success: false,
        message: 'idSede y fecha son parámetros obligatorios'
      });
    }

    const data = await canchaService.obtenerGrillaCanchas(Number(idSede), fecha);

    res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    next(error);
  }
};