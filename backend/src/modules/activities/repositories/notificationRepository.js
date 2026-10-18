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
      `Se liberó un lugar en ${evento.nombreClase}. Tu inscripción quedó confirmada.`,
      evento.idClase,
      evento.idInscripcion
    ]
  );
  return rows[0];
};

export const findByUser = async (idUsuario) => {
  const { rows } = await pool.query(
    `
      SELECT ${notificationSelect}
      FROM public.notificaciones_clase_grupal
      WHERE id_usuario = $1
      ORDER BY creada_at DESC
      LIMIT 30
    `,
    [idUsuario]
  );
  return rows;
};

export const markAsRead = async (idNotificacion, idUsuario) => {
  const { rows } = await pool.query(
    `
      UPDATE public.notificaciones_clase_grupal
      SET leida_at = COALESCE(leida_at, NOW())
      WHERE id = $1
        AND id_usuario = $2
      RETURNING ${notificationSelect}
    `,
    [idNotificacion, idUsuario]
  );
  return rows[0] ?? null;
};
