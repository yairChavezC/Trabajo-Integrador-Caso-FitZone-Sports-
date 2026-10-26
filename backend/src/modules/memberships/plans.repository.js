import pool from '../../config/db.js';

const COLUMNAS = 'id, nombre, precio, intervalo, duracion_dias, activo';

async function findAll({ soloActivos = false } = {}) {
  const where = soloActivos ? 'WHERE activo = true' : '';
  const result = await pool.query(
    `SELECT ${COLUMNAS} FROM plan ${where} ORDER BY duracion_dias ASC, nombre ASC`
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT ${COLUMNAS} FROM plan WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function create({ nombre, precio, intervalo, duracionDias }) {
  const result = await pool.query(
    `INSERT INTO plan (nombre, precio, intervalo, duracion_dias, activo)
     VALUES ($1, $2, $3, $4, true)
     RETURNING ${COLUMNAS}`,
    [nombre, precio, intervalo, duracionDias]
  );
  return result.rows[0];
}

async function update(id, { nombre, precio }) {
  const result = await pool.query(
    `UPDATE plan SET nombre = $2, precio = $3 WHERE id = $1 RETURNING ${COLUMNAS}`,
    [id, nombre, precio]
  );
  return result.rows[0] || null;
}

async function setActivo(id, activo) {
  const result = await pool.query(
    `UPDATE plan SET activo = $2 WHERE id = $1 RETURNING ${COLUMNAS}`,
    [id, activo]
  );
  return result.rows[0] || null;
}

export default { findAll, findById, create, update, setActivo };