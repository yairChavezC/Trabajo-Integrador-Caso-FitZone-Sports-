import { toCreateUserDTO, toUpdateUserDTO, toUserResponseDTO } from '../dtos/users.dto.js';


export function createUsersController(service) {
  async function getUsers(req, res, next) {
    try {
      const filtros = {};

      if (req.query.rol !== undefined) {
        const idRoles = String(req.query.rol)
          .split(',')
          .map((valor) => Number(valor.trim()));

        if (idRoles.some((idRol) => !Number.isInteger(idRol) || idRol <= 0)) {
          const error = new Error(
            'El parámetro rol debe ser uno o varios números enteros positivos separados por coma'
          );
          error.status = 400;
          error.statusCode = 400;
          throw error;
        }
        filtros.idRoles = idRoles;
      }

      const users = await service.getAllUsers(filtros);
      res.json(users.map(toUserResponseDTO));
    } catch (error) {
      next(error);
    }
  }

  async function getUser(req, res, next) {
    try {
      const usuario = await service.getUserById(req.params.id);
      res.json(toUserResponseDTO(usuario));
    } catch (error) {
      next(error);
    }
  }

  async function createUser(req, res, next) {
    try {
      const datosLimpios = toCreateUserDTO(req.body);
      const nuevoUsuario = await service.createUser(datosLimpios);
      res.status(201).json(toUserResponseDTO(nuevoUsuario));
    } catch (error) {
      next(error);
    }
  }

  async function updateUser(req, res, next) {
    try {
      const usuario = await service.updateUser(req.params.id, toUpdateUserDTO(req.body));
      res.json(toUserResponseDTO(usuario));
    } catch (error) {
      next(error);
    }
  }

  async function getPagos(req, res, next) {
    try {
      const pagos = await service.getPagosByUsuario(req.params.id);
      res.json(
        pagos.map((p) => ({
          id: p.id,
          monto: Number(p.monto),
          medioPago: p.medio_pago,
          estado: p.estado,
          fechaPago: p.fecha_pago,
          motivoRechazo: p.motivo_rechazo,
        }))
      );
    } catch (error) {
      next(error);
    }
  }

  return { getUsers, getUser, createUser, updateUser, getPagos };}