# Bitácora — Iachini, Lucas Javier — Rol P2 (Backend Developer · Responsable Módulo 2: Gimnasio y Acceso)

## Sprint 1 — Unidad I: Arquitectura y Análisis de Dominio
Semana del 2026-08-25

### 2026-08-29 — 4 h
**Actividad**
Relevé los requisitos funcionales y no funcionales del Módulo 2 (Gimnasio y Control de Acceso: RF-04, RF-05, RN-01 y RNF-01), definí la estructura de la tabla `control_acceso` junto con sus claves foráneas hacia `usuario` y `sede`, y redacté la propuesta inicial de integración de pasarela de pagos (ADR-002) y el análisis de errores y rollback en los orquestadores.

**Decisión**
Decidí modelar la presencia activa de un socio dentro de una sucursal mediante la condición `fecha_salida IS NULL` en la tabla `control_acceso` en lugar de mantener una columna contadora estática en `sede`. Esto garantiza que el cálculo de aforo (RF-05) y la verificación de acceso simultáneo (RN-01) sean transaccionalmente consistentes ante cualquier fallo intermedio. Ver ADR-001 y ADR-003.

**Problema o bloqueo**
Surgió la duda en el equipo sobre si el ingreso al gimnasio requería reserva previa de turno horario o lista de espera como las clases grupales. Consultamos al docente de la cátedra y confirmamos que el acceso a musculación es libre con membresía activa, validándose únicamente en puerta mediante QR rotativo y disponibilidad de aforo en la sede.

**Commits**
`e47088f` Initial commit (definición de arquitectura base, modelo de datos en Supabase y alcance de módulos)

---

## Sprint 2 — Unidad II: Desarrollo de Capas Backend y Frontend Inicial (Módulo 2)
Semana del 2026-09-08

### 2026-09-13 — 6 h
**Actividad**
Implementé las cinco capas del backend para el módulo `accesses` (`backend/src/modules/accesses/`): la definición de estructuras en `dtos/` (T01), las consultas SQL en `accessRepository.js` (T02), la lógica de validación de ingresos en `accessService.js` (T03), el controlador HTTP `accessController.js` (T04) y el enrutador `accessRoutes.js` integrado al router principal (T05).

**Decisión**
Estructuré el módulo aplicando el patrón *Repository* para aislar todas las consultas SQL (`pg Pool`) de la lógica de dominio en `accessService.js`, alineado con el monolito modular definido en ADR-001 y ADR-005. Para la regla RN-01 codifiqué `checkAccesoActivoGlobal` verificando ingresos sin fecha de salida en cualquier sucursal de la cadena.

**Problema o bloqueo**
Al consultar los datos del socio en `findUserByQR` haciendo `JOIN` con la tabla `suscripcion`, si un socio tenía renovaciones históricas la consulta devolvía múltiples registros y podía evaluar una suscripción vieja vencida en lugar de la vigente. Lo resolví ordenando las suscripciones por `s.id DESC LIMIT 1` dentro de un `LEFT JOIN` para tomar siempre el último plan del socio.

**Commits**
`2d6c0d6` feat(accesses): implementar capa DTO y Repository (T01, T02) `6158c36` feat(accesses): implementar capa de Service para la lógica de ingresos (T03) `a7044f0` feat(accesses): implementar Controller, Routes e integrar al appRouter (T04, T05)

### 2026-09-21 — 5 h
**Actividad**
Desarrollé la arquitectura cliente del Módulo 2 en el frontend (`frontend/src/modules/acceso/`): el servicio de comunicación `accesoService.js` (T06), el custom hook `UseAcceso.js` (T07) y la primera versión del panel de recepción y sus componentes visuales en `AccesoScreen.jsx` (T08, T09).

**Decisión**
Encapsulé las llamadas HTTP y el manejo de estados asíncronos (`loading`, `error`, `resultado`) dentro del hook `UseAcceso.js` para mantener la vista `AccesoScreen.jsx` libre de lógica de comunicación directa, respetando el ADR-004.

