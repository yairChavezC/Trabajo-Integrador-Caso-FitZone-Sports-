CREATE TABLE IF NOT EXISTS public.notificaciones_clase_grupal (
  id BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  mensaje TEXT NOT NULL,
  id_clase_grupal BIGINT NOT NULL,
  id_inscripcion BIGINT NOT NULL,
  creada_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  leida_at TIMESTAMP WITHOUT TIME ZONE,
  CONSTRAINT fk_notificaciones_clase_grupal_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES public.usuario(id) ON DELETE RESTRICT,
  CONSTRAINT fk_notificaciones_clase_grupal_clase
    FOREIGN KEY (id_clase_grupal)
    REFERENCES public.clase_grupal(id) ON DELETE RESTRICT,
  CONSTRAINT fk_notificaciones_clase_grupal_inscripcion
    FOREIGN KEY (id_inscripcion)
    REFERENCES public.inscripciones_clase_grupal(id) ON DELETE RESTRICT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_notificaciones_clase_grupal_usuario'
      AND conrelid = 'public.notificaciones_clase_grupal'::regclass
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.notificaciones_clase_grupal n
      LEFT JOIN public.usuario u ON u.id = n.id_usuario
      WHERE u.id IS NULL
    ) THEN
      RAISE EXCEPTION 'No se puede agregar la FK de notificaciones a usuario: hay referencias huérfanas.';
    END IF;
    ALTER TABLE public.notificaciones_clase_grupal
      ADD CONSTRAINT fk_notificaciones_clase_grupal_usuario
      FOREIGN KEY (id_usuario)
      REFERENCES public.usuario(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_notificaciones_clase_grupal_clase'
      AND conrelid = 'public.notificaciones_clase_grupal'::regclass
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.notificaciones_clase_grupal n
      LEFT JOIN public.clase_grupal c ON c.id = n.id_clase_grupal
      WHERE c.id IS NULL
    ) THEN
      RAISE EXCEPTION 'No se puede agregar la FK de notificaciones a clase_grupal: hay referencias huérfanas.';
    END IF;
    ALTER TABLE public.notificaciones_clase_grupal
      ADD CONSTRAINT fk_notificaciones_clase_grupal_clase
      FOREIGN KEY (id_clase_grupal)
      REFERENCES public.clase_grupal(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_notificaciones_clase_grupal_inscripcion'
      AND conrelid = 'public.notificaciones_clase_grupal'::regclass
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.notificaciones_clase_grupal n
      LEFT JOIN public.inscripciones_clase_grupal i ON i.id = n.id_inscripcion
      WHERE i.id IS NULL
    ) THEN
      RAISE EXCEPTION 'No se puede agregar la FK de notificaciones a inscripciones_clase_grupal: hay referencias huérfanas.';
    END IF;
    ALTER TABLE public.notificaciones_clase_grupal
      ADD CONSTRAINT fk_notificaciones_clase_grupal_inscripcion
      FOREIGN KEY (id_inscripcion)
      REFERENCES public.inscripciones_clase_grupal(id) ON DELETE RESTRICT;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_notificaciones_clase_grupal_usuario_fecha
  ON public.notificaciones_clase_grupal (id_usuario, creada_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificaciones_clase_grupal_clase
  ON public.notificaciones_clase_grupal (id_clase_grupal);

CREATE INDEX IF NOT EXISTS idx_notificaciones_clase_grupal_inscripcion
  ON public.notificaciones_clase_grupal (id_inscripcion);

CREATE INDEX IF NOT EXISTS idx_inscripciones_clase_confirmadas
  ON public.inscripciones_clase_grupal (id_clase_grupal)
  WHERE estado = 'confirmado';

CREATE INDEX IF NOT EXISTS idx_inscripciones_usuario_activas
  ON public.inscripciones_clase_grupal (
    id_clase_grupal,
    id_usuario,
    fecha_registro DESC,
    id DESC
  )
  WHERE estado IN ('confirmado', 'en espera', 'notificado');

CREATE INDEX IF NOT EXISTS idx_inscripciones_lista_espera_fifo
  ON public.inscripciones_clase_grupal (
    id_clase_grupal,
    fecha_registro ASC,
    id ASC
  )
  WHERE estado = 'en espera';

CREATE UNIQUE INDEX IF NOT EXISTS uq_inscripciones_clase_usuario_activa
  ON public.inscripciones_clase_grupal (id_clase_grupal, id_usuario)
  WHERE estado IN ('confirmado', 'en espera', 'notificado');
