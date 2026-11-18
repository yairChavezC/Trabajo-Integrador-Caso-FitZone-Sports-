export const createAuthRepository = (pool) => {
  const buscarUsuarioPorNombre = async (identificador) => {
    const sql = `
      SELECT id, dni, nombre, contacto, foto, password, id_rol, activo
      FROM public.usuario
      WHERE (dni = $1 OR contacto = $1) AND activo = true
    `;
    const result = await pool.query(sql, [identificador]);
    return result.rows[0] || null;
  };

  const verificarPassword = async (contraseniaPlana, passwordHash) => {
    const sqlCheck = `
      SELECT encode(digest($1, 'sha256'), 'hex') = $2 AS es_valida
    `;
    const result = await pool.query(sqlCheck, [contraseniaPlana, passwordHash]);
    return Boolean(result.rows[0]?.es_valida);
  };

  return {
    buscarUsuarioPorNombre,
    verificarPassword
  };
};