**Problema o bloqueo**
Cuando el backend devolvía un rechazo por regla de negocio (por ejemplo, membresía inactiva), la respuesta con código de error hacía que el componente mostrara un fallo genérico de conexión en vez del motivo exacto del rechazo. Ajusté el manejo de errores en `UseAcceso.js` y `accesoService.js` para extraer el mensaje de negocio del payload y presentarlo claramente al recepcionista.

**Commits**
`afccc2c` feat(acceso): implementar capa de servicios y hooks (T06, T07) `d49a54c` feat(acceso): implementar panel de recepción y componentes UI (T08, T09)

---

## Sprint 3 — Unidad III: Lógica de Egreso,Liberación de Aforo y Credencial Digital QR
Semana del 2026-10-06

### 2026-10-14 — 6 h
**Actividad**
Implementé la lógica completa de salida de socios y descuento automático del aforo en `accessRepository.registrarSalida` y `accessService.procesarSalida`. Además, construí la vista de credencial digital del socio con generación de código QR en `SocioDashboard.jsx` y el tablero de recepción actualizado.

**Decisión**
En lugar de obligar al recepcionista a elegir manualmente entre un botón de "Entrada" y otro de "Salida", diseñé el flujo de "Molinete Inteligente" (`procesarEscaneoMolinete`): al escanear el QR, el servicio verifica si el socio posee un acceso abierto (`fecha_salida IS NULL`); si no está adentro registra su ingreso (+1 aforo) y si ya estaba adentro registra su salida (-1 aforo).

**Problema o bloqueo**
Si un socio había ingresado en la Sede 1 y se intentaba escanear su salida desde la terminal de la Sede 2, el `UPDATE` filtrando por `id_sede` no afectaba ninguna fila pero no informaba claramente la causa. Agregué la validación en `procesarSalida` para detectar cuando `registrarSalida` retorna `null` y emitir el mensaje explícito indicando que el socio registra su ingreso activo en otra sucursal distinta.

**Commits**
`87dd06d` feat: implementar lógica completa de salida de socios y liberación de aforo `8541618` feat(frontend): implementar dashboard de recepción y credencial digital del socio

---

## Sprint 4 — Unidad IV: Sincronización de Interfaz, Historial y Roles en Portal del Socio
Semana del 2026-10-18

### 2026-10-19 — 3 h
**Actividad**
Corregí la integración de `accesoService.js` con el cliente HTTP central (`httpClient.js`) y ajusté el formato de respuesta consumido por la vista de recepción.

**Decisión**
Unifiqué todas las peticiones del módulo bajo la instancia configurada de Axios (`httpClient`) para aprovechar la inyección automática del token JWT por interceptor.

**Problema o bloqueo**
Las llamadas a los endpoints de estado de sede y escaneo devolvían estructuras anidadas distintas (`response.data` vs objeto directo), lo que provocaba que el contador de aforo no se actualizara al primer escaneo. Normalicé el retorno en `accesoService.js` para entregar siempre el payload limpio a la vista.

**Commits**
`8c6409d` Correccion con AccesoService

### 2026-10-22 — 4 h
**Actividad**
Refactoricé `AccesoScreen.jsx` y `SocioDashboard.jsx` para adaptar la vista según el rol del usuario autenticado (`Recepcionista/Gerente` vs `Socio`), e incorporé el hook `UseHistorialSocio.js` para que el socio consulte sus propios movimientos de entrada y salida.

**Decisión**
Decidí reutilizar la ruta `/acceso` renderizando condicionalmente `SocioDashboard` cuando el usuario tiene rol de socio (`id_rol === 3`) y el `Panel de Recepción` cuando pertenece al personal del gimnasio, simplificando la navegación en dispositivos móviles.

**Problema o bloqueo**
El rol del usuario almacenado en el contexto de autenticación podía venir como string (`'socio'`) o como ID numérico (`3`), generando inconsistencias al ocultar componentes de administración. Implementé una normalización en `AccesoScreen.jsx` que evalúa tanto el identificador numérico como el nombre del rol.

**Commits**
`5115427` Correccion en AccesoScreen.jsx `0019a89` feat(acceso): optimización del SocioDashboard y seguridad de roles

---

