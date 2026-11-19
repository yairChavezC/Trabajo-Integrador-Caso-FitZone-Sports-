# Bitácora — Acosta, Marcela — Rol P2

## Sprint 1 — Unidad I — Semana del 2026-09-15

### 2026-09-18 · 3 h

**Actividad**
Armé la estructura inicial del módulo M3 (`backend/src/modules/activities/`) y el servicio base del frontend (`claseService.js`) con los clientes HTTP hacia `/api/clases`. Definí que el módulo se llamara `activities` en el backend y `clases` en el frontend.

**Decisión**
Usar `modules/<nombre>` en lugar de una carpeta por funcionalidad suelta, para que el monolito modular tenga una frontera de propiedad clara por integrante. Ver ADR-001.

**Problema o bloqueo**
Ninguno relevante.

**Commits**
`a7bd86a` Corrección (ajuste menor en `claseService.js`)

---

## Sprint 2 — Unidad II/III — Semana del 2026-09-22

### 2026-09-25 · 6 h

**Actividad**
Implementé `classPolicy.js` como capa de dominio puro: `validarVentanaReserva` (48 h antes del inicio), `validarCapacidadParaReserva`, `validarVentanaCancelacion` y `validarInicioFuturo`.

**Decisión**
Separar las reglas de tiempo y capacidad en funciones puras sin acceso a datos, para poder testearlas sin base y para que el repositorio no tenga lógica de negocio. Ver ADR-005.

**Problema o bloqueo**
Ninguno.

**Commits**
`a7bd86a` Corrección

---

### 2026-09-30 · 4 h

**Actividad**
Escribí los primeros tests unitarios de `classPolicy.js` y de `waitlistObserver.js` con `node:test`.

**Decisión**
Usar el runner de pruebas nativo de Node (`node:test` + `node:assert/strict`) en lugar de Jest o Vitest en el backend, para no agregar dependencias. Ver ADR-008.

**Problema o bloqueo**
Ninguno.

**Commits**
`a7bd86a` Corrección

---

## Sprint 3 — Unidad III/IV — Semana del 2026-10-13

### 2026-10-18 · 10 h

**Actividad**
Refactor de `useClases.js` (+62 líneas) para centralizar estados de carga, error y acciones (reservar, cancelar, lista de espera, aceptar oferta). Ajusté `ClaseTable.jsx` (+17 líneas) para mostrar acciones según el estado de inscripción. Amplié `classPolicy.js` y `waitlistObserver.test.js`.

**Decisión**
Centralizar las acciones en el hook en lugar de repetir el manejo de errores en cada componente, para que la vista quede libre de lógica de negocio. Ver ADR-023.

**Problema o bloqueo**
El hook empezó a crecer y a mezclar carga de datos con ejecución de acciones. Lo resolví separando `fetchClases` de `runAction`, cada uno con su propio manejo de estado.

**Commits**
`197d90b` Correcciones

---

### 2026-10-25 · 12 h

**Actividad**
Integré el módulo completo: controlador, DTOs, repositorios, rutas, servicios, componentes de frontend, migración `001_create_usuario_sede.sql` y configuración de CORS/base de datos.

**Decisión**
Dividir el servicio en `activityService` (CRUD de clases) e `inscriptionService` (reservas, cancelaciones, lista de espera), porque un solo servicio mezclaba responsabilidades y superaba las 300 líneas. Ver ADR-015.

**Problema o bloqueo**
El CHECK constraint de estados y la tabla `usuario_sede` no existían en la base de desarrollo, lo que rompía el alta de clases por sede. Lo resolví con las migraciones 000 y 001.

**Commits**
`6883747` Correcciones de clases
`efc1b98` feat(clases): completitud y optimización del módulo 3 (RF 06-08) con patrón Observer y DTOs

---

## Sprint 4 — Unidad IV — Semana del 2026-10-20

### 2026-10-28 · 8 h

