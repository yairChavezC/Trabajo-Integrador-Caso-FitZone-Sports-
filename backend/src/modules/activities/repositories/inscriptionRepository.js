import pool from '../../../config/db.js';

const argentinaTimeZone = 'America/Argentina/Buenos_Aires';

const inscriptionSelect = `
  id,
  id_clase_grupal AS "idClase",
  id_usuario AS "idUsuario",
  estado,
  fecha_registro AS "fechaRegistro",
  fecha_expiracion_oferta AS "fechaExpiracionOferta",
  fecha_cancelacion AS "fechaCancelacion"
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
        AND (
          estado = 'confirmado'
          OR (
            estado = 'notificado'
            AND fecha_expiracion_oferta > NOW()
          )
        )
    `,
    [idClase]
  );
  return rows[0].total;
};

export const countAllInscriptions = async (idClase, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT COUNT(*)::int AS total
      FROM public.inscripciones_clase_grupal
      WHERE id_clase_grupal = $1
    `,
    [idClase]
  );
  return rows[0].total;
};

export const countActiveInscriptions = async (idClase, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT COUNT(*)::int AS total
      FROM public.inscripciones_clase_grupal
      WHERE id_clase_grupal = $1
        AND estado IN ('confirmado', 'en espera', 'notificado')
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
        AND (estado <> 'notificado' OR fecha_expiracion_oferta > NOW())
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

export const findUltimaCancelacionTardia = async (idUsuario, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT fecha_cancelacion
      FROM public.inscripciones_clase_grupal
      WHERE id_usuario = $1
        AND estado = 'cancelado_tarde'
      ORDER BY fecha_cancelacion DESC
      LIMIT 1
    `,
    [idUsuario]
  );
  return rows[0] ?? null;
};

export const cancelInscription = async (
  id,
  { estado = 'cancelado', fechaCancelacion } = {},
  client = pool
) => {
  const { rows } = await client.query(
    `
      UPDATE public.inscripciones_clase_grupal
      SET estado = $2,
          fecha_cancelacion = COALESCE($3, NOW())
      WHERE id = $1
      RETURNING ${inscriptionSelect}
    `,
    [id, estado, fechaCancelacion]
  );
  return rows[0] ?? null;
};

export const promoteWaitlistInscription = async (id, offerMinutes, client = pool) => {
  const { rows } = await client.query(
    `
      UPDATE public.inscripciones_clase_grupal
      SET
        estado = 'notificado',
        fecha_expiracion_oferta = LEAST(
          NOW() + make_interval(mins => $2),
          (
            SELECT c.fecha_inicio AT TIME ZONE '${argentinaTimeZone}'
            FROM public.clase_grupal c
            WHERE c.id = id_clase_grupal
          )
        )
      WHERE id = $1
      RETURNING ${inscriptionSelect}
    `,
    [id, offerMinutes]
  );
  return rows[0] ?? null;
};

export const expireWaitlistOffers = async (idClase, client = pool) => {
  const { rows } = await client.query(
    `
      UPDATE public.inscripciones_clase_grupal
      SET estado = 'expirado'
      WHERE id_clase_grupal = $1
        AND estado = 'notificado'
        AND fecha_expiracion_oferta <= NOW()
      RETURNING ${inscriptionSelect}
    `,
    [idClase]
  );
  return rows;
};

export const acceptWaitlistOffer = async (idClase, idUsuario, client = pool) => {
  const { rows } = await client.query(
    `
      UPDATE public.inscripciones_clase_grupal
      SET estado = 'confirmado', fecha_expiracion_oferta = NULL
      WHERE id_clase_grupal = $1
        AND id_usuario = $2
        AND estado = 'notificado'
        AND fecha_expiracion_oferta > NOW()
      RETURNING ${inscriptionSelect}
    `,
    [idClase, idUsuario]
  );
  return rows[0] ?? null;
};

export const listByClass = async (idClase, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT
        i.id,
        i.id_clase_grupal AS "idClase",
        i.id_usuario AS "idUsuario",
        u.nombre AS "nombreUsuario",
        i.estado,
        i.fecha_registro AS "fechaRegistro",
        i.fecha_expiracion_oferta AS "fechaExpiracionOferta"
      FROM public.inscripciones_clase_grupal i
      LEFT JOIN public.usuario u ON u.id = i.id_usuario
      WHERE i.id_clase_grupal = $1
      ORDER BY i.fecha_registro ASC, i.id ASC
    `,
    [idClase]
  );
  return rows;
};
