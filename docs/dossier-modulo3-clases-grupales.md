# Dossier — Módulo M3: Clases Grupales

**Integrante:** Acosta, Marcela
**Módulo:** M3 — Clases Grupales (RF-06 a RF-08)
**Fecha:** 2026-11-17

---

## 2. Arquitectura

### C4-3 Componentes del Módulo M3

El módulo M3 sigue una arquitectura en capas dentro del backend monolítico modular:

- **Rutas** (`activityRoutes.js`): endpoints Express con middlewares de autorización
- **Controladores** (`activityController.js`): reciben HTTP, validan, delegan
- **Servicios** (`activityService.js`, `inscriptionService.js`): lógica de negocio con DI manual
- **Dominio** (`classPolicy.js`): políticas puras sin dependencias de infraestructura
- **Repositorios** (`activityRepository.js`, `inscriptionRepository.js`, `membershipRepository.js`, `notificationRepository.js`): acceso a datos con `pg`
- **Observadores** (`waitlistObserver.js`): patrón Observer para notificaciones

Ver diagrama C4-3 en `docs/diagramas/c4-3-componentes-clases-grupales.mmd`.

---

## 3. Registros de Decisión Arquitectónica

### ADRs del Módulo M3

| ADR | Título | Estado |
|-----|--------|--------|
| ADR-005 | Framework backend, IoC y ORM | Aceptado |
| ADR-008 | Estrategia de pruebas y cobertura | Aceptado |
| ADR-011 | Cancelación tardía con penalización | Aceptado |
| ADR-012 | Lista de espera con Observer (transaccional) | Aceptado |
| ADR-013 | Notificación transaccional en lista de espera | Aceptado |
| ADR-014 | Control de concurrencia (no sobreventa) | Aceptado |
| ADR-015 | Separación de servicios (activityService + inscriptionService) | Aceptado |
| ADR-016 | Control de acceso por roles y sede | Aceptado |
| ADR-017 | Estados de inscripción (7 estados) | Aceptado |
| ADR-018 | Diálogo de confirmación y notificaciones | Aceptado |
| ADR-019 | Estrategia de pruebas del módulo M3 | Aceptado |
| ADR-020 | Penalidad por cancelación tardía | Aceptado |

Todos en `docs/adr/` con formato Anexo B (Contexto, Alternativas, Decisión, Consecuencias).

---

## 4. Modelado

### Diagramas UML

| Diagrama | Archivo | Descripción |
|----------|---------|-------------|
| C4-3 Componentes | `c4-3-componentes-clases-grupales.mmd` | Descomposición del módulo M3 |
| Secuencia Reserva | `uml-secuencia-reserva-clase-grupal.mmd` | RF-06: reserva de clase |
| Secuencia Concurrente | `uml-secuencia-reserva-concurrente.mmd` | RN-02: no sobreventa |
| Estados Inscripción | `uml-estados-inscripcion-7-estados.mmd` | 7 estados de inscripción |
| Estados Reserva RF-07 | `uml-estados-reserva-rf07.mmd` | Cancelación con/sin penalidad |
| Actividad Lista Espera | `uml-actividad-lista-espera.mmd` | RF-08: patrón Observer transaccional |
| Clases Dominio | `uml-clases-dominio-observer-repository.mmd` | Observer + Repository |

### DER Físico

Ver `der-modulo3-clases-grupales.mmd`. Tablas:
- `clase_grupal` (id, id_sede, nombre, profesor, cupo, fecha_inicio, fecha_fin)
- `inscripciones_clase_grupal` (id, id_clase_grupal, id_usuario, estado, fecha_registro, fecha_expiracion_oferta, fecha_cancelacion)
- `notificaciones_clase_grupal` (id, id_usuario, tipo, mensaje, id_clase_grupal, id_inscripcion, creada_at, leida_at)

Índices: B-tree, parciales y único parcial `uq_inscripciones_clase_usuario_activa`.

---

## 5. Patrones de Diseño Aplicados

### Strategy (implícito en classPolicy)

`classPolicy.js` encapsula las políticas de negocio (ventanas de tiempo, capacidad, cancelación tardía) como funciones puras. Esto permite intercambiar o extender políticas sin tocar servicios.

### Observer

`WaitlistSubject` notifica a observadores cuando se promueve una inscripción:
- `NotificationPersistenceObserver` (transaccional): inserta notificación dentro de la transacción
- `ConsoleWaitlistObserver` (secundario): logging post-commit

### Repository

Capa de abstracción de persistencia:
- `activityRepository`: CRUD de `clase_grupal`, incluye `lockActivityById` (SELECT FOR UPDATE)
- `inscriptionRepository`: CRUD de `inscripciones_clase_grupal`
- `membershipRepository`: verificación de membresía
- `notificationRepository`: CRUD de `notificaciones_clase_grupal`

---

## 6. Estrategia de Pruebas y Reporte de Cobertura

### Pirámide de Pruebas

| Nivel | Tests | Ubicación |
|-------|-------|-----------|
| Unitarias | 68 | `src/modules/activities/**/*.test.js` |
| Integración | 12 | `activityIntegration.test.js` |
| Concurrencia | 1 | `activityConcurrency.test.js` |
| **Total** | **88** | — |

