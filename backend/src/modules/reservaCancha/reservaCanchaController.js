import { procesarReservaConPago } from '../../core/orchestrator/pagoCanchaOrchestrator.js';
import * as reservaCanchaService from './reservaCanchaService.js';

export const checkoutReservaCancha = async (req, res, next) => {
  try {
    const { idCancha, fechaInicio, fechaFin, monto, metodoPago } = req.body;

    // Validación básica de parámetros obligatorios
    if (!idCancha || !fechaInicio || !fechaFin || monto === undefined) {
      return res.status(400).json({
        success: false,
        message: 'idCancha, fechaInicio, fechaFin y monto son requeridos.'
      });
    }

    // El id del usuario autenticado se extrae del token decodificado
    const idUsuario = req.usuario?.id || req.body.idUsuario;

    // Opcional: clave de idempotencia que pueda enviar el cliente en los headers
    const idempotencyKey = req.headers['x-idempotency-key'] || null;

    const resultado = await procesarReservaConPago({
      idCancha: Number(idCancha),
      idUsuario: Number(idUsuario),
      fechaInicio,
      fechaFin,
      monto: Number(monto),
      metodoPago: metodoPago || 'TARJETA',
      idempotencyKey
    });

    // Si la pasarela rechazó el cobro, devolvemos un 402 (Payment Required) o 400
    if (!resultado.success) {
      return res.status(402).json({
        success: false,
        message: resultado.message,
        data: resultado
      });
    }

    // Si fue exitoso o quedó pendiente de confirmación externa
    return res.status(201).json({
      success: true,
      message: 'Reserva procesada exitosamente.',
      data: resultado
    });

  } catch (error) {
    next(error); // Pasa directo al core/errors/errorHandler.js
  }
};


export const obtenerMisReservas = async (req, res, next) => {
  try {
    // Toma el ID del token JWT autenticado (o param opcional si se requiere)
    const idUsuario = req.usuario?.id || req.params.idUsuario;

    if (!idUsuario) {
      return res.status(401).json({
        success: false,
        message: 'No se pudo determinar la identidad del usuario.'
      });
    }

    const reservas = await reservaCanchaService.obtenerReservasPorUsuario(idUsuario);

    return res.status(200).json({
      success: true,
      data: reservas
    });
  } catch (error) {
    next(error);
  }
};