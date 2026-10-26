CREATE TABLE IF NOT EXISTS public.usuario_sede (
  id_usuario BIGINT PRIMARY KEY
    REFERENCES public.usuario(id) ON DELETE CASCADE,
  id_sede BIGINT NOT NULL
    REFERENCES public.sede(id) ON DELETE RESTRICT,
  creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
