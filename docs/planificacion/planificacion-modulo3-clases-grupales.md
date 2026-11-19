# Planificación — Módulo M3: Clases Grupales

## Historias de Usuario

### RF-06: Reserva de clases grupales

**Como** socio activo
**Quiero** reservar un lugar en una clase grupal
**Para** asegurar mi cupo y planificar mi rutina

**Criterios de aceptación:**
- [x] El socio puede ver la agenda de clases disponibles
- [x] El socio puede reservar un lugar si hay cupo disponible
- [x] El sistema rechaza la reserva si el cupo está completo (409)
- [x] El sistema rechaza si el socio ya tiene una inscripción activa en esa clase (409)
- [x] El sistema rechaza si la membresía no está activa (403)
- [x] El sistema rechaza si la clase ya comenzó (409)
- [x] Dos reservas simultáneas no confirman más cupos que los disponibles (RN-02)

**Subtareas estimadas:**
| Subtarea | Estimado | Estado |
|----------|----------|--------|
| Modelo de datos `clase_grupal` y `inscripciones_clase_grupal` | 3h | ✅ |
| Repositorio `activityRepository` (CRUD clases) | 4h | ✅ |
| Repositorio `inscriptionRepository` (CRUD inscripciones) | 4h | ✅ |
| `classPolicy.js` (ventanas de tiempo, capacidad) | 3h | ✅ |
| `inscriptionService.reserveClass` con transacción | 5h | ✅ |
| Controlador y rutas `POST /clases/{id}/reservas` | 3h | ✅ |
| Tests unitarios (servicio, repos, policy) | 4h | ✅ |
| Test de integración (reserva confirmada) | 3h | ✅ |
| Test de concurrencia (no sobreventa) | 3h | ✅ |

### RF-07: Cancelaciones con y sin penalidad

**Como** socio activo
**Quiero** cancelar una reserva con anticipación
**Para** liberar mi cupo sin penalización

**Criterios de aceptación:**
- [x] El socio puede cancelar con > 2h de antelación sin penalidad (estado `cancelado`)
- [x] El socio puede cancelar con < 2h de antelación, se marca como `cancelado_tarde`
- [x] Tras cancelación tardía, el socio no puede reservar por N horas (penalidad)
- [x] El socio no puede cancelar después del inicio de la clase (409)
- [x] Al cancelar, se promueve al siguiente en lista de espera si existe

**Subtareas estimadas:**
| Subtarea | Estimado | Estado |
|----------|----------|--------|
| Migración 003 (`fecha_cancelacion`, CHECK, índice) | 3h | ✅ |
| `classPolicy.esCancelacionTardia` | 1h | ✅ |
| `inscriptionService.cancelClassReservation` | 4h | ✅ |
| `verificarSinBloqueoPorCancelacionTardia` | 3h | ✅ |
| Controlador y rutas `DELETE /clases/{id}/reservas` | 2h | ✅ |
| Tests unitarios (cancelación normal, tardía, bloqueo) | 4h | ✅ |
| Test de integración (cancelar tarde bloquea reservas) | 3h | ✅ |

### RF-08: Lista de espera

**Como** socio activo
**Quiero** anotarme en lista de espera cuando una clase está completa
**Para** tener oportunidad de acceder si se libera un cupo

**Criterios de aceptación:**
- [x] El socio puede anotarse en lista de espera si la clase está completa
- [x] El sistema rechaza si aún hay cupos disponibles (409)
- [x] Al liberarse un cupo, se promueve al siguiente en lista (FIFO)
- [x] Se envía notificación transaccional al socio promovido
- [x] El socio tiene N minutos para aceptar la oferta (default 15)
- [x] Si la oferta vence, la inscripción pasa a `expirado`
- [x] El socio puede rechazar la oferta (vuelve a `en espera` o se cancela)
- [x] Si el socio pierde membresía, pasa a `no_elegible`

**Subtareas estimadas:**
| Subtarea | Estimado | Estado |
|----------|----------|--------|
| `waitlistObserver.js` (Subject + Observers) | 4h | ✅ |
| `inscriptionRepository` (lista de espera, ofertas) | 4h | ✅ |
| `inscriptionService.joinWaitlist` | 3h | ✅ |
| `inscriptionService.acceptWaitlistOffer` | 3h | ✅ |
| `inscriptionService.expireWaitlistOffers` + worker | 3h | ✅ |
| Notificaciones (`notificaciones_clase_grupal`) | 3h | ✅ |
| Controlador y rutas (`/lista-espera`, `/lista-espera/aceptar`) | 3h | ✅ |
| Tests unitarios (lista de espera, ofertas, vencimiento) | 5h | ✅ |
| Test de integración (promoción, vencimiento, no_elegible) | 4h | ✅ |

## Trazabilidad

