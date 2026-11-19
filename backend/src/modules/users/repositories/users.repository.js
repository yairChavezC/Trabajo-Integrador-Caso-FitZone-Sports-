export function createUsersRepository(pool) {
  const COLUMNAS = 'id, dni, nombre, contacto, foto, id_rol, activo, creado_at';

  async function findById(id) {
    const result = await pool.query(`SELECT ${COLUMNAS} FROM usuario WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async function findByDni(dni) {
    const result = await pool.query(`SELECT ${COLUMNAS} FROM usuario WHERE dni = $1`, [dni]);
    return result.rows[0] || null;
  }

  async function create({ dni, nombre, contacto, foto, idRol }) {
    const result = await pool.query(
      `INSERT INTO usuario (dni, nombre, contacto, foto, id_rol, activo, creado_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING ${COLUMNAS}`,
      [dni, nombre, contacto, foto, idRol]
    );
    return result.rows[0];
  }

  return { findById, findByDni, create };
}