### Reporte de Cobertura

| Archivo | % Líneas | % Funciones | % Ramas |
|---------|----------|-------------|---------|
| `classPolicy.js` | 100% | 100% | 100% |
| `activityService.js` | 83.72% | 100% | 73.77% |
| `inscriptionService.js` | 89.52% | 92.3% | 81.81% |
| `activityRepository.js` | 93.2% | 100% | 52% |
| `inscriptionRepository.js` | 100% | 100% | 95.45% |
| `membershipRepository.js` | 100% | 100% | 100% |
| `notificationRepository.js` | 100% | 100% | 100% |
| `activityController.js` | 68.55% | 93.33% | 61.9% |
| `waitlistObserver.js` | 97.18% | 100% | 91.66% |
| `activityRoutes.js` | 93.22% | 100% | 75.75% |
| `activity.dto.js` | 89.85% | 100% | 85.71% |
| `notificationService.js` | 100% | 100% | 100% |
| **Overall** | **89.46%** | **97.77%** | **79.67%** |

Umbral declarado (ADR-019): líneas ≥ 80%, funciones ≥ 70%, ramas ≥ 50% por archivo núcleo.

### Resultado

```
ℹ tests 88
ℹ pass 88
ℹ fail 0
```

---

## 7. Cumplimiento de Requisitos No Funcionales

### RNF-04: Alta de sede nueva sin recompilar

**Evidencia:**
- La tabla `sede` es independiente del código; `clase_grupal.id_sede` es FK dinámica.
- No hay IDs de sede hardcodeados en el código.
- `seed.sql` crea 25 sedes y una clase en cada una; todas funcionan sin recompilar.
- `GET /clases?idSede=<nueva>` filtra dinámicamente por sede.
- Ver `docs/rnf/evidencia-rnf04-modulo3.md` para detalle completo.

**Verificación:**
```sql
INSERT INTO public.sede (nombre, ...) VALUES ('Sede Nueva', ...) RETURNING id;
INSERT INTO public.clase_grupal (id_sede, ...) VALUES (<nuevo_id>, ...);
-- La clase aparece automáticamente en la agenda sin recompilar.
```

---

## 8. Planificación

### Historias

- **RF-06:** Reserva de clases grupales — 8/8 criterios cumplidos
- **RF-07:** Cancelaciones con/sin penalidad — 5/5 criterios cumplidos
- **RF-08:** Lista de espera — 8/8 criterios cumplidos

### Seguimiento

| Sprint | Estimado (h) | Trabajado (h) | Desvío |
|--------|--------------|---------------|--------|
| 1 | 12 | 14 | +2h |
| 2 | 16 | 18 | +2h |
| 3 | 20 | 22 | +2h |
| 4 | 24 | 28 | +4h |
| 5 | 16 | 16 | 0h |
| 6 | 12 | 10 | -2h |
| 7 | 8 | 8 | 0h |
| 8 | 8 | 8 | 0h |
| **Total** | **116** | **124** | **+8h (6.9%)** |

### Riesgos Materializados

| Riesgo | Qué ocurrió |
|--------|-------------|
| Sobreventa de cupos | Se materializó en prueba de concurrencia. Resuelto con SELECT FOR UPDATE + índice único parcial |
| CHECK constraint legacy | Se materializó en Supabase con CHECK viejo sin `cancelado_tarde`. Resuelto con DO block en migración 003 |
| Lógica duplicada en frontend | Se materializó en ClaseCard.jsx con `< 2` hardcodeado. Resuelto removiendo lógica del frontend |
| Complejidad del Observer | Se materializó con notificación transaccional. Resuelto con observer transaccional + secundario |

### Análisis de Desvíos

1. **Penalidad por cancelación tardía (+4h):** No estaba en estimación inicial. Se decidió bloqueo temporal, requirió migración + lógica + tests.
2. **Transacciones y bloqueo pesimista (+2h):** Subestimamos SELECT FOR UPDATE y manejo de concurrencia.
3. **Patrón Observer (+2h):** Notificación transaccional requirió rediseñar observer en dos tipos.

**Replanificaríamos:**
1. Incluir penalidad en estimación Sprint 1.
2. Diseñar Observer transaccional desde inicio.
3. Auditar lógica de negocio en frontend temprano.
4. Crear esquema de prueba desde Sprint 1.

Ver `docs/planificacion/planificacion-modulo3-clases-grupales.md` para detalle completo.

---

## 9. Bitácora

Ver `docs/bitacoras/LOG-acosta.md` (entregable individual).

---

## Referencias

- ADRs: `docs/adr/ADR-005.md` a `docs/adr/ADR-020.md`
- Diagramas: `docs/diagramas/`
- Manuales: `docs/manuales/`
- Planificación: `docs/planificacion/`
- Evidencia RNF: `docs/rnf/evidencia-rnf04-modulo3.md`
- Código: `backend/src/modules/activities/`
- Tests: `backend/src/modules/activities/**/*.test.js`
- Seed: `backend/seed.sql`
- Migraciones: `backend/migrations/000` a `003`