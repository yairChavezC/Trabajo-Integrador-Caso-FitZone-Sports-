# Handover — Integración del Módulo 3 (Clases Grupales)

## 1. Swagger: qué hay que hacer y qué NO tocar

**Mi `backend/swagger.json` fue eliminado.** El contrato consolidado vive únicamente en `backend/swagger.json`, que mantiene el equipo. No corresponde que M3 tenga su propio `swagger.json`: sería una segunda fuente de verdad y un conflicto de merge seguro.

Mi `backend/src/app.js` quedó **alineado con la versión del remoto** (`createRequire` + `helmet({ contentSecurityPolicy: false })` sobre `/api-docs`), así que al mergear no hay conflicto en ese archivo.

### Endpoints de M3 que faltan agregar a `backend/swagger.json`

La fuente del contrato del módulo es `backend/src/modules/activities/openapi.yaml`. Hay que volcar sus `paths` y sus `schemas` al `swagger.json` consolidado. Son 14 operaciones:

| Método | Path |
|--------|------|
| GET | `/clases` |
| POST | `/clases` |
| GET | `/clases/mi-rol` |
| GET | `/clases/notificaciones` |
| PUT | `/clases/notificaciones/{id}/leida` |
| GET | `/clases/{id}` |
| PUT | `/clases/{id}` |
| DELETE | `/clases/{id}` |
| GET | `/clases/{id}/inscripciones` |
| POST | `/clases/{id}/reservas` |
| DELETE | `/clases/{id}/reservas` |
| POST | `/clases/{id}/lista-espera` |
| POST | `/clases/{id}/lista-espera/aceptar` |

Esquemas a fusionar en `components.schemas`: `ClaseInput`, `ClaseUpdate`, `Inscripcion`, `Notificacion`. Parámetros reutilizables: `ClassId`, `NotificationId`. Esquema de seguridad: `bearerAuth` (ya existe en el consolidado).

**Recordatorio del negocio que el contrato debe reflejar:** el estado `cancelado_tarde` y el `409` por bloqueo de penalidad ya están en el `openapi.yaml` del módulo, junto con el `403` por membresía vencida.

## 2. Pruebas: qué agregué y qué queda

### Archivos de prueba del módulo 3

| Archivo | Tipo | Tests |
|---------|------|-------|
| `services/inscriptionService.test.js` | Unitarias | 23 |
| `services/activityService.test.js` | Unitarias | 14 |
| `services/notificationService.test.js` | Unitarias | 3 |
| `domain/classPolicy.test.js` | Unitarias | 8 |
| `repositories/inscriptionRepository.test.js` | Unitarias | 4 |
| `repositories/activityRepository.test.js` | Unitarias | 4 |
| `repositories/membershipRepository.test.js` | Unitarias | 2 |
| `repositories/notificationRepository.test.js` | Unitarias | 4 |
| `observers/waitlistObserver.test.js` | Unitarias | 3 |
| `dtos/activity.dto.test.js` | Unitarias | 4 |
| `routes/activityPermissions.test.js` | Unitarias | 3 |
| `controllers/activityController.test.js` | Unitarias | 3 |
| `activityIntegration.test.js` | Integración | 12 |
| `activityConcurrency.test.js` | Concurrencia | 1 |
| **Total M3** | | **75 unitarias + 13 de integración/concurrencia** |

### Script de cobertura

Fusioné mi configuración con la del equipo. **Se mantuvo el umbral global del proyecto** (`--lines 15 --functions 0 --branches 10`, por archivo, decisión de integración de `db732ee`) y **se agregaron los archivos de M3 que faltaban** en la lista de `--include`:

```
--include=src/modules/activities/services/inscriptionService.js
--include=src/modules/activities/repositories/membershipRepository.js
--include=src/modules/activities/domain/classPolicy.js
```

Los tres que ya estaban (`activityService.js`, `activityRepository.js`, `inscriptionRepository.js`) se conservaron. Los módulos de accesos, auth, canchas y pagos siguen tal como los dejó el equipo.

**Cobertura medida de M3** (verificada con `c8`):

| Archivo | Líneas | Funciones | Ramas |
|---------|--------|-----------|-------|
| `classPolicy.js` | 100% | 100% | 100% |
| `membershipRepository.js` | 100% | 100% | 100% |
| `inscriptionRepository.js` | 100% | 100% | 95.45% |
| `activityRepository.js` | 93.2% | 100% | 52% |
| `inscriptionService.js` | 89.52% | 92.3% | 81.81% |
| `activityService.js` | 83.72% | 100% | 73.77% |

### Requisito del CI para las pruebas de integración

`activityIntegration.test.js` y `activityConcurrency.test.js` se saltean si no existe `TEST_DATABASE_URL`. El CI ya provisiona `fitzone_app_test` y `fitzone_integration_test`, aplica `backend/tests/activities-test-schema.sql` y luego `apply_migrations.mjs` (que ahora corre 000 a 004). No hace falta ningún cambio en el workflow.

## 3. Migraciones: orden y estado

`backend/apply_migrations.mjs` quedó unificado (eliminé el runner duplicado que estaba en `backend/migrations/`). Aplica en este orden:

| Orden | Migración | Reversión |
|-------|-----------|-----------|
| 1 | `000_create_clases_grupales.sql` | — |
| 2 | `001_create_usuario_sede.sql` | — |
| 3 | `002_create_class_notifications.sql` | — |
| 4 | `003_add_cancelacion_tardia.sql` | `rollback/003_add_cancelacion_tardia.sql` |
| 5 | `004_align_timestamp_types.sql` | `rollback/004_align_timestamp_types.sql` |

Todas son idempotentes. La 003 incluye un bloque `DO $$` que repara el CHECK si la base tiene la versión vieja de seis estados. La 004 alinea los tipos de fecha si alguna columna quedó en `TIMESTAMPTZ`. Verificado en Supabase.

## 4. Datos de prueba

`backend/seed.sql` crea 25 sedes, los cuatro roles, usuarios de prueba para cada rol, una clase por sede y un caso de lista de espera listo para la demo (Yoga Matutino con cupo lleno y un socio con oferta pendiente).

## 5. Qué NO toqué

- `backend/swagger.json` (lo mantiene el equipo)
- `backend/src/app.js` (alineado con el remoto, sin conflictos)
- El umbral global de cobertura del proyecto
- Los módulos M1, M2, M4 y M5
- `frontend/src/modules/accesos/`, `usuarios/`, `canchas/`, `pagos/`