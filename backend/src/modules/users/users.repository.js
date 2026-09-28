import pool from '../../config/db.js';

async function findAll() {
  const result = await pool.query(
    `SELECT
       u.id, u.nombre, u.dni, u.contacto, u.foto, u.id_rol, u.activo, u.creado_at,
       s.estado AS estado_suscripcion,
       s.fecha_proximo_vencimiento,
       s.descuento,
       s.id_plan
     FROM usuario u
     LEFT JOIN suscripcion s ON s.id_usuario = u.id
     ORDER BY u.nombre ASC`
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT
       u.id, u.nombre, u.dni, u.contacto, u.foto, u.id_rol, u.activo, u.creado_at,
       s.estado AS estado_suscripcion,
       s.fecha_proximo_vencimiento,
       s.descuento,
       s.id_plan
     FROM usuario u
     LEFT JOIN suscripcion s ON s.id_usuario = u.id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function create({ nombre, dni, contacto, password, idRol }) {
  const result = await pool.query(
    `INSERT INTO usuario (nombre, dni, contacto, password, id_rol, activo)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id, nombre, dni, contacto, id_rol, activo, creado_at`,
    [nombre, dni, contacto, password, idRol]
  );
  return result.rows[0];
}

export default { findAll, findById, create };