import pool from '../../../config/db.js';

export const findCanchasConConfigPorSede = async (idSede, diaSemana) => {
  const query = `
    SELECT 
      c.id,
      c.nombre,
      c.tipo,
      c.precio_base,
      c.id_sede,
      c.estado,
      h.hora_apertura,
      h.hora_cierre,
      h.duracion_slot,
      h.inicio_hora_pico,
      h.fin_hora_pico,
      h.precio_hora_pico
    FROM public.cancha c
    LEFT JOIN public.horarios_cancha_config h 
      ON c.id = h.id_cancha AND h.dia_semana = $2
    WHERE c.id_sede = $1 AND c.estado = 'disponible'
    ORDER BY c.id ASC;
  `;
  const { rows } = await pool.query(query, [idSede, diaSemana]);
  return rows;
};