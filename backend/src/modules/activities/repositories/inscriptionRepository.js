import pool from '../../../config/db.js';

const inscriptionSelect = `
  id,
  id_clase_grupal AS "idClase",
  id_usuario AS "idUsuario",
  estado,
  fecha_registro AS "fechaRegistro",
  fecha_expiracion_oferta AS "fechaExpiracionOferta"
`;

const aliasedInscriptionSelect = `
  i.id,
  i.id_clase_grupal AS "idClase",
  i.id_usuario AS "idUsuario",
  i.estado,
  i.fecha_registro AS "fechaRegistro",
  i.fecha_expiracion_oferta AS "fechaExpiracionOferta"
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
      SELECT ${aliasedInscriptionSelect}
      FROM public.inscripciones_clase_grupal i
      INNER JOIN public.usuario u ON u.id = i.id_usuario AND u.activo = TRUE
      INNER JOIN public.rol r ON r.id = u.id_rol AND r.tipo = 'socio'
      WHERE i.id_clase_grupal = $1
        AND i.estado = 'en espera'
        AND EXISTS (
          SELECT 1
          FROM public.suscripcion s
          WHERE s.id_usuario = u.id
            AND s.estado = 'activa'
            AND s.fecha_inicio <= CURRENT_DATE
            AND (s.fecha_fin IS NULL OR s.fecha_fin >= CURRENT_DATE)
            AND (
              s.fecha_proximo_vencimiento IS NULL
              OR s.fecha_proximo_vencimiento >= CURRENT_DATE
            )
        )
      ORDER BY i.fecha_registro ASC, i.id ASC
      LIMIT 1
    `,
    [idClase]
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
            SELECT c.fecha_inicio
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

export const hasActiveMembership = async (idUsuario, client = pool) => {
  const { rows } = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM public.usuario u
        INNER JOIN public.rol r ON r.id = u.id_rol
        INNER JOIN public.suscripcion s ON s.id_usuario = u.id
        WHERE u.id = $1
          AND u.activo = TRUE
          AND r.tipo = 'socio'
          AND s.estado = 'activa'
          AND s.fecha_inicio <= CURRENT_DATE
          AND (s.fecha_fin IS NULL OR s.fecha_fin >= CURRENT_DATE)
          AND (
            s.fecha_proximo_vencimiento IS NULL
            OR s.fecha_proximo_vencimiento >= CURRENT_DATE
          )
      ) AS elegible
    `,
    [idUsuario]
  );
  return rows[0].elegible;
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

export const markIneligibleWaitlistEntries = async (idClase, client = pool) => {
  const { rows } = await client.query(
    `
      UPDATE public.inscripciones_clase_grupal i
      SET estado = 'no_elegible'
      WHERE i.id_clase_grupal = $1
        AND i.estado = 'en espera'
        AND NOT EXISTS (
          SELECT 1
          FROM public.usuario u
          INNER JOIN public.rol r ON r.id = u.id_rol
          INNER JOIN public.suscripcion s ON s.id_usuario = u.id
          WHERE u.id = i.id_usuario
            AND u.activo = TRUE
            AND r.tipo = 'socio'
            AND s.estado = 'activa'
            AND s.fecha_inicio <= CURRENT_DATE
            AND (s.fecha_fin IS NULL OR s.fecha_fin >= CURRENT_DATE)
            AND (
              s.fecha_proximo_vencimiento IS NULL
              OR s.fecha_proximo_vencimiento >= CURRENT_DATE
            )
        )
      RETURNING ${aliasedInscriptionSelect}
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
      SELECT ${inscriptionSelect}
      FROM public.inscripciones_clase_grupal
      WHERE id_clase_grupal = $1
      ORDER BY fecha_registro ASC
    `,
    [idClase]
  );
  return rows;
};