## Sprint 5 — Unidad IV/V: Rediseño del Panel de Recepción e Ingreso de Clientes Externos
Semana del 2026-10-26

### 2026-10-28 — 5 h
**Actividad**
Rediseñé el panel de recepción e implementé el registro de ingreso en puerta para **Clientes Externos** (`POST /api/accesses/externo`, `procesarIngresoExterno` y modal de carga rápida por DNI en `AccesoScreen.jsx`), junto con la tabla en vivo de *Últimos Movimientos en Puerta*.

**Decisión**
Decidí persistir el ingreso de los clientes externos en `control_acceso` asignándoles `id_rol = 2` para que queden auditados en el historial de puerta de la sucursal, pero excluirlos en la consulta `getAforoPorSede` (`AND u.id_rol != 2`) dado que asisten a canchas alquiladas y no ocupan el cupo de máquinas del gimnasio destinado a los socios (RF-05).

**Problema o bloqueo**
Si un socio con cuota vencida intentaba eludir el control de QR pidiendo que lo carguen manualmente por DNI en el botón "+ Ingreso Externo", el sistema podía registrarlo como visitante. Agregué una validación en `accessService.procesarIngresoExterno` que busca primero el DNI con `findUserByDni` y, si detecta que `id_rol === 3` (Socio), bloquea el alta manual exigiendo el uso de su credencial QR.

**Commits**
`d421783` refactor(acceso): rediseño del panel de recepción y blindaje de arquitectura

---

## Sprint 6 — Unidad V: Seguridad por Roles (RBAC), Vigencia de QR (RF-04) y Tope de Aforo
Semana del 2026-11-08

### 2026-11-09 — 4 h
**Actividad**
Integré el middleware de autorización por roles (`soloPersonal`) en `accessRoutes.js` para restringir los endpoints operativos de recepción exclusivamente a recepcionistas, administradores y gerentes, dejando `/me/historial` accesible para el socio autenticado.

**Decisión**
Aplicar el control RBAC directamente en la capa de rutas del backend mediante middlewares encadenados (`verificarToken`, `soloPersonal`) además de la validación visual en React, impidiendo que un socio invoque `/api/accesses/scan` manualmente mediante herramientas como Postman.

**Problema o bloqueo**
En el entorno de integración continua con Node 24 y Linux, una diferencia de mayúsculas/minúsculas en la importación de `UseHistorialSocio.js` hacía fallar el build de Vite aunque en Windows funcionaba. Se corrigió el casing del archivo para mantener compatibilidad multiplataforma.

**Commits**
`624ae3b` security(accesses): integración de middleware de autorización por roles (soloPersonal) en rutas de recepción

### 2026-11-10 — 5 h
**Actividad**
Implementé la validación estricta de formato y caducidad temporal de 60 segundos del código QR rotativo (`validarFormatoYVigenciaQR` en `accessService.js`, RF-04), agregué el bloqueo de ingreso por tope máximo de aforo en `procesarIngreso` (RF-05) y desacoplé la lógica de servicios.

**Decisión**
Adopté la estructura de token `FITZONE-<id_usuario>-<timestamp_ms>` validando en el servidor que la antigüedad del código no supere los 60 segundos (+5 segundos de tolerancia por latencia de red), evitando el ingreso mediante capturas de pantalla estáticas enviadas por WhatsApp (RF-04).

**Problema o bloqueo**
Pequeños desfasajes de reloj entre el dispositivo móvil donde se genera el `Date.now()` del QR y el servidor backend provocaban que un código recién regenerado diera una diferencia levemente negativa (ej. `-400 ms`) y fuera rechazado. Incorporé una ventana de tolerancia de reloj de `-10000 ms` a `+65000 ms` que eliminó los falsos rechazos sin comprometer la rotación de 1 minuto.

**Commits**
`5bd9e52` feat(accesses): validacion de caducidad de QR rotativo (RF-04), tope de aforo y desacoplamiento de servicios

---

## Sprint 7 — Unidad VI: Contingencia Offline en Terminal de Sede y Sincronización (RNF-01)
Semana del 2026-11-11

