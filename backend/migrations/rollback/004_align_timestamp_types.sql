-- Rollback de migración 004: Restaurar tipos TIMESTAMPTZ en usuario_sede y notificaciones_clase_grupal
-- Nota: Este rollback revierte los tipos de fecha a TIMESTAMPTZ.
-- Solo ejecutar si se necesita volver atrás.

ALTER TABLE public.usuario_sede
  ALTER COLUMN creado_at TYPE TIMESTAMPTZ USING creado_at AT TIME ZONE 'UTC';

ALTER TABLE public.notificaciones_clase_grupal
  ALTER COLUMN creada_at TYPE TIMESTAMPTZ USING creada_at AT TIME ZONE 'UTC';

ALTER TABLE public.notificaciones_clase_grupal
  ALTER COLUMN leida_at TYPE TIMESTAMPTZ USING leida_at AT TIME ZONE 'UTC';