export const createReservaCanchaRepository = (pool) => {
  /**
   * Verifica si ya existe una reserva activa que se solape con el intervalo pedido.
   */
  const existeSolapamiento = async (idCancha, fechaInicio, fechaFin, dbClient = pool) => {
    const query = `
      SELECT id 
      FROM public.reserva_cancha
      WHERE id_cancha = $1
        AND estado != 'cancelada'
        AND (fecha_inicio < $3 AND fecha_fin > $2)
      LIMIT 1;
    `;
    const { rows } = await dbClient.query(query, [idCancha, fechaInicio, fechaFin]);
    return rows.length > 0;
  };

  /**
   * Inserta la reserva en estado pendiente (sin transacción propia).
   */
  const insertReserva = async ({ idCancha, idUsuario, fechaInicio, fechaFin, monto }, dbClient = pool) => {
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
    const { rows } = await dbClient.query(query, values);
    return rows[0];
  };

  /**
   * Ejecuta la reserva dentro de una transacción con BLOQUEO PESIMISTA (FOR UPDATE)
   * sobre la fila de la cancha para garantizar RN-02 (no sobreventa).
   */
  const insertReservaConBloqueoPesimista = async ({ idCancha, idUsuario, fechaInicio, fechaFin, monto }) => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Adquirimos bloqueo pesimista a nivel de fila sobre la cancha
      const lockQuery = `
        SELECT id 
        FROM public.cancha 
        WHERE id = $1 
        FOR UPDATE;
      `;
      const lockResult = await client.query(lockQuery, [idCancha]);

      if (lockResult.rows.length === 0) {
        const error = new Error(`No existe la cancha con ID ${idCancha}.`);
        error.status = 404;
        throw error;
      }

      // 2. Verificamos solapamiento dentro de la sección crítica bloqueada
      const ocupado = await existeSolapamiento(idCancha, fechaInicio, fechaFin, client);
      if (ocupado) {
        const error = new Error('El horario seleccionado ya se encuentra ocupado o reservado.');
        error.status = 409;
        throw error;
      }

      // 3. Insertamos la reserva de forma segura antes de liberar el lock
      const nuevaReserva = await insertReserva(
        { idCancha, idUsuario, fechaInicio, fechaFin, monto },
        client
      );

      await client.query('COMMIT');
      return nuevaReserva;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  /**
   * Actualiza el estado de la reserva (confirmada, cancelada, etc.).
   */
  const updateEstadoReserva = async (idReserva, nuevoEstado) => {
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

  const findReservasByUsuario = async (idUsuario) => {
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

  return {
    existeSolapamiento,
    insertReserva,
    insertReservaConBloqueoPesimista,
    updateEstadoReserva,
    findReservasByUsuario
  };
};