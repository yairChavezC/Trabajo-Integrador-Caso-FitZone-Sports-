CREATE TABLE IF NOT EXISTS public.notificaciones_clase_grupal (
  id BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  mensaje TEXT NOT NULL,
  id_clase_grupal BIGINT NOT NULL,
  id_inscripcion BIGINT NOT NULL,
  creada_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  leida_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_clase_grupal_usuario_fecha
  ON public.notificaciones_clase_grupal (id_usuario, creada_at DESC);

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