**Actividad**
Implementé el patrón Observer para la lista de espera: `waitlistObserver.js` con `WaitlistSubject`, `NotificationPersistenceObserver` y `ConsoleWaitlistObserver`. Agregué la tabla `notificaciones_clase_grupal` (migración 002) y las ofertas temporales con expiración.

**Decisión**
Que la notificación se persista **dentro de la misma transacción** que la promoción: si el `INSERT` en notificaciones falla, la promoción se revierte y el cupo no queda ocupado sin aviso. Descarté la notificación asíncrona post-commit porque dejaba cupos ocupados sin que el socio se enterara. Ver ADR-012 y ADR-013.

**Problema o bloqueo**
La primera versión notificaba después del commit y la prueba de integración detectó el caso: un fallo del observer secundario no debía revertir la cancelación, pero un fallo del observer transaccional sí. Separé los dos tipos de observador y escribí un test para cada camino.

**Commits**
`ef525ed` feat(activities): mejorar lista de espera y notificaciones de clases grupales

---

### 2026-11-02 · 6 h

**Actividad**
Implementé la cancelación tardía: migración 003 (`fecha_cancelacion`, índice parcial, actualización del CHECK), `esCancelacionTardia` en `classPolicy`, `cancelClassReservation` en `inscriptionService` y `verificarSinBloqueoPorCancelacionTardia`.

**Decisión**
Bloqueo temporal de `PENALIDAD_CANCELACION_TARDIA_HORAS` (48 por defecto) en lugar de penalidad económica, porque es reversible, configurable y no requiere integración con pagos. Ver ADR-011 y ADR-020.

**Problema o bloqueo**
La base de Supabase tenía el CHECK viejo de seis estados. La migración 000 no lo tocaba porque el constraint ya existía, así que agregué un bloque `DO $$` en la 003 que detecta si falta `cancelado_tarde` y lo recrea.

**Commits**
`7766df9` feat(clases): completar módulo de Clases Grupales

---

## Sprint 5 — Unidad V — Semana del 2026-11-03

### 2026-11-05 · 8 h

**Actividad**
Refactor de nombres de roles y de identificadores. Renombré `esCancelacionTardía`, `findUltimaCancelacionTardía` y `verificarSinBloqueoPorCancelaciónTardía` sin tilde, y unifiqué los nombres de roles en el frontend y el backend.

**Decisión**
Eliminar las tildes de los identificadores: funcionaban, pero rompían algunas herramientas de línea de comandos y de minificación. Ver ADR-023.

**Problema o bloqueo**
Los tests unitarios mockeaban `findUltimaCancelacionTardía` devolviendo un objeto, y el repositorio real devolvía el valor suelto. Lo unifiqué devolviendo el objeto `{ fecha_cancelacion }`.

**Commits**
`1bb8713` feat(clases): unificar nombres de roles

---

### 2026-11-08 · 6 h

**Actividad**
Agregué la prueba de concurrencia (`activityConcurrency.test.js`): dos socios reservando el mismo cupo simultáneamente, verificando que solo uno confirma (RN-02). Completé los tests de integración de cancelación tardía y lista de espera.

**Decisión**
Bloqueo pesimista `SELECT ... FOR UPDATE` sobre la fila de la clase, más índice único parcial `uq_inscripciones_clase_usuario_activa` como garantía en la base. Ver ADR-014.

**Problema o bloqueo**
Las pruebas de integración y concurrencia necesitan `TEST_DATABASE_URL`; sin esa variable se saltean. Documenté el requisito en el manual de instalación.

**Commits**
`7766df9` feat(clases): completar módulo de Clases Grupales

---

## Sprint 6 — Unidad V — Semana del 2026-11-10

### 2026-11-12 · 8 h

**Actividad**
Documenté el módulo: ADR-005, ADR-008, ADR-011 a ADR-020, diagramas C4-3 y UML, manual técnico, manual de usuario y manual de instalación.

**Decisión**
Autor de los ADR del módulo: Acosta, Marcela, según pide el Anexo B. Formato con contexto, alternativas, decisión, consecuencias y requisitos relacionados.

