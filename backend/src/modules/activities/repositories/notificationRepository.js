import pool from '../../../config/db.js';

const notificationSelect = `
  id,
  tipo,
  mensaje,
  id_clase_grupal AS "idClase",
  id_inscripcion AS "idInscripcion",
  leida_at AS "leidaAt",
  creada_at AS "creadaAt"
`;

const notificationWithOfferStatusSelect = `
  n.id,
  n.tipo,
  n.mensaje,
  n.id_clase_grupal AS "idClase",
  n.id_inscripcion AS "idInscripcion",
  n.leida_at AS "leidaAt",
  n.creada_at AS "creadaAt",
  i.estado AS "estadoInscripcion",
  i.fecha_expiracion_oferta AS "fechaExpiracionOferta",
  COALESCE(
    i.estado = 'expirado'
    OR (
      i.estado = 'notificado'
      AND i.fecha_expiracion_oferta <= NOW()
    ),
    FALSE
  ) AS "ofertaVencida"
`;

export const createWaitlistPromotion = async (evento, client = pool) => {
  const { rows } = await client.query(
    `
      INSERT INTO public.notificaciones_clase_grupal (
        id_usuario,
        tipo,
        mensaje,
        id_clase_grupal,
        id_inscripcion
      )
      VALUES ($1, 'cupo_liberado', $2, $3, $4)
      RETURNING ${notificationSelect}
    `,
    [
      evento.idUsuario,
      `Se liberó un lugar en ${evento.nombreClase} y se generó una oferta temporal para confirmar tu reserva.`,
      evento.idClase,
      evento.idInscripcion
    ]
  );
  return rows[0];
};

export const findByUser = async (idUsuario) => {
  const { rows } = await pool.query(
    `
      SELECT ${notificationWithOfferStatusSelect}
      FROM public.notificaciones_clase_grupal n
      INNER JOIN public.inscripciones_clase_grupal i
        ON i.id = n.id_inscripcion
        AND i.id_usuario = n.id_usuario
      WHERE n.id_usuario = $1
      ORDER BY n.creada_at DESC
      LIMIT 30
    `,
    [idUsuario]
  );
  return rows;
};

export const markAsRead = async (idNotificacion, idUsuario) => {
  const { rows } = await pool.query(
    `
      WITH notification AS (
        UPDATE public.notificaciones_clase_grupal
        SET leida_at = COALESCE(leida_at, NOW())
        WHERE id = $1
          AND id_usuario = $2
        RETURNING
          id,
          tipo,
          mensaje,
          id_usuario,
          id_clase_grupal,
          id_inscripcion,
          leida_at,
          creada_at
      )
      SELECT ${notificationWithOfferStatusSelect}
      FROM notification n
      INNER JOIN public.inscripciones_clase_grupal i
        ON i.id = n.id_inscripcion
        AND i.id_usuario = n.id_usuario
    `,
    [idNotificacion, idUsuario]
  );
  return rows[0] ?? null;
};
