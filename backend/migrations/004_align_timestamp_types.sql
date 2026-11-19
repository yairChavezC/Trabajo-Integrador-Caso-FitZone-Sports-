-- Migración 004: Alinear tipos de fecha a TIMESTAMP WITHOUT TIME ZONE
-- Las migraciones 001 y 002 originalmente usaban TIMESTAMPTZ.
-- Esta migración corrige bases existentes para mantener consistencia
-- con el resto del esquema (clase_grupal, inscripciones_clase_grupal).

-- Corregir usuario_sede.creado_at si es TIMESTAMPTZ
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuario_sede'
      AND column_name = 'creado_at'
      AND data_type = 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.usuario_sede
      ALTER COLUMN creado_at TYPE TIMESTAMP WITHOUT TIME ZONE USING creado_at AT TIME ZONE 'UTC';
  END IF;
END;
$$;

-- Corregir notificaciones_clase_grupal.creada_at y leida_at si son TIMESTAMPTZ
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notificaciones_clase_grupal'
      AND column_name = 'creada_at'
      AND data_type = 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.notificaciones_clase_grupal
      ALTER COLUMN creada_at TYPE TIMESTAMP WITHOUT TIME ZONE USING creada_at AT TIME ZONE 'UTC';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notificaciones_clase_grupal'
      AND column_name = 'leida_at'
      AND data_type = 'timestamp with time zone'
  ) THEN
    ALTER TABLE public.notificaciones_clase_grupal
      ALTER COLUMN leida_at TYPE TIMESTAMP WITHOUT TIME ZONE USING leida_at AT TIME ZONE 'UTC';
  END IF;
END;
$$;