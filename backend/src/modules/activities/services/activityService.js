import * as defaultActivityRepo from '../repositories/activityRepository.js';
import * as defaultInscriptionRepo from '../repositories/inscriptionRepository.js';
import { createInscriptionService } from './inscriptionService.js';
import { BusinessError } from '../errors.js';
import {
  validarReduccionDeCupo,
  validarInicioFuturo,
  calcularAccionesClase
} from '../domain/classPolicy.js';

const mapActivityForeignKeyError = (error) => {
  if (
    error?.code === '23503' &&
    error.table === 'clase_grupal' &&
    (error.constraint === 'clase_grupal_id_sede_fkey' || error.constraint === 'actividad_grupal_id_sede_fkey')
  ) {
    return new BusinessError('La sede seleccionada no existe.', 400);
  }
  return error;
};

/**
 * Fábrica de servicio de clases con Inyección de Dependencias.
 * Encapsula la agenda de clases: listado, detalle, creación, actualización y
 * eliminación. No conoce la lógica de inscripciones ni de lista de espera.
 */
export const createActivityService = (dependencies = {}) => {
  const activityRepo = dependencies.activityRepo || defaultActivityRepo;
  const inscriptionRepo = dependencies.inscriptionRepo || defaultInscriptionRepo;
  const now = dependencies.now || (() => Date.now());

  const getAllActivities = async (idUsuario = null, idSede = null, incluirPasadas = false, limit = null, offset = null) => {
    try {
      const activities = await activityRepo.findAllActivities(idUsuario, idSede, incluirPasadas, limit, offset);
      return activities.map((clase) => calcularAccionesClase(clase, now()));
    } catch (error) {
      if (!(error instanceof BusinessError)) {
        console.error('Error en activityService.getAllActivities:', error);
      }
      throw error;
    }
  };

  const getActivityById = async (id, idUsuario = null) => {
    try {
      if (!id) {
        throw new Error('El ID de la clase es obligatorio.');
      }

      const clase = await activityRepo.findActivityById(id, idUsuario);
      return clase ? calcularAccionesClase(clase, now()) : clase;
    } catch (error) {
      if (!(error instanceof BusinessError)) {
        console.error('Error en activityService.getActivityById:', error);
      }
      throw error;
    }
  };

  const createActivity = async (dto) => {
    try {
      if (!dto) {
        throw new Error('El DTO es obligatorio.');
      }

      validarInicioFuturo(dto.fechaInicio, now());
      return await activityRepo.createActivity(dto);
    } catch (error) {
      const mapeado = mapActivityForeignKeyError(error);
      if (!(mapeado instanceof BusinessError)) {
        console.error('Error en activityService.createActivity:', error);
      }
      throw mapeado;
    }
  };

  const updateActivity = async (id, dto) => {
    try {
      if (!id) {
        throw new Error('El ID de la clase es obligatorio.');
      }

      if (!dto) {
        throw new Error('El DTO es obligatorio.');
      }

      const resultado = await inscriptionRepo.withTransaction(async (client) => {
        const clase = await activityRepo.lockActivityById(id, client);
        if (!clase) return null;

        const errors = dto.validate(clase);
        if (errors.length > 0) {
          throw new BusinessError(errors.join(' '), 400);
        }

        const updateDto = {
          idSede: dto.idSede ?? clase.idSede,
          nombre: dto.nombre ?? clase.nombre,
          profesor: dto.profesor ?? clase.profesor,
          cupo: dto.cupo ?? clase.cupo,
          fechaInicio: dto.fechaInicio ?? clase.fechaInicio,
          fechaFin: dto.fechaFin ?? clase.fechaFin
        };
        const cambioInicio =
          new Date(updateDto.fechaInicio).getTime() !== new Date(clase.fechaInicio).getTime();
        const cambioFechas = cambioInicio ||
          new Date(updateDto.fechaFin).getTime() !== new Date(clase.fechaFin).getTime();
        if (cambioFechas) {
          if (cambioInicio) validarInicioFuturo(updateDto.fechaInicio, now());
          const inscripcionesActivas = await inscriptionRepo.countActiveInscriptions(id, client);
          if (inscripcionesActivas > 0) {
            throw new BusinessError(
              'No se pueden cambiar las fechas de una clase con inscripciones activas.',
              409
            );
          }
        }

        const confirmados = await inscriptionRepo.countConfirmed(id, client);
        validarReduccionDeCupo(updateDto.cupo, confirmados);

        const claseActualizada = await activityRepo.updateActivity(id, updateDto, client);
        return { clase: claseActualizada };
      });
      if (!resultado) return resultado;
      return resultado.clase;
    } catch (error) {
      const mapeado = mapActivityForeignKeyError(error);
      if (!(mapeado instanceof BusinessError)) {
        console.error('Error en activityService.updateActivity:', error);
      }
      throw mapeado;
    }
  };

  const deleteActivity = async (id) => {
    try {
      if (!id) {
        throw new Error('El ID de la clase es obligatorio.');
      }

      return await inscriptionRepo.withTransaction(async (client) => {
        const clase = await activityRepo.lockActivityById(id, client);
        if (!clase) return null;
        const inscripcionesActivas = await inscriptionRepo.countActiveInscriptions(id, client);
        if (inscripcionesActivas > 0) {
          const detalle = inscripcionesActivas === 1
            ? '1 inscripción activa'
            : `${inscripcionesActivas} inscripciones activas`;
          throw new BusinessError(
            `No se puede eliminar la clase porque tiene ${detalle}.`,
            409
          );
        }

        await inscriptionRepo.deleteInactiveInscriptionsByClass?.(id, client);
        return activityRepo.deleteActivity(id, client);
      });
    } catch (error) {
      if (error.code === '23503') {
        throw new BusinessError(
          'No se puede eliminar la clase porque tiene registros asociados que deben conservarse.',
          409
        );
      }
      if (!(error instanceof BusinessError)) {
        console.error('Error en activityService.deleteActivity:', error);
      }
      throw error;
    }
  };

  const getCurrentUserRole = async (idRol) => {
    if (!idRol) {
      throw new BusinessError('El rol autenticado es obligatorio.', 401);
    }
    return activityRepo.findRoleTypeById(idRol);
  };

  const getAssignedSiteForUser = async (idUsuario) => {
    if (!idUsuario) {
      throw new BusinessError('El usuario autenticado es obligatorio.', 401);
    }
    try {
      return await activityRepo.findAssignedSiteByUser(idUsuario);
    } catch (error) {
      if (error.code === '42P01') {
        throw new BusinessError(
          'La gestión de agenda por sede no está configurada. Aplicá la migración y asigná una sede.',
          503
        );
      }
      throw error;
    }
  };

  return {
    getAllActivities,
    getActivityById,
    createActivity,
    updateActivity,
    deleteActivity,
    getCurrentUserRole,
    getAssignedSiteForUser
  };
};

const defaultService = createActivityService();

export const getAllActivities = defaultService.getAllActivities;
export const getActivityById = defaultService.getActivityById;
export const createActivity = defaultService.createActivity;
export const updateActivity = defaultService.updateActivity;
export const deleteActivity = defaultService.deleteActivity;
export const getCurrentUserRole = defaultService.getCurrentUserRole;
export const getAssignedSiteForUser = defaultService.getAssignedSiteForUser;