import {
  findAllActivities,
  findActivityById,
  createActivity as createActivityInRepo,
  updateActivity as updateActivityInRepo,
  deleteActivity as deleteActivityInRepo
} from '../repositories/activityRepository.js';

export const getAllActivities = async () => {
  try {
    return await findAllActivities();
  } catch (error) {
    console.error('Error en activityService.getAllActivities:', error);
    throw error;
  }
};

export const getActivityById = async (id) => {
  try {
    if (!id) {
      throw new Error('El ID de la clase es obligatorio.');
    }

    return await findActivityById(id);
  } catch (error) {
    console.error('Error en activityService.getActivityById:', error);
    throw error;
  }
};

export const createActivity = async (dto) => {
  try {
    if (!dto) {
      throw new Error('El DTO es obligatorio.');
    }

    return await createActivityInRepo(dto);
  } catch (error) {
    console.error('Error en activityService.createActivity:', error);
    throw error;
  }
};

export const updateActivity = async (id, dto) => {
  try {
    if (!id) {
      throw new Error('El ID de la clase es obligatorio.');
    }

    if (!dto) {
      throw new Error('El DTO es obligatorio.');
    }

    return await updateActivityInRepo(id, dto);
  } catch (error) {
    console.error('Error en activityService.updateActivity:', error);
    throw error;
  }
};

export const deleteActivity = async (id) => {
  try {
    if (!id) {
      throw new Error('El ID de la clase es obligatorio.');
    }

    return await deleteActivityInRepo(id);
  } catch (error) {
    console.error('Error en activityService.deleteActivity:', error);
    throw error;
  }
};