**Problema o bloqueo**
Faltaban los ADR-013 a ADR-019, que no estaban en el material del equipo. Los redacté a partir de lo que el código hacía realmente, verificando cada afirmación contra los archivos.

**Commits**
Sin commits propios en esta sesión (documentación en carpeta `docs/`)

---

### 2026-11-14 · 4 h

**Actividad**
Alineé los tipos de fecha del esquema. Las migraciones 001 y 002 creaban `TIMESTAMPTZ` y el resto del módulo usaba `TIMESTAMP WITHOUT TIME ZONE`; agregué la migración 004 y corregí los archivos 001 y 002. En Supabase la columna `fecha_cancelacion` había quedado como `TIMESTAMPTZ` y la convertí a mano.

**Decisión**
Unificar todo a `TIMESTAMP WITHOUT TIME ZONE` con el `AT TIME ZONE` explícito en las consultas, porque la base real ya tenía datos cargados y migrar todo a `TIMESTAMPTZ` tenía riesgo de corrimiento horario. Ver ADR-021.

**Problema o bloqueo**
Las primeras versiones de 001 y 002 quedaron mal tipadas en el repositorio y en Supabase. Lo resolví con la migración 004, que es idempotente y solo altera la columna si detecta el tipo viejo.

**Commits**
Sin commits propios en esta sesión

---

## Sprint 7 — Unidad V — Semana del 2026-11-16

### 2026-11-17 · 9 h

**Actividad**
Corregí el `httpClient` del frontend: redirigía al login tanto en 401 como en 403, así que un socio con membresía vencida era deslogueado al reservar. También apliqué Design Tokens semánticos en `ClasesScreen.css` (unos treinta colores literales pasaron a variables), quité la lógica de negocio de `ClaseCard.jsx` y separé visualmente el alta de clases de la grilla de clases registradas.

**Decisión**
`401` cierra sesión; `403` muestra el mensaje y conserva la sesión. Y el frontend deja de recalcular la penalidad: el único dueño de la regla es el backend. Ver ADR-022 y ADR-023.

**Problema o bloqueo**
Al sacar `Date.now()` del render apareció un warning de ESLint por pureza. Lo resolví dejando el cálculo del tiempo fuera del componente, porque además el dato debía venir del backend.

**Commits**
Sin commits propios en esta sesión (cambios sin pushear)

---

### 2026-11-18 · 8 h

**Actividad**
Cerré la documentación del módulo: índice de numeración de ADR, ADR-021 a ADR-023, índice de diagramas con autor/fecha/versión, scripts de exportación, bitácora y planificación con seguimiento, riesgos y análisis de desvíos.

**Decisión**
Registrar las decisiones que se tomaron después de los ADR originales como ADR nuevos (021 a 023) en lugar de editar los viejos, porque un ADR no se corrige: se supera.

**Problema o bloqueo**
La exportación de los diagramas a PNG fallaba porque Mermaid CLI no encontraba Chromium y el archivo de configuración de Puppeteer se escribía con BOM. Lo resolví reescribiendo la configuración sin BOM y usando el Chrome instalado en la máquina.

**Commits**
Sin commits propios en esta sesión

---

## Sprint 8 — Cierre — Semana del 2026-11-17

### 2026-11-19 · 6 h

**Actividad**
Completé los ADR obligatorios 001, 002 y 009 con evidencia del módulo M3. Eliminé mi `backend/swagger.json` para que no pise el del equipo y dejé `app.js` alineado con la versión del remoto. Verifiqué la suite: 75 pruebas unitarias en verde.

**Decisión**
No duplicar el `swagger.json`: el contrato consolidado vive en `backend/swagger.json` y lo mantiene el equipo; el contrato del módulo queda como fuente en `backend/src/modules/activities/openapi.yaml`.

**Problema o bloqueo**
Mi copia local de `swagger.json` y la del equipo divergían, y mi versión de `app.js` usaba `readFileSync` mientras la del equipo usa `createRequire`. Alineé mi `app.js` a la del remoto para evitar un conflicto de merge.

**Commits**
Sin commits propios en esta sesión