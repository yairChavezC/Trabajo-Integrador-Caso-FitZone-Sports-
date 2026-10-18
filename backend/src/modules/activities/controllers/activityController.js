import {
  getAllActivities,
  getActivityById as getActivityByIdService,
  createActivity as createActivityService,
  updateActivity as updateActivityService,
  deleteActivity as deleteActivityService,
  reserveClass,
  joinWaitlist,
  cancelClassReservation,
  confirmWaitlistOffer,
  rejectWaitlistOffer,
  getInscriptionsByClass
} from '../services/activityService.js';

import { CreateActivityDTO } from '../dtos/activity.dto.js';
import { BusinessError } from '../errors.js';

const handleError = (res, error, fallbackMessage) => {
  if (error instanceof BusinessError) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({
    message: 'Error interno del servidor',
    error: error.message
  });
};

const getUserId = (req) => Number(req.usuario?.id);

export const getActivities = async (req, res) => {
  try {
    const activities = await getAllActivities(getUserId(req));
    return res.status(200).json(activities);
  } catch (error) {
    return handleError(res, error, 'Error al obtener las clases:');
  }
};

export const getActivityById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'El ID de la clase es inválido.' });
    }

    const activity = await getActivityByIdService(id, getUserId(req));

    if (!activity) {
      return res.status(404).json({ message: 'Clase no encontrada.' });
    }

    return res.status(200).json(activity);
  } catch (error) {
    console.error('Error al obtener la clase:', error);
    return res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

export const createActivity = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'El cuerpo de la solicitud está vacío.' });
    }

    const dto = new CreateActivityDTO(req.body);
    const errors = dto.validate();

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validación fallida', errors });
    }

    const newActivity = await createActivityService(dto);

    return res.status(201).json({
      message: 'Clase creada correctamente',
      data: newActivity
    });
  } catch (error) {
    console.error('Error al crear la clase:', error);
    return res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

export const updateActivity = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'El ID de la clase es inválido.' });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'El cuerpo de la solicitud está vacío.' });
    }

    const dto = new CreateActivityDTO(req.body);
    const errors = dto.validate();

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validación fallida', errors });
    }

    const updatedActivity = await updateActivityService(id, dto);

    if (!updatedActivity) {
      return res.status(404).json({ message: 'Clase no encontrada.' });
    }

    return res.status(200).json({
      message: 'Clase actualizada correctamente',
      data: updatedActivity
    });
  } catch (error) {
    console.error('Error al actualizar la clase:', error);
    return res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

export const deleteActivity = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'El ID de la clase es inválido.' });
    }

    const deletedActivity = await deleteActivityService(id);

    if (!deletedActivity) {
      return res.status(404).json({ message: 'Clase no encontrada.' });
    }

    return res.status(200).json({
      message: 'Clase eliminada correctamente',
      data: deletedActivity
    });
  } catch (error) {
    console.error('Error al eliminar la clase:', error);
    return res.status(500).json({
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

export const postReservation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'El ID de la clase es inválido.' });
    }

    const inscription = await reserveClass(id, getUserId(req));
    return res.status(201).json({
      message: 'Reserva confirmada',
      data: inscription
    });
  } catch (error) {
    return handleError(res, error, 'Error al reservar la clase:');
  }
};

export const postWaitlist = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'El ID de la clase es inválido.' });
    }

    const inscription = await joinWaitlist(id, getUserId(req));
    return res.status(201).json({
      message: 'Quedaste en lista de espera',
      data: inscription
    });
  } catch (error) {
    return handleError(res, error, 'Error al anotar lista de espera:');
  }
};

export const deleteReservation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'El ID de la clase es inválido.' });
    }

    const result = await cancelClassReservation(id, getUserId(req));
    return res.status(200).json({
      message: 'Inscripción cancelada',
      data: result
    });
  } catch (error) {
    return handleError(res, error, 'Error al cancelar la reserva:');
  }
};

export const postConfirmOffer = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'El ID de la clase es inválido.' });
    }

    const inscription = await confirmWaitlistOffer(id, getUserId(req));
    return res.status(200).json({
      message: 'Lugar confirmado',
      data: inscription
    });
  } catch (error) {
    return handleError(res, error, 'Error al confirmar el cupo:');
  }
};

export const postRejectOffer = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'El ID de la clase es inválido.' });
    }

    const result = await rejectWaitlistOffer(id, getUserId(req));
    return res.status(200).json({
      message: 'Oferta rechazada',
      data: result
    });
  } catch (error) {
    return handleError(res, error, 'Error al rechazar el cupo:');
  }
};

export const getClassInscriptions = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'El ID de la clase es inválido.' });
    }

    const inscriptions = await getInscriptionsByClass(id);
    return res.status(200).json(inscriptions);
  } catch (error) {
    return handleError(res, error, 'Error al listar inscripciones:');
  }
};