import pool from '../../../config/db.js';

const classColumns = `
  id,
  id_sede AS "idSede",
  nombre,
  profesor,
  cupo,
  fecha_inicio AS "fechaInicio",
  fecha_fin AS "fechaFin"
`;

const classSelect = `
  c.id,
  c.id_sede AS "idSede",
  c.nombre,
  c.profesor,
  c.cupo,
  c.fecha_inicio AS "fechaInicio",
  c.fecha_fin AS "fechaFin",
  COALESCE(inscriptos.confirmados, 0)::int AS "inscriptosConfirmados",
  GREATEST(c.cupo - COALESCE(inscriptos.confirmados, 0), 0)::int AS "cupoDisponible",
  mi.inscripcion AS "miInscripcion"
`;

const activityJoins = `
  LEFT JOIN (
    SELECT
      id_clase_grupal,
      COUNT(*) AS confirmados
    FROM public.inscripciones_clase_grupal
    WHERE estado = 'confirmado'
    GROUP BY id_clase_grupal
  ) inscriptos ON inscriptos.id_clase_grupal = c.id
  LEFT JOIN LATERAL (
    SELECT jsonb_build_object(
      'id', i.id,
      'idClase', i.id_clase_grupal,
      'idUsuario', i.id_usuario,
      'estado', i.estado,
      'fechaRegistro', i.fecha_registro,
      'fechaExpiracionOferta', i.fecha_expiracion_oferta
    ) AS inscripcion
    FROM public.inscripciones_clase_grupal i
    WHERE i.id_clase_grupal = c.id
      AND i.id_usuario = $1
      AND i.estado IN ('confirmado', 'en espera', 'notificado')
    ORDER BY i.fecha_registro DESC, i.id DESC
    LIMIT 1
  ) mi ON TRUE
`;

export const findAllActivities = async (idUsuario = null) => {
  const query = `
    SELECT
      ${classSelect}
    FROM public.clase_grupal c
    ${activityJoins}
    ORDER BY c.fecha_inicio ASC;
  `;

  try {
    const { rows } = await pool.query(query, [idUsuario]);
    return rows;
  } catch (error) {
    console.error('Error en activityRepository.findAllActivities:', error);
    throw error;
  }
};

export const findActivityById = async (id, idUsuario = null, client = pool) => {
  const query = `
    SELECT
      ${classSelect}
    FROM public.clase_grupal c
    ${activityJoins}
    WHERE c.id = $2
    LIMIT 1;
  `;

  try {
    const { rows } = await client.query(query, [idUsuario, id]);
    return rows[0];
  } catch (error) {
    console.error('Error en activityRepository.findActivityById:', error);
    throw error;
  }
};

export const lockActivityById = async (id, client) => {
  const query = `
    SELECT
      c.id,
      c.id_sede AS "idSede",
      c.nombre,
      c.profesor,
      c.cupo,
      c.fecha_inicio AS "fechaInicio",
      c.fecha_fin AS "fechaFin"
    FROM public.clase_grupal c
    WHERE c.id = $1
    FOR UPDATE;
  `;

  try {
    const { rows } = await client.query(query, [id]);
    return rows[0];
  } catch (error) {
    console.error('Error en activityRepository.lockActivityById:', error);
    throw error;
  }
};

export const createActivity = async (dto) => {
  const query = `
    INSERT INTO public.clase_grupal (
      id_sede,
      nombre,
      profesor,
      cupo,
      fecha_inicio,
      fecha_fin
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      ${classColumns};
  `;

  const values = [
    dto.idSede,
    dto.nombre,
    dto.profesor,
    dto.cupo,
    dto.fechaInicio,
    dto.fechaFin
  ];

  try {
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error('Error en activityRepository.createActivity:', error);
    throw error;
  }
};

export const updateActivity = async (id, dto, client = pool) => {
  const query = `
    UPDATE public.clase_grupal
    SET
      id_sede = $1,
      nombre = $2,
      profesor = $3,
      cupo = $4,
      fecha_inicio = $5,
      fecha_fin = $6
    WHERE id = $7
    RETURNING
      ${classColumns};
  `;

  const values = [
    dto.idSede,
    dto.nombre,
    dto.profesor,
    dto.cupo,
    dto.fechaInicio,
    dto.fechaFin,
    id
  ];

  try {
    const { rows } = await client.query(query, values);
    return rows[0];
  } catch (error) {
    console.error('Error en activityRepository.updateActivity:', error);
    throw error;
  }
};

export const deleteActivity = async (id) => {
  const query = `
    DELETE FROM public.clase_grupal
    WHERE id = $1
    RETURNING
      ${classColumns};
  `;

  try {
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  } catch (error) {
    console.error('Error en activityRepository.deleteActivity:', error);
    throw error;
  }
};