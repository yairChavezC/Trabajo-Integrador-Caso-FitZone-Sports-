import pool from '../../config/db.js';

/**
 * Verifica si ya existe una reserva activa que se solape con el intervalo pedido.
 */
export const existeSolapamiento = async (idCancha, fechaInicio, fechaFin) => {
  const query = `
    SELECT id 
    FROM public.reserva_cancha
    WHERE id_cancha = $1
      AND estado != 'cancelada'
      AND (
        (fecha_inicio < $3 AND fecha_fin > $2)
      )
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [idCancha, fechaInicio, fechaFin]);
  return rows.length > 0;
};

/**
 * Inserta la reserva en estado pendiente.
 */
export const insertReserva = async ({ idCancha, idUsuario, fechaInicio, fechaFin, monto }) => {
  const query = `
    INSERT INTO public.reserva_cancha (
      id_cancha, 
      id_usuario, 
      fecha_inicio, 
      fecha_fin, 
      monto_total, 
      estado
    )
    VALUES ($1, $2, $3, $4, $5, 'pendiente')
    RETURNING 
      id, 
      id_cancha, 
      id_usuario, 
      fecha_inicio, 
      fecha_fin, 
      monto_total, 
      estado;
  `;
  const values = [idCancha, idUsuario, fechaInicio, fechaFin, monto];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

/**
 * Actualiza el estado de la reserva (confirmada, cancelada, etc.).
 */
export const updateEstadoReserva = async (idReserva, nuevoEstado) => {
  const query = `
    UPDATE public.reserva_cancha
    SET estado = $2
    WHERE id = $1
    RETURNING 
      id, 
      id_cancha, 
      id_usuario, 
      fecha_inicio, 
      fecha_fin, 
      monto_total, 
      estado;
  `;
  const { rows } = await pool.query(query, [idReserva, nuevoEstado]);
  return rows[0] || null;
};



export const findReservasByUsuario = async (idUsuario) => {
  const query = `
    SELECT 
      rc.id,
      rc.id_cancha AS "idCancha",
      c.nombre AS "nombreCancha",
      c.tipo AS "tipoCancha",
      rc.id_usuario AS "idUsuario",
      rc.fecha_inicio AS "fechaInicio",
      rc.fecha_fin AS "fechaFin",
      rc.monto_total AS "montoTotal",
      rc.estado
    FROM public.reserva_cancha rc
    LEFT JOIN public.cancha c ON c.id = rc.id_cancha
    WHERE rc.id_usuario = $1
    ORDER BY rc.fecha_inicio DESC;
  `;
  const { rows } = await pool.query(query, [idUsuario]);
  return rows;
};