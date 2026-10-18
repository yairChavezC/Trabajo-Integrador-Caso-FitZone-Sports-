import pool from '../../../config/db.js';

const inscriptionSelect = `
  id,
  id_clase_grupal AS "idClase",
  id_usuario AS "idUsuario",
  estado,
  fecha_registro AS "fechaRegistro",
  fecha_expiracion_oferta AS "fechaExpiracionOferta"
`;

export const withTransaction = async (work) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const countConfirmed = async (idClase, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT COUNT(*)::int AS total
      FROM public.inscripciones_clase_grupal
      WHERE id_clase_grupal = $1
        AND estado = 'confirmado'
    `,
    [idClase]
  );
  return rows[0].total;
};

export const findActiveByUserAndClass = async (idClase, idUsuario, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT ${inscriptionSelect}
      FROM public.inscripciones_clase_grupal
      WHERE id_clase_grupal = $1
        AND id_usuario = $2
        AND estado IN ('confirmado', 'en espera', 'notificado')
      ORDER BY fecha_registro DESC, id DESC
      LIMIT 1
    `,
    [idClase, idUsuario]
  );
  return rows[0] ?? null;
};

export const insertInscription = async ({ idClase, idUsuario, estado }, client = pool) => {
  const { rows } = await client.query(
    `
      INSERT INTO public.inscripciones_clase_grupal (
        id_clase_grupal,
        id_usuario,
        estado,
        fecha_registro
      )
      VALUES ($1, $2, $3, NOW())
      RETURNING ${inscriptionSelect}
    `,
    [idClase, idUsuario, estado]
  );
  return rows[0];
};

export const cancelInscription = async (id, client = pool) => {
  const { rows } = await client.query(
    `
      UPDATE public.inscripciones_clase_grupal
      SET estado = 'cancelado'
      WHERE id = $1
      RETURNING ${inscriptionSelect}
    `,
    [id]
  );
  return rows[0] ?? null;
};

export const findNextWaitlist = async (idClase, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT ${inscriptionSelect}
      FROM public.inscripciones_clase_grupal
      WHERE id_clase_grupal = $1
        AND estado = 'en espera'
      ORDER BY fecha_registro ASC, id ASC
      LIMIT 1
    `,
    [idClase]
  );
  return rows[0] ?? null;
};

export const promoteWaitlistInscription = async (id, client = pool) => {
  const { rows } = await client.query(
    `
      UPDATE public.inscripciones_clase_grupal
      SET
        estado = 'confirmado',
        fecha_expiracion_oferta = NOW() + INTERVAL '2 hours'
      WHERE id = $1
      RETURNING ${inscriptionSelect}
    `,
    [id]
  );
  return rows[0] ?? null;
};

export const listByClass = async (idClase, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT ${inscriptionSelect}
      FROM public.inscripciones_clase_grupal
      WHERE id_clase_grupal = $1
      ORDER BY fecha_registro ASC
    `,
    [idClase]
  );
  return rows;
};
