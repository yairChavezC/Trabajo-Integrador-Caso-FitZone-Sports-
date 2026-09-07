import jwt from 'jsonwebtoken';
import pool from '../../config/db.js';
import { buscarUsuarioPorNombre } from './authRepository.js';

export const realizarLogin = async (nombre_usuario, contrasenia) => {
  const usuario = await buscarUsuarioPorNombre(nombre_usuario);

  if (!usuario) {
    throw new Error('AUTH_FAILED');
  }

  const sqlCheck = "SELECT encode(digest($1, 'sha256'), 'hex') = $2 AS es_valida";
  const result = await pool.query(sqlCheck, [String(contrasenia).trim(), usuario.password]);

  if (!result.rows[0]?.es_valida) {
    throw new Error('AUTH_FAILED');
  }

  const token = jwt.sign(
    { id: usuario.id, dni: usuario.dni, rol: usuario.id_rol },
    process.env.JWT_SECRET,
    { expiresIn: '4h' }
  );

  return {
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.id_rol }
  };
};