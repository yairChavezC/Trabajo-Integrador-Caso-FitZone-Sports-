import pool from '../../../config/db.js';

const aliasedInscriptionSelect = `
  i.id,
  i.id_clase_grupal AS "idClase",
  i.id_usuario AS "idUsuario",
  i.estado,
  i.fecha_registro AS "fechaRegistro",
  i.fecha_expiracion_oferta AS "fechaExpiracionOferta"
`;

/**
 * Consultas de elegibilidad de membresía.
 *
 * Estas consultas leen tablas de otros módulos (usuario, rol, suscripcion).
 * Viven fuera de inscriptionRepository para no acoplar el repositorio de
 * inscripciones al dominio de usuarios y membresías. El servicio de clases es
 * quien las coordina como dependencia transversal.
 */
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