### 2026-11-11 — 7 h
**Actividad**
Implementé el mecanismo completo de operación offline para la terminal de recepción (RNF-01): agregué los endpoints `GET /api/accesses/padron-offline` y `POST /api/accesses/sincronizar-offline` en el backend, codifiqué el patrón *Fallback Strategy* con validación local y cola diferida en `accesoService.js`, y agregué la persistencia local del catálogo de sucursales en `sedeService.js`.

**Decisión**
Diseñé una arquitectura de réplica local en `localStorage` (`fitzone_padron_offline`, `fitzone_sedes_offline`, `fitzone_estado_sede_<id>` y `fitzone_cola_accesos_offline`) que conmuta automáticamente cuando `httpClient` detecta caída del servidor (`502/503/Network Error`). Al reconectar, el lote se sincroniza ordenado cronológicamente por `fechaEvento` validando idempotencia (RN-01). Ver ADR-006 y ADR-007.

**Problema o bloqueo**
Tuve dos bloqueos importantes al probar el corte de red real apagando el backend:
1. Al recargar la página (`F5`) tras volver la conexión, hacía falta recargar dos veces para que el aforo pasara de `0` a `1`. Descubrí que `React.StrictMode` disparaba en paralelo `sincronizarEstadoBD` y `actualizarReplicaLocal`: el `GET /estado/:sedeId` respondía antes de que terminara el `POST /sincronizar-offline` y pisaba el `localStorage` con `0`. Lo resolví creando un cerrojo de concurrencia (`promesaSincronizacion`) y encadenando secuencialmente `1º sincronizarColaOffline -> 2º GET /estado/:sedeId -> 3º actualizarReplicaLocal`, borrando la cola recién tras recibir `200 OK`.
2. Al recargar la página sin conexión, el selector superior de sedes quedaba en *"Cargando..."* porque `sedeService.js` no guardaba copia local. Agregué `fitzone_sedes_offline` en `sedeService.js` para mantener operativas las sucursales sin red.

**Commits**
`2d8a4f4` feat(accesses): contingencia offline en terminal de sede y sincronizacion diferida (RNF-01)

---

## Sprint 8 — Unidad V y Cierre: Cupo Real por Sede, Blindaje Offline y Pruebas Unitarias
Semana del 2026-11-15

### 2026-11-15 — 6 h
**Actividad**
Reemplacé la constante fija de aforo (`100`) por la consulta dinámica a la columna `cupo` de la tabla `sede` en PostgreSQL (`accessRepository.getCupoSede`, RF-05). Desarrollé la suite de pruebas unitarias `accessService.test.js` con `node:test` y `c8`, y blindé en el modo offline el control de sede activa (`id_sede_activa` para RN-01 entre sedes distintas) y el tope de cupo local.

**Decisión**
Incluí en el padrón replicado (`getPadronOffline`) la subconsulta `id_sede_activa` y crucé en `validarEscaneoLocalOffline` el aforo local contra el `cupo` guardado en `fitzone_sedes_offline`. Así logré que, aún con el backend apagado, si un socio entra en una sede e intenta escanear su QR en otra sucursal distinta, el modo offline lo bloquee por RN-01 exactamente igual que el servidor online.

**Problema o bloqueo**
En modo offline no se estaba distinguiendo en cuál de las sucursales había ingresado el socio (solo figuraba `esta_adentro: true`), por lo que cambiar de sede en el selector con el backend apagado y volver a escanear al mismo socio le registraba una salida en la segunda sede en lugar de rechazarlo por RN-01. Al incorporar `id_sede_activa` tanto en la réplica de BD como en la actualización local de `localStorage`, el bloqueo multi-sede quedó funcionando tanto online como offline, y la suite de 9 tests unitarios alcanzó un `65.61%` de cobertura en `accessService.js`.

**Commits**
`80608b5` fix(accesses): vincular aforo maximo en tiempo real con el cupo de cada sede en BD (RF-05) `dee29a2` test(accesses): agregar suite de pruebas unitarias y cobertura para accessService `61b4e96` feat(accesses): validar sede activa (RN-01) y tope de cupo por sucursal (RF-05) en modo offline