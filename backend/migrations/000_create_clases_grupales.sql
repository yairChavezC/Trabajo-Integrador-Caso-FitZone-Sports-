CREATE TABLE IF NOT EXISTS public.clase_grupal (
  id BIGSERIAL PRIMARY KEY,
  id_sede BIGINT NOT NULL
    REFERENCES public.sede(id) ON DELETE RESTRICT,
  nombre VARCHAR NOT NULL,
  profesor VARCHAR(150),
  cupo INTEGER NOT NULL DEFAULT 20,
  fecha_inicio TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  fecha_fin TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  CONSTRAINT chk_clase_grupal_cupo CHECK (cupo > 0),
  CONSTRAINT chk_clase_grupal_fechas CHECK (fecha_fin > fecha_inicio)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_clase_grupal_cupo'
      AND conrelid = 'public.clase_grupal'::regclass
  ) THEN
    ALTER TABLE public.clase_grupal
      ADD CONSTRAINT chk_clase_grupal_cupo CHECK (cupo > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_clase_grupal_fechas'
      AND conrelid = 'public.clase_grupal'::regclass
  ) THEN
    ALTER TABLE public.clase_grupal
      ADD CONSTRAINT chk_clase_grupal_fechas CHECK (fecha_fin > fecha_inicio) NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_clase_grupal_sede_fecha
  ON public.clase_grupal (id_sede, fecha_inicio);

CREATE TABLE IF NOT EXISTS public.inscripciones_clase_grupal (
  id BIGSERIAL PRIMARY KEY,
  id_clase_grupal BIGINT NOT NULL
    REFERENCES public.clase_grupal(id) ON DELETE RESTRICT,
  id_usuario BIGINT NOT NULL
    REFERENCES public.usuario(id) ON DELETE RESTRICT,
  estado VARCHAR(30) NOT NULL,
  fecha_registro TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  fecha_expiracion_oferta TIMESTAMP WITHOUT TIME ZONE,
  CONSTRAINT chk_inscripciones_clase_grupal_estado CHECK (
    estado IN (
      'confirmado',
      'en espera',
      'notificado',
      'cancelado',
      'cancelado_tarde',
      'expirado',
      'no_elegible'
    )
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_inscripciones_clase_grupal_estado'
      AND conrelid = 'public.inscripciones_clase_grupal'::regclass
  ) THEN
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

CREATE INDEX IF NOT EXISTS idx_inscripciones_clase_grupal_fecha
  ON public.inscripciones_clase_grupal (id_clase_grupal, fecha_registro, id);

CREATE INDEX IF NOT EXISTS idx_inscripciones_clase_grupal_usuario
  ON public.inscripciones_clase_grupal (id_usuario);