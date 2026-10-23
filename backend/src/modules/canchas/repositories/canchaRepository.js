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


export const findReservasPorSedeYFecha = async (idSede, fechaStr) => {
  const query = `
    SELECT 
      rc.id_cancha,
      TO_CHAR(rc.fecha_inicio, 'HH24:MI') AS hora_inicio,
      TO_CHAR(rc.fecha_fin, 'HH24:MI') AS hora_fin,
      rc.estado
    FROM public.reserva_cancha rc
    INNER JOIN public.cancha c ON rc.id_cancha = c.id
    WHERE c.id_sede = $1
      AND rc.fecha_inicio >= $2::date
      AND rc.fecha_inicio < ($2::date + INTERVAL '1 day')
      AND rc.estado != 'cancelada';
  `;
  const { rows } = await pool.query(query, [idSede, fechaStr]);
  return rows;
};