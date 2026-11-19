-- =============================================================================
-- VERIFICACIÓN DE ESQUEMA — Módulo M3 Clases Grupales
-- Ejecutar en Supabase (o cualquier PostgreSQL) para detectar inconsistencias.
-- =============================================================================

-- 1. Verificar que existan las tablas
SELECT
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅' ELSE '❌' END AS estado
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('clase_grupal', 'inscripciones_clase_grupal', 'notificaciones_clase_grupal', 'usuario_sede');

-- 2. Verificar columnas de inscripciones_clase_grupal
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inscripciones_clase_grupal'
ORDER BY ordinal_position;

-- 3. Verificar CHECK constraint de estados
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'public.inscripciones_clase_grupal'::regclass
  AND contype = 'c';

-- 4. Verificar índices
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('clase_grupal', 'inscripciones_clase_grupal', 'notificaciones_clase_grupal')
ORDER BY indexname;

-- 5. Verificar si falta la columna fecha_cancelacion
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '❌ FALTA fecha_cancelacion — ejecutar migración 003'
    ELSE '✅ fecha_cancelacion existe'
  END AS estado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inscripciones_clase_grupal'
  AND column_name = 'fecha_cancelacion';

-- 6. Verificar si el CHECK incluye cancelado_tarde
SELECT
  CASE
    WHEN pg_get_constraintdef(oid) LIKE '%cancelado_tarde%' THEN '✅ CHECK incluye cancelado_tarde'
    ELSE '❌ CHECK NO incluye cancelado_tarde — ejecutar migración 003'
  END AS estado
FROM pg_constraint
WHERE conrelid = 'public.inscripciones_clase_grupal'::regclass
  AND conname = 'chk_inscripciones_clase_grupal_estado';

-- 7. Verificar unicidad de inscripción activa
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '❌ FALTA uq_inscripciones_clase_usuario_activa'
    ELSE '✅ Índice único parcial existe'
  END AS estado
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'inscripciones_clase_grupal'
  AND indexname = 'uq_inscripciones_clase_usuario_activa';