import {
  findByUser,
  markAsRead
} from '../repositories/notificationRepository.js';
import { BusinessError } from '../errors.js';

export const getClassNotifications = async (idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }
  return findByUser(idUsuario);
};

export const markClassNotificationAsRead = async (idNotificacion, idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }
  const notification = await markAsRead(idNotificacion, idUsuario);
  if (!notification) {
    throw new BusinessError('Notificación no encontrada.', 404);
  }
  return notification;
};
