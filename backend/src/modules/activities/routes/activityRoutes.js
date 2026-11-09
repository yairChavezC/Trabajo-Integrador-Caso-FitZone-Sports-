import express from 'express';
import {
  getActivities,
  getMyRegistrations,
  getMyRole,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  postReservation,
  postWaitlist,
  acceptWaitlistOffer,
  deleteReservation,
  getClassInscriptions,
  getClassNotifications,
  markClassNotificationAsRead
} from '../controllers/activityController.js';
import {
  getCurrentUserRole,
  getAssignedSiteForUser,
  getActivityById as getActivityByIdService
} from '../services/activityService.js';

const router = express.Router();

export const createRequireAgendaManager = ({
  getCurrentUserRole: resolveRole = getCurrentUserRole,
  getAssignedSiteForUser: findAssignedSite = getAssignedSiteForUser,
  getActivityById: findActivityById = getActivityByIdService
} = {}) => async (req, res, next) => {
  try {
    const tipo = await resolveRole(req.usuario?.rol);
    if (tipo === 'gerente') return next();
    if (tipo !== 'recepcionista') {
      return res.status(403).json({ message: 'Se requiere rol gerente o recepcionista asignado a sede.' });
    }

    const idUsuario = Number(req.usuario?.id);
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      return res.status(401).json({ message: 'El usuario autenticado es inválido.' });
    }

    const idSedeAsignada = await findAssignedSite(idUsuario);
    if (!idSedeAsignada) {
      return res.status(403).json({ message: 'Tu perfil no tiene una sede asignada para gestionar clases.' });
    }

    let idSedeSolicitada;
    if (req.method === 'POST' && req.path === '/') {
      idSedeSolicitada = Number(req.body?.idSede);
      if (!Number.isInteger(idSedeSolicitada) || idSedeSolicitada <= 0) return next();
    } else {
      const idClase = Number(req.params.id);
      if (!Number.isInteger(idClase) || idClase <= 0) return next();
      const clase = await findActivityById(idClase);
      if (!clase) return next();
      idSedeSolicitada = Number(clase.idSede);
    }

    if (idSedeSolicitada !== Number(idSedeAsignada)) {
      return res.status(403).json({ message: 'Solo podés gestionar clases de tu sede asignada.' });
    }

    if (req.method === 'PUT' && Object.hasOwn(req.body ?? {}, 'idSede')) {
      const idSedeDestino = Number(req.body.idSede);
      if (
        Number.isInteger(idSedeDestino) &&
        idSedeDestino > 0 &&
        idSedeDestino !== Number(idSedeAsignada)
      ) {
        return res.status(403).json({ message: 'Solo podés gestionar clases de tu sede asignada.' });
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

const requireRoles = (rolesPermitidos, mensaje) => async (req, res, next) => {
  try {
    const tipo = await getCurrentUserRole(req.usuario?.rol);
    if (!rolesPermitidos.includes(tipo)) {
      return res.status(403).json({ message: mensaje });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireClassAccess = requireRoles(
  ['socio', 'recepcionista', 'gerente'],
  'La agenda de clases está disponible para socios y personal de FitZone.'
);
const requireAgendaManager = createRequireAgendaManager();
const requireSocio = requireRoles(
  ['socio'],
  'Solo los socios pueden inscribirse a clases grupales.'
);

router.get('/', requireClassAccess, getActivities);
router.get('/mi-rol', getMyRole);
router.get('/mis-inscripciones', getMyRegistrations);
router.get('/notificaciones', requireSocio, getClassNotifications);
router.put('/notificaciones/:id/leida', requireSocio, markClassNotificationAsRead);
router.post('/', requireAgendaManager, createActivity);
router.get('/:id/inscripciones', requireAgendaManager, getClassInscriptions);
router.post('/:id/reservas', requireSocio, postReservation);
router.delete('/:id/reservas', requireSocio, deleteReservation);
router.post('/:id/lista-espera/aceptar', requireSocio, acceptWaitlistOffer);
router.post('/:id/lista-espera', requireSocio, postWaitlist);
router.get('/:id', requireClassAccess, getActivityById);
router.put('/:id', requireAgendaManager, updateActivity);
router.delete('/:id', requireAgendaManager, deleteActivity);

export default router;