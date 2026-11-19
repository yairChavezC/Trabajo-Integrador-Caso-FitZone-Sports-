-- Migración 003: penalidad por cancelación tardía de clases grupales
-- Agrega columna fecha_cancelacion y un índice parcial para consultar
-- cancelaciones tardías recientes por usuario.
-- También asegura que el CHECK de estados incluya 'cancelado_tarde',
-- reemplazándolo si la base tiene una versión vieja sin ese valor.

ALTER TABLE public.inscripciones_clase_grupal
  ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMP WITHOUT TIME ZONE;

-- Si el CHECK existe pero no incluye 'cancelado_tarde', lo recreamos.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_inscripciones_clase_grupal_estado'
      AND conrelid = 'public.inscripciones_clase_grupal'::regclass
      AND pg_get_constraintdef(oid) NOT LIKE '%cancelado_tarde%'
  ) THEN
    ALTER TABLE public.inscripciones_clase_grupal
      DROP CONSTRAINT chk_inscripciones_clase_grupal_estado;

    ALTER TABLE public.inscripciones_clase_grupal
      ADD CONSTRAINT chk_inscripciones_clase_grupal_estado CHECK (
        estado IN (
          'confirmado',
          'en espera',
          'notificado',
          'cancelado',
          'cancelado_tarde',
          'expirado',
          'no_elegible'
        )
      ) NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_inscripciones_cancelado_tarde_usuario_fecha
  ON public.inscripciones_clase_grupal (id_usuario, fecha_cancelacion)
  WHERE estado = 'cancelado_tarde';
