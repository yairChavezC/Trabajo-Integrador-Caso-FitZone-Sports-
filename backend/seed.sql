-- Seed de datos de prueba para FitZone Sports
-- Crea 25 sedes, usuarios de los 4 roles, clases grupales y un caso de lista de espera para demo.
-- Ejecutar: psql -U postgres -d fitzone_dev -f backend/seed.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. ROLES (si no existen)
-- ---------------------------------------------------------------------------
INSERT INTO public.rol (id, tipo) VALUES
  (1, 'administrador'),
  (2, 'cliente_externo'),
  (3, 'socio'),
  (4, 'gerente'),
  (5, 'recepcionista')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. SEDES (25 sedes)
-- ---------------------------------------------------------------------------
INSERT INTO public.sede (id, nombre, provincia, ciudad, cupo, activa) VALUES
  (1, 'Sede Central', 'Buenos Aires', 'CABA', 50, TRUE),
  (2, 'Sede Norte', 'Buenos Aires', 'Vicente López', 40, TRUE),
  (3, 'Sede Sur', 'Buenos Aires', 'Avellaneda', 45, TRUE),
  (4, 'Sede Oeste', 'Buenos Aires', 'Morón', 35, TRUE),
  (5, 'Sede Este', 'Buenos Aires', 'La Plata', 40, TRUE),
  (6, 'Sede Córdoba Centro', 'Córdoba', 'Córdoba', 50, TRUE),
  (7, 'Sede Córdoba Norte', 'Córdoba', 'Córdoba', 30, TRUE),
  (8, 'Sede Rosario Centro', 'Santa Fe', 'Rosario', 45, TRUE),
  (9, 'Sede Rosario Norte', 'Santa Fe', 'Rosario', 35, TRUE),
  (10, 'Sede Mendoza', 'Mendoza', 'Mendoza', 40, TRUE),
  (11, 'Sede Tucumán', 'Tucumán', 'San Miguel de Tucumán', 35, TRUE),
  (12, 'Sede Salta', 'Salta', 'Salta', 30, TRUE),
  (13, 'Sede Santa Fe', 'Santa Fe', 'Santa Fe', 40, TRUE),
  (14, 'Sede Mar del Plata', 'Buenos Aires', 'Mar del Plata', 45, TRUE),
  (15, 'Sede Bahía Blanca', 'Buenos Aires', 'Bahía Blanca', 30, TRUE),
  (16, 'Sede La Plata', 'Buenos Aires', 'La Plata', 40, TRUE),
  (17, 'Sede Quilmes', 'Buenos Aires', 'Quilmes', 35, TRUE),
  (18, 'Sede San Isidro', 'Buenos Aires', 'San Isidro', 40, TRUE),
  (19, 'Sede Tigre', 'Buenos Aires', 'Tigre', 30, TRUE),
  (20, 'Sede Pilar', 'Buenos Aires', 'Pilar', 35, TRUE),
  (21, 'Sede Lomas de Zamora', 'Buenos Aires', 'Lomas de Zamora', 40, TRUE),
  (22, 'Sede Lanús', 'Buenos Aires', 'Lanús', 35, TRUE),
  (23, 'Sede San Martín', 'Buenos Aires', 'San Martín', 30, TRUE),
  (24, 'Sede Tres de Febrero', 'Buenos Aires', 'Caseros', 35, TRUE),
  (25, 'Sede Morón', 'Buenos Aires', 'Morón', 30, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. PLANES
-- ---------------------------------------------------------------------------
INSERT INTO public.plan (id, nombre, precio, intervalo, duracion_dias, activo) VALUES
  (1, 'Plan Mensual', 5000.00, 'mensual', 30, TRUE),
  (2, 'Plan Trimestral', 13500.00, 'trimestral', 90, TRUE),
  (3, 'Plan Anual', 48000.00, 'anual', 365, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. USUARIOS DE PRUEBA (4 roles)
-- ---------------------------------------------------------------------------
-- Gerente
INSERT INTO public.usuario (id, dni, nombre, contacto, password, id_rol, activo) VALUES
  (1, '10000001', 'Gerente General', 'gerente@fitzone.test', 'password123', 4, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Recepcionista (asignado a Sede Central)
INSERT INTO public.usuario (id, dni, nombre, contacto, password, id_rol, activo) VALUES
  (2, '10000002', 'Recepcionista Sede Central', 'recepcionista@fitzone.test', 'password123', 5, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.usuario_sede (id_usuario, id_sede) VALUES
  (2, 1)
ON CONFLICT (id_usuario) DO NOTHING;

-- Socios (uno por sede para tener variedad)
INSERT INTO public.usuario (id, dni, nombre, contacto, password, id_rol, activo) VALUES
  (3, '10000003', 'Socio Demo 1', 'socio1@fitzone.test', 'password123', 3, TRUE),
  (4, '10000004', 'Socio Demo 2', 'socio2@fitzone.test', 'password123', 3, TRUE),
  (5, '10000005', 'Socio Demo 3', 'socio3@fitzone.test', 'password123', 3, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Suscripciones activas para los socios
INSERT INTO public.suscripcion (id_usuario, id_plan, fecha_inicio, fecha_fin, estado, fecha_proximo_vencimiento) VALUES
  (3, 1, CURRENT_DATE - 5, CURRENT_DATE + 25, 'activa', CURRENT_DATE + 25),
  (4, 1, CURRENT_DATE - 5, CURRENT_DATE + 25, 'activa', CURRENT_DATE + 25),
  (5, 1, CURRENT_DATE - 5, CURRENT_DATE + 25, 'activa', CURRENT_DATE + 25)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. CLASES GRUPALES (una por sede, la primera con cupo lleno para demo de lista de espera)
-- ---------------------------------------------------------------------------

-- Clase en Sede Central (cupo lleno para demo de lista de espera)
INSERT INTO public.clase_grupal (id, id_sede, nombre, profesor, cupo, fecha_inicio, fecha_fin) VALUES
  (1, 1, 'Yoga Matutino', 'Prof. Ana García', 2, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 1 hour')
ON CONFLICT (id) DO NOTHING;

-- Inscripciones confirmadas para llenar la clase de Yoga (cupo=2)
INSERT INTO public.inscripciones_clase_grupal (id, id_clase_grupal, id_usuario, estado, fecha_registro) VALUES
  (1, 1, 3, 'confirmado', NOW()),
  (2, 1, 4, 'confirmado', NOW())
ON CONFLICT (id) DO NOTHING;

-- Inscripción en lista de espera para la clase de Yoga (demo)
INSERT INTO public.inscripciones_clase_grupal (id, id_clase_grupal, id_usuario, estado, fecha_registro) VALUES
  (3, 1, 5, 'en espera', NOW())
ON CONFLICT (id) DO NOTHING;

-- Clases en otras sedes (una por sede, con cupos disponibles)
INSERT INTO public.clase_grupal (id, id_sede, nombre, profesor, cupo, fecha_inicio, fecha_fin)
SELECT
  100 + s.id,
  s.id,
  'Clase Demo Sede ' || s.id,
  'Prof. Demo',
  20,
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '2 days 1 hour'
FROM public.sede s
WHERE s.id > 1
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. NOTIFICACIONES DE DEMO (oferta de lista de espera para el socio 5)
-- ---------------------------------------------------------------------------
INSERT INTO public.notificaciones_clase_grupal (id, id_usuario, tipo, mensaje, id_clase_grupal, id_inscripcion) VALUES
  (1, 5, 'oferta_temporal_lista_espera', 'Se liberó un cupo en Yoga Matutino. Aceptá antes de 15 minutos.', 1, 3)
ON CONFLICT (id) DO NOTHING;

-- Actualizar la inscripción del socio 5 a 'notificado' para que vea la oferta
UPDATE public.inscripciones_clase_grupal
SET estado = 'notificado', fecha_expiracion_oferta = NOW() + INTERVAL '15 minutes'
WHERE id = 3;

COMMIT;

-- ---------------------------------------------------------------------------
-- RESUMEN DE DATOS DE PRUEBA
-- ---------------------------------------------------------------------------
-- Roles:
--   - Gerente:      DNI 10000001, password123
--   - Recepcionista: DNI 10000002, password123 (Sede Central)
--   - Socio 1:      DNI 10000003, password123
--   - Socio 2:      DNI 10000004, password123
--   - Socio 3:      DNI 10000005, password123 (en lista de espera para Yoga)
--
-- Sedes: 25 sedes creadas
-- Clases: 25 clases (1 por sede), la primera (Yoga Matutino) con cupo lleno y lista de espera
-- Demo de lista de espera: Socio 3 tiene oferta pendiente en Yoga Matutino