| Requisito | Historia | Prueba |
|-----------|----------|--------|
| RF-06 | Reserva de clases grupales | `inscriptionService.test.js` (reserva confirmada, cupo lleno, duplicada) + `activityIntegration.test.js` (1, 2, 3) |
| RF-07 | Cancelaciones con/sin penalidad | `inscriptionService.test.js` (cancelación normal, tardía, bloqueo) + `activityIntegration.test.js` (7) |
| RF-08 | Lista de espera | `inscriptionService.test.js` (lista de espera, ofertas, vencimiento) + `activityIntegration.test.js` (4, 5) |
| RN-03 | Tarifas diferenciadas | `membershipRepository.test.js` (membresía activa) |
| RNF-04 | Alta de sede sin detener sistema | `activityService.test.js` (CRUD clases por sede) |

## Seguimiento por Sprint

| Sprint | Comprometido (h) | Completado (h) | Desvío | Observación |
|--------|-------------------|-----------------|--------|-------------|
| Sprint 1 | 12 | 14 | +2h | Aprendizaje de Express y PostgreSQL |
| Sprint 2 | 16 | 18 | +2h | Transacciones y bloqueo pesimista más complejo de lo esperado |
| Sprint 3 | 20 | 22 | +2h | Patrón Observer requirió refactorización |
| Sprint 4 | 24 | 28 | +4h | Penalidad por cancelación tardía no estaba en estimación inicial |
| Sprint 5 | 16 | 16 | 0h | Tests de integración y concurrencia |
| Sprint 6 | 12 | 10 | -2h | Refactorización y limpieza de código |
| Sprint 7 | 8 | 8 | 0h | Documentación y ADRs |
| Sprint 8 | 8 | 8 | 0h | Cierre y ajustes finales |

**Total comprometido:** 116h | **Total trabajado:** 124h | **Desvío acumulado:** +8h (6.9%)

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación | Qué ocurrió |
|--------|-------------|---------|------------|-------------|
| Sobreventa de cupos en concurrencia | Media | Alto | Bloqueo pesimista (SELECT FOR UPDATE) + índice único parcial | ✅ Se materializó parcialmente. Se resolvió con `lockActivityById` + índice único |
| Complejidad del patrón Observer | Media | Medio | Diseño simple con subject + observers, notificación transaccional | ✅ Se materializó. El observer transaccional requirió 2 iteraciones |
| Migración de CHECK constraint en BD legacy | Baja | Alto | Script idempotente que verifica y recrea si es necesario | ✅ Se materializó en Supabase. Se corrigió con DO block en migración 003 |
| Cambios en el frontend por lógica de negocio duplicada | Alta | Medio | Eliminar cálculos de negocio del frontend, usar datos del backend | ✅ Se materializó. Se removió `VITE_PENALIDAD_CANCELACION_TARDIA_HORAS` y `Date.now()` del frontend |
| Tiempo de respuesta de BD con many queries | Baja | Medio | Índices parciales y B-tree en columnas consultadas | ✅ No se materializó. Los índices fueron suficientes |

## Análisis de Desvíos

### 1. ¿Dónde estimamos mal y por qué?

- **Penalidad por cancelación tardía (+4h):** No estaba en la estimación inicial porque el enunciado solo decía "penalidad" sin especificar mecanismo. Se decidió implementar bloqueo temporal, lo que requirió migración, lógica de verificación y tests.
- **Transacciones y bloqueo pesimista (+2h):** Subestimamos la complejidad de `SELECT FOR UPDATE` y el manejo de errores de concurrencia.
- **Patrón Observer (+2h):** La notificación transaccional (dentro de la misma transacción) requirió rediseñar el observer para distinguir entre transaccional y secundario.

### 2. ¿Qué riesgo se materializó y cómo se absorbió?

- **Sobreventa de cupos:** Se materializó en la prueba de concurrencia. Se absorbió con `SELECT FOR UPDATE` + índice único parcial `uq_inscripciones_clase_usuario_activa`.
- **CHECK constraint legacy:** Se materializó cuando la BD de Supabase tenía un CHECK viejo sin `cancelado_tarde`. Se absorbió con un DO block en la migración 003 que detecta y recrea el constraint.
- **Lógica duplicada en frontend:** Se materializó cuando `ClaseCard.jsx` calculaba `esCancelacionTardía` con `< 2` hardcodeado. Se absorbió removiendo la lógica del frontend y usando solo datos del backend.

### 3. ¿Qué replanificaríamos si empezáramos de nuevo?

1. Incluir la penalidad por cancelación tardía en la estimación inicial del Sprint 1.
2. Diseñar el patrón Observer con notificación transaccional desde el inicio.
3. Agregar una tarea temprana de "auditoría de lógica de negocio en frontend" para evitar duplicación.
4. Crear el esquema de prueba (`activities-test-schema.sql`) desde el Sprint 1, no al final.