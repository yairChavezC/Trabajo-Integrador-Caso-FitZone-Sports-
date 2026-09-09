import * as canchaService from '../services/canchaService.js';

export const getGrilla = async (req, res) => {
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
    console.error('Error al generar grilla de canchas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al consultar la grilla de canchas'
    });
  }
};