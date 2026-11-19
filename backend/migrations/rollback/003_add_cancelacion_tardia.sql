-- Reversión de la migración 003: penalidad por cancelación tardía
-- Elimina el índice parcial y la columna fecha_cancelacion.

DROP INDEX IF EXISTS public.idx_inscripciones_cancelado_tarde_usuario_fecha;

ALTER TABLE public.inscripciones_clase_grupal
  DROP COLUMN IF EXISTS fecha_cancelacion;