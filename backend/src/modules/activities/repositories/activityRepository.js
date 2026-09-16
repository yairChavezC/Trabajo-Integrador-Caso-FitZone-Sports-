import pool from '../../../config/db.js';

const classSelect = `
  id,
  id_sede AS "idSede",
  nombre,
  profesor,
  cupo,
  fecha_inicio AS "fechaInicio",
  fecha_fin AS "fechaFin"
`;

export const findAllActivities = async () => {
  const query = `
    SELECT
      ${classSelect}
    FROM public.clase_grupal
    ORDER BY fecha_inicio ASC;
  `;

  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error en activityRepository.findAllActivities:', error);
    throw error;
  }
};

export const findActivityById = async (id) => {
  const query = `
    SELECT
      ${classSelect}
    FROM public.clase_grupal
    WHERE id = $1
    LIMIT 1;
  `;

  try {
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  } catch (error) {
    console.error('Error en activityRepository.findActivityById:', error);
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
      ${classSelect};
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

export const updateActivity = async (id, dto) => {
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
      ${classSelect};
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
    const { rows } = await pool.query(query, values);
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
      ${classSelect};
  `;

  try {
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  } catch (error) {
    console.error('Error en activityRepository.deleteActivity:', error);
    throw error;
  }
};