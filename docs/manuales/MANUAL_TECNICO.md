# FitZone Sports — Manual técnico


## 1. Visión arquitectónica · Diagramas C4 · Índice de ADR

### 1.1 Estilo arquitectónico

FitZone Sports es un **monolito modular en capas** (ADR-001):

- **Un solo backend** (Node.js + Express 5) con cinco módulos funcionales y dos transversales. Cada módulo se organiza en capas: `routes → controller → service → repository`, más `dtos/` y `domain/` cuando hay reglas propias.
- **Una SPA** (React 19 + Vite) que consume la API REST por HTTPS/JSON.
- **Una base PostgreSQL** administrada en Supabase (ADR-002), accedida con SQL parametrizado, sin ORM (ADR-005).
- **Una pasarela de pagos externa**, encapsulada detrás de adaptadores (ADR-010).

Las dependencias entre módulos se resuelven por **inyección de dependencias en el ensamblado** (`*.module.js`) y, para el flujo que cruza dos módulos (reserva de cancha + pago), con un **orquestador** (`core/orchestrator/pagoCanchaOrchestrator.js`).

```text
backend/src/
├── app.js, index.js, appRouter.js     # ensamblado Express, rutas /api y manejo de errores
├── config/db.js                       # pool de PostgreSQL
├── core/                              # transversal: middlewares, errores, orquestador
│   ├── middlewares/ (authMiddleware, cors)
│   ├── errors/ (errorHandler, notFoundHandler)
│   └── orchestrator/pagoCanchaOrchestrator.js
└── modules/
    ├── auth/         # login y emisión de JWT (transversal)
    ├── sedes/        # catálogo de sedes (transversal)
    ├── users/        # M1 usuarios
    ├── memberships/  # M1 planes y suscripciones
    ├── accesses/     # M2 gimnasio y acceso
    ├── activities/   # M3 clases grupales
    ├── canchas/      # M4 canchas deportivas
    └── payments/     # M5 pagos y facturación
```

### 1.2 Vista de contexto (C4 nivel 1) y de contenedores (C4 nivel 2)

El diagrama de contexto (Figura 2.1) muestra los cuatro actores (socio activo, cliente externo, gerente y recepcionista) y a Mercado Pago como sistema externo. El de contenedores (Figura 2.2) muestra SPA, API, base de datos y pasarela.

![Figura 2.1 — Diagrama de Contexto (C4 Nivel 1)](../diagramas/c4-1-contexto.png)
![Figura 2.2 — Diagrama de Contenedores (C4 Nivel 2)](../diagramas/c4-2-contenedores.png)

### 1.3 Vista de componentes (C4 nivel 3)

La Figura 2.3 muestra los cinco módulos funcionales del backend con su estructura interna de controlador, servicio y repositorio conectada al orquestador y a PostgreSQL.

![Figura 2.3 — Diagrama de Componentes (C4 Nivel 3) del Monolito Modular](../diagramas/c4-3-componentes-monolito.png)

### 1.4 Arquitectura del frontend

El frontend se organiza **por módulos funcionales** (una carpeta por módulo del backend):

```text
frontend/src/
├── App.jsx, main.jsx            # composición de rutas y proveedores de contexto
├── core/
│   ├── api/httpClient.js        # Axios: inyecta el JWT y normaliza errores
│   ├── auth/AuthContext.jsx     # sesión (token + usuario) y rehidratación
│   ├── layouts/mainLayout/      # MainLayout, SedeSelector, NavTabs, UserProfileCard
│   └── routes/ProtectedRoute.jsx
├── shared/
│   ├── context/SedeContext.jsx  # sede seleccionada, persistida en localStorage
│   ├── services/sedeService.js  # catálogo de sedes con respaldo offline
│   └── components/              # MensajeFlotante
└── modules/
    ├── auth/ acceso/ canchas/ clases/ socios/ pagos/
    └── <módulo>/{components, hooks, pages, services, routes.jsx}
```

- **Capa de servicio desacoplada:** las pantallas no llaman a `axios`; usan hooks (`useAcceso`, `useClases`, `useMembers`) que a su vez usan los `services/`.
- **Estado global:** `AuthContext` (sesión) y `SedeContext` (sede activa). El resto del estado es local a cada pantalla.
- **Autorización en la interfaz:** `ProtectedRoute` exige token; en `modules/socios`, `guards.jsx` y `session.js` redirigen según el rol leído del JWT (el cliente externo solo accede a Canchas; el socio, solo a su ficha). Es una ayuda de navegación: **la seguridad real está en el backend**.
- **Errores:** `httpClient` toma el mensaje del backend (`mensaje`, `message` o `error`) y lo propaga como `Error`. Solo una respuesta **401** cierra la sesión.
- `modules/acceso` aplica Atomic Design y tokens de diseño en CSS (`AccesoScreen.css`).

### 1.5 Índice de ADR

Los ADR están en `docs/adr/`, uno por archivo, con Contexto, Alternativas, Decisión y Consecuencias.

| ADR | Decisión | Requisitos |
|---|---|---|
| ADR-001 | Monolito modular en capas, con orquestador interno, frente a microservicios, SOA y serverless | RN-02, RNF-04 |
| ADR-002 | PostgreSQL en Supabase frente a PostgreSQL autogestionado, MySQL y NoSQL | RNF-03, RN-02 |
| ADR-003 | Contingencia offline en el cliente (fallback sobre `localStorage`) para el control de acceso | RNF-01, RN-01, RF-02, RF-04, RF-05 |
| ADR-004 | Bloqueo pesimista (`SELECT ... FOR UPDATE`) más garantía en base para la reserva de canchas | RN-02, RNF-03 |
| ADR-005 | Node.js + Express, DI explícita y SQL directo sin ORM | RN-02, RNF-03, RNF-04 |
| ADR-006 | React + Vite como SPA, con Context API y hooks para el estado global | RF-01 a RF-14, RNF-01 |
| ADR-007 | Replicación local ligera y sincronización diferida por lotes, ordenada e idempotente | RNF-01, RN-01 |
| ADR-008 | Pirámide de pruebas de tres niveles y umbral de cobertura | RN-01, RN-02, RNF-02, RNF-03 |
| ADR-009 | Despliegue contenerizado con Docker Compose y reversión por tags | RNF-03, RNF-04 |
| ADR-010 | Pasarela con patrón Adapter, tokenización y no persistencia de datos de tarjeta | RNF-02, RNF-03 |

---

## 2. Los cinco módulos funcionales y sus responsabilidades

Todas las rutas cuelgan de `/api`. Con excepción de `/api/auth/login`, **todas exigen un JWT válido** (`verificarToken` se aplica en `appRouter.js` antes de montar el resto de las rutas). El token vence a los 30 minutos y lleva `{ id, dni, rol }`.

Roles (`usuario.id_rol`): 1 = personal de sede (recepcionista/administrador), 2 = cliente externo, 3 = socio, 4 = gerente.

| Módulo | Carpeta backend | Responsabilidad | Requisitos |
|---|---|---|---|
| **M1 Usuarios y Membresías** | `users/`, `memberships/` (+ `auth/`) | Alta, consulta y edición de usuarios; planes; renovación de membresía; login y emisión de JWT | RF-01 a RF-03 |
| **M2 Gimnasio y Acceso** | `accesses/` | QR rotativo, ingreso y salida, aforo por sede, un solo ingreso activo, clientes externos en puerta, contingencia offline | RF-04, RF-05 (y RF-02, RN-01) |
| **M3 Clases Grupales** | `activities/` | Agenda por sede, reservas con ventana de 48 h, lista de espera con ofertas temporales, notificaciones | RF-06 a RF-08 |
| **M4 Canchas Deportivas** | `canchas/` | Grilla de disponibilidad con precio dinámico, reserva sin sobreventa, historial de reservas | RF-09 a RF-12 |
| **M5 Pagos y Facturación** | `payments/` | Procesamiento de pagos mediante pasarelas, idempotencia, seguridad de datos de tarjeta, comprobante PDF | RF-13, RF-14 |
| Transversal: sedes | `sedes/` | Catálogo de sedes activas | — |

### 2.1 Endpoints por módulo

**Autenticación y sedes**

| Método y ruta | Descripción | Acceso |
|---|---|---|
| `POST /auth/login` | Valida DNI/contacto y contraseña (SHA-256) y devuelve JWT | Público |
| `GET /sedes` | Sedes activas (`id, nombre, provincia, ciudad, cupo`) | Autenticado |

**M1 Usuarios y Membresías**

| Método y ruta | Descripción | Acceso |
|---|---|---|
| `GET /users?rol=2,3` | Lista usuarios filtrados por rol | Personal |
| `GET /users/:id` | Ficha de un usuario | Personal o el propio usuario |
| `POST /users` | Alta de socio o cliente externo | Personal |
| `PATCH /users/:id` | Edita nombre, contacto y estado | Personal |
| `GET /users/:id/pagos` | Historial de pagos | Personal o el propio usuario |
| `GET /plans?activos=true` · `GET /plans/:id` | Planes | Autenticado |
| `POST /plans` · `PUT /plans/:id` · `PATCH /plans/:id/activo` | Administración de planes | Gerente |
| `POST /memberships/:idUsuario/renovar` | Cobra vía M5 y extiende el vencimiento | Personal o el propio usuario |

**M2 Acceso** (todas con `verificarToken` y `soloPersonal`, salvo la última)

| Método y ruta | Descripción |
|---|---|
| `POST /accesses/scan` | Molinete inteligente: decide ingreso o salida |
| `POST /accesses/ingreso` · `POST /accesses/salida` | Ingreso o salida explícitos |
| `GET /accesses/estado/:sedeId` | Aforo, cupo y últimos movimientos |
| `POST /accesses/externo` | Alta e ingreso de cliente externo |
| `GET /accesses/padron-offline` | Réplica de socios para la terminal |
| `POST /accesses/sincronizar-offline` | Sincronización por lote de eventos offline |
| `GET /accesses/me/historial` | Historial del socio autenticado |

**M3 Clases Grupales**

| Método y ruta | Descripción | Acceso |
|---|---|---|
| `GET /clases` · `GET /clases/:id` | Agenda (con acciones calculadas por el servidor) | Socio, recepcionista, gerente |
| `GET /clases/mi-rol` | Perfil de acceso al módulo | Autenticado |
| `POST /clases` · `PUT /clases/:id` · `DELETE /clases/:id` | Gestión de la agenda | Gerente o recepcionista de la sede |
| `GET /clases/:id/inscripciones` | Participantes | Gerente o recepcionista de la sede |
| `POST/DELETE /clases/:id/reservas` | Reservar y cancelar | Socio |
| `POST /clases/:id/lista-espera` · `POST .../aceptar` | Lista de espera y aceptación de oferta | Socio |
| `GET /clases/notificaciones` · `PUT .../:id/leida` | Avisos del socio | Socio |
| `GET /clases/mis-inscripciones` | Próximas inscripciones | Autenticado |

El contrato completo de M3 está en `modules/activities/openapi.yaml`; el global, en `backend/swagger.json` (Swagger UI en `/api-docs`).

**M4 Canchas**

| Método y ruta | Descripción |
|---|---|
| `GET /canchas/disponibilidad?idSede=&fecha=` | Grilla del día con precios y estado de cada turno |
| `POST /reservas-canchas/checkout` | Reserva y cobro (saga) |
| `GET /reservas-canchas/mis-reservas` | Reservas del usuario autenticado |

**M5 Pagos**

| Método y ruta | Descripción |
|---|---|
| `POST /payments/pay` · `POST /payments/nuevo` | Procesa un pago |
| `GET /payments/por-reserva/:reserva_id` | Pago asociado a una reserva |
| `GET /payments/:id/comprobante` | Comprobante PDF (`application/pdf`) |

### 2.2 Dependencias entre módulos

```mermaid
flowchart LR
  M1["M1 memberships"] -->|"paymentService (DI)"| M5["M5 payments"]
  M4["M4 canchas"] -->|"pagoCanchaOrchestrator"| M5
  M3["M3 activities"] -.->|"consulta suscripción en SQL"| BD[("PostgreSQL")]
  M2["M2 accesses"] -.->|"consulta suscripción en SQL"| BD
```

M1 consume el servicio de pagos inyectado; M4 lo hace a través del orquestador. M2 y M3 leen el estado de la suscripción directamente de la base, sin invocar a M1.

---

## 3. Modelo de datos y convenciones de persistencia

### 3.1 Esquema

Las tablas de clases (`clase_grupal`, `inscripciones_clase_grupal`, `notificaciones_clase_grupal`), `usuario_sede` y la columna `plan.tipo` están versionadas en `backend/migrations/`. El resto del esquema base se creó en Supabase; el diagrama siguiente lo reconstruye a partir de las consultas del código y debe **contrastarse con el DER exportado de Supabase** antes de la entrega.

```mermaid
erDiagram
  rol ||--o{ usuario : "id_rol"
  usuario ||--o| usuario_sede : "asignación"
  sede ||--o{ usuario_sede : "id_sede"
  usuario ||--o| suscripcion : "una por usuario"
  plan ||--o{ suscripcion : "id_plan"
  usuario ||--o{ pagos : "id_usuario"
  suscripcion |o--o{ pagos : "id_suscripcion"
  reserva_cancha |o--o{ pagos : "id_reserva_cancha"
  sede ||--o{ control_acceso : "id_sede"
  usuario ||--o{ control_acceso : "id_usuario"
  sede ||--o{ cancha : "id_sede"
  cancha ||--o{ horarios_cancha_config : "por día de semana"
  cancha ||--o{ reserva_cancha : "id_cancha"
  usuario ||--o{ reserva_cancha : "id_usuario"
  sede ||--o{ clase_grupal : "id_sede"
  clase_grupal ||--o{ inscripciones_clase_grupal : "id_clase_grupal"
  usuario ||--o{ inscripciones_clase_grupal : "id_usuario"
  inscripciones_clase_grupal ||--o{ notificaciones_clase_grupal : "id_inscripcion"

  usuario {
    bigint id PK
    varchar dni UK
    varchar nombre
    varchar contacto
    text password
    bigint id_rol FK
    boolean activo
  }
  plan {
    bigint id PK
    varchar nombre
    numeric precio
    varchar tipo
    varchar intervalo
    integer duracion_dias
    boolean activo
  }
  suscripcion {
    bigint id PK
    bigint id_usuario FK
    bigint id_plan FK
    varchar estado
    date fecha_proximo_vencimiento
  }
  pagos {
    bigint id PK
    numeric monto
    varchar medio_pago
    varchar estado
    varchar idempotency_key
    bigint id_suscripcion FK
    bigint id_reserva_cancha FK
  }
  reserva_cancha {
    bigint id PK
    bigint id_cancha FK
    timestamptz fecha_inicio
    timestamptz fecha_fin
    varchar estado
  }
  control_acceso {
    bigint id PK
    bigint id_sede FK
    bigint id_usuario FK
    timestamptz fecha_entrada
    timestamptz fecha_salida
  }
  inscripciones_clase_grupal {
    bigint id PK
    bigint id_clase_grupal FK
    bigint id_usuario FK
    varchar estado
    timestamptz fecha_expiracion_oferta
  }
```

### 3.2 Restricciones, índices y migraciones declaradas

| Objeto / Migración | Definición | Para qué sirve |
|---|---|---|
| `003_add_tipo_plan.sql` | `ALTER TABLE plan ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'REGULAR'` | Activa el patrón Strategy por tipo de plan (`REGULAR`, `VIP`, `STUDENT`, `PROMO_ANUAL`) |
| `chk_clase_grupal_cupo` | `cupo > 0` | Cupo válido |
| `chk_clase_grupal_fechas` | `fecha_fin > fecha_inicio` | Intervalo coherente |
| `chk_inscripciones_clase_grupal_estado` | Estados permitidos: `confirmado`, `en espera`, `notificado`, `cancelado`, `expirado`, `no_elegible` | Máquina de estados de la inscripción |
| `uq_inscripciones_clase_usuario_activa` | Índice **único parcial** sobre `(id_clase_grupal, id_usuario)` donde el estado es activo | Impide dos inscripciones activas del mismo socio en una clase |
| `idx_inscripciones_lista_espera_fifo` | Parcial sobre `en espera`, orden `fecha_registro, id` | Siguiente en la lista de espera |
| `idx_inscripciones_clase_confirmadas` | Parcial sobre `confirmado` | Conteo de lugares ocupados |
| `idx_inscripciones_usuario_activas` | Parcial sobre estados activos | Inscripción activa de un usuario |
| `idx_clase_grupal_sede_fecha` | `(id_sede, fecha_inicio)` | Agenda por sede |
| `idx_notificaciones_clase_grupal_usuario_fecha` | `(id_usuario, creada_at DESC)` | Avisos del usuario |

Las restricciones que el código **espera** en la base y no están en los scripts del repositorio: unicidad de `suscripcion.id_usuario` (la renovación usa `ON CONFLICT (id_usuario)`), unicidad de `pagos.idempotency_key` y exclusión de intervalos solapados en `reserva_cancha` por cancha (RN-02; el código mapea los errores `23505` y `23P01`). Deben versionarse en una migración.

### 3.3 Convenciones de persistencia

- **Nombres:** tablas y columnas en `snake_case`, en singular salvo `pagos` e `inscripciones_clase_grupal`. En la API, `camelCase` (las consultas lo resuelven con alias, por ejemplo `id_sede AS "idSede"`).
- **Tipos:** claves `BIGINT`; fechas de eventos `TIMESTAMPTZ`; vencimientos `DATE`; dinero `NUMERIC`.
- **Estados:** texto en minúsculas para clases y reservas (`confirmada`, `cancelada`) y en mayúsculas para pagos (`APROBADO`, `RECHAZADO`).
- **Acceso a datos:** exclusivamente por repositorios, con consultas parametrizadas (`$1, $2`). Ningún servicio concatena SQL.
- **Transacciones:** `withTransaction(work)` (`inscriptionRepository.js`) abre `BEGIN`, ejecuta y hace `COMMIT` o `ROLLBACK`, y siempre libera la conexión. Las funciones de repositorio reciben un `client` opcional (`client = pool`) para unirse a la transacción del llamador.
- **Contraseñas:** SHA-256 hexadecimal calculado en la base con `digest()` (extensión `pgcrypto`).
- **Eliminación:** no hay borrado lógico general; la baja de un usuario es `activo = false`.

### 3.4 Estados de la membresía

El estado se **deduce** de la fecha de vencimiento y de la bandera `activo`; no se persiste como una columna aparte (RF-02).

```mermaid
stateDiagram-v2
  [*] --> SinMembresia: alta de cliente externo
  [*] --> Activo: alta de socio con membresía vigente
  SinMembresia --> Activo: pago aprobado (renovar)
  Activo --> Vencido: pasa fecha_proximo_vencimiento
  Vencido --> Activo: pago aprobado (renovar)
  Activo --> Suspendido: activo = false (edición del personal)
  Vencido --> Suspendido: activo = false
  Suspendido --> Activo: activo = true y vencimiento vigente
```

---

## 4. Patrones de diseño aplicados y su ubicación en el código

| Patrón | Tipo | Ubicación |
|---|---|---|
| Strategy | Comportamiento | `canchas/domain/canchaDomain.js`, `memberships/domain/pricingStrategies.js`, `accesses/services/accessService.js` |
| Observer | Comportamiento | `activities/observers/waitlistObserver.js`, `memberships/domain/subscriptionObserver.js` |
| Repository | Arquitectónico | Todos los `*Repository.js` / `*.repository.js` |
| State | Comportamiento | `payments/domain/Pago.js`, `canchas/domain/reservaCanchaDomain.js` |
| Adapter / Factory | Estructural / Creacional | `payments/gateways/PasarelaPago.js`; `offlineStorageAdapter` (frontend) |
| Builder | Creacional | `payments/services/comprobantePdfService.js` |
| Saga con compensación | Integración | `core/orchestrator/pagoCanchaOrchestrator.js` |
| Inyección de dependencias | Arquitectónico | `*.module.js`, `createXService`, constructor de `AccessService` |
| DTO | Arquitectónico | `dtos/` de cada módulo |
| Middleware | Comportamiento | `verificarToken`, `requireRole`, guardas de `activityRoutes.js` |
| Singleton (módulo ES) | Creacional | `config/db.js`, `classWaitlistSubject`, `accessService` |

### 4.1 Strategy — precio dinámico de canchas

**Problema.** El precio de un turno depende del horario (pico o normal) y de la condición del cliente: externo, socio al día o socio en mora (RF-11, RN-03). Con condicionales repartidos, cada regla nueva obligaría a tocar el cálculo de la grilla.

**Solución.** En `canchaDomain.js` cada política es una función pura que recibe `{ precioBase, precioHoraPico, esPico }`:

```js
export const tarifaEstandarStrategy = ({ precioBase, precioHoraPico, esPico }) =>
  esPico && precioHoraPico ? Number(precioHoraPico) : Number(precioBase || 18000);

export const tarifaSocioStrategy = (ctx) => Math.round(tarifaEstandarStrategy(ctx) * 0.85); // -15%
export const tarifaSocioEnMoraStrategy = (ctx) => tarifaEstandarStrategy(ctx);              // RN-03

export const seleccionarEstrategiaTarifa = ({ esSocio = false, enMora = false } = {}) => {
  if (!esSocio) return tarifaEstandarStrategy;
  return enMora ? tarifaSocioEnMoraStrategy : tarifaSocioStrategy;
};
```

`construirGrillaCancha` recibe el **selector** como parámetro, y `createCanchaService(repo, selector)` lo inyecta, por lo que se puede reemplazar en las pruebas. Cada turno de la grilla sale con `precio` (tarifa de lista) y `precioSocio`.

**Otros usos del patrón en el sistema**

- `memberships/domain/pricingStrategies.js`: política de precio por tipo de plan (`REGULAR`, `VIP`, `STUDENT`, `PROMO_ANUAL`), elegida con `obtenerEstrategiaDePrecio` (redondeada a 2 decimales y expuesta como `precioFinal` en `toPlanResponseDTO`).
- `accesses/services/accessService.js`: el ingreso pasa por un **pipeline de reglas intercambiables** (`REGLAS_ADMISION_INGRESO`: RF-02 membresía, RN-01 un solo ingreso activo, RF-05 aforo). Se evalúan en orden y la primera que rechaza corta el flujo. Se inyectan por constructor.

**Beneficio.** Abierto/Cerrado: una tarifa nueva (por ejemplo, "estudiante") es una función más y una rama en el selector, sin modificar la construcción de la grilla. Cada política se prueba por separado (`canchaDomain.test.js`, `pricingStrategies.test.js`).

### 4.2 Observer — lista de espera de clases

**Problema.** Cuando se libera un cupo hay que avisar al siguiente socio de la lista. El servicio de inscripciones no debería conocer a cada destinatario ni quedar acoplado a los canales de aviso.

**Solución.** `WaitlistSubject` mantiene la lista de observers y ofrece `subscribe()` (que devuelve la función para desuscribirse) y `notify(evento)`, que los invoca en orden y **aísla los errores**: si uno falla, se registra y los demás siguen. `ConsoleWaitlistObserver` es el observer concreto. `classWaitlistSubject` es la instancia compartida.

**Flujo (actividad de la lista de espera)**

```mermaid
flowchart TD
  A["Socio cancela un lugar confirmado<br/>o rechaza una oferta"] --> B["withTransaction: lockActivityById (FOR UPDATE)"]
  B --> C["cancelInscription"]
  C --> D["offerAvailablePlaces"]
  D --> D1["expireWaitlistOffers + markIneligibleWaitlistEntries"]
  D1 --> E{"¿hay cupo libre<br/>y alguien en espera?"}
  E -- "sí" --> F["findNextWaitlist (FIFO, solo socios con membresía vigente)"]
  F --> G["promoteWaitlistInscription: estado 'notificado'<br/>+ vencimiento de la oferta (15 min)"]
  G --> H["createWaitlistPromotion: persiste la notificación<br/>(misma transacción)"]
  H --> E
  E -- "no" --> I["COMMIT"]
  I --> J["notifyWaitlistEvents: Subject.notify(evento)"]
  J --> K["Observers reciben el evento"]
```

**Decisión de diseño.** La notificación persistente se guarda **dentro** de la transacción y los observers se disparan recién **después del `COMMIT`**: nunca se avisa de algo que no quedó guardado, y un fallo de un observer no deshace la inscripción. Las ofertas vencidas las procesa un proceso periódico (`startWaitlistOfferExpirationWorker`, cada `WAITLIST_OFFER_CHECK_INTERVAL_MS`).

**Segundo uso.** `memberships/domain/subscriptionObserver.js` aplica el mismo patrón a la renovación de membresías (auditoría y aviso), con el mismo aislamiento de errores.

### 4.3 Repository — abstracción de la persistencia

**Solución.** Cada módulo accede a PostgreSQL únicamente a través de sus repositorios, que exponen operaciones del dominio y reciben el `pool` (o un `client` de transacción). Dos estilos conviven: módulos con funciones exportadas (`activities`, `accesses`, `sedes`) y módulos con fábricas `createXRepository(pool)` (`users`, `memberships`, `canchas`).

El módulo de pagos tiene **dos implementaciones intercambiables** de la misma interfaz: `PostgresPagoRepository` e `InMemoryPagoRepository`.

**Beneficio.**

- Los servicios se prueban con repositorios falsos, por lo que la mayor parte de la suite corre sin base de datos.
- Las consultas se pueden unir a una transacción sin cambiar el servicio.
- Cambiar de motor o de estrategia de acceso afecta una sola capa.

### 4.4 Patrones creacionales y estructurales

| Patrón | Dónde | Qué resuelve |
|---|---|---|
| **Adapter** | `MercadoPagoAdapter` y `ModoAdapter` implementan `PasarelaPago` | Traducen las respuestas de cada proveedor (`approved/rejected/in_process`, `ACCEPTED/DECLINED/PENDING`) al vocabulario del dominio (`APROBADO/RECHAZADO/PENDIENTE`). `MockTestAdapter` cubre el resto de los medios. |
| **Adapter (frontend)** | `offlineStorageAdapter` en `accesoService.js` | Encapsula `localStorage`; migrar a IndexedDB cambia solo ese objeto. |
| **Factory** | `PasarelaFactory.conPasarelasEstandar()` y `crear(metodoPago)` | Elige el adaptador por medio de pago; es extensible con `registrar()`. Las funciones `createXService/Controller/Router` también son fábricas. |
| **Builder** | `ComprobanteBuilder` | Arma el comprobante paso a paso (`conNumero`, `conFecha`, `conSocio`, `conPago`) y `build()` devuelve un *snapshot* inmutable (`Object.freeze`) más el buffer del PDF. |
| **State** | `Pago` y `reservaCanchaDomain` | Tabla de transiciones válidas; las inválidas lanzan error de dominio (que el servicio traduce a HTTP 409). Ver diagramas siguientes. |
| **Saga orquestada** | `pagoCanchaOrchestrator` | Reservar y cobrar no entran en una sola transacción: se crea la reserva `pendiente`, se cobra y se confirma; si el pago falla o algo se rompe, se **compensa** pasando la reserva a `cancelada`. |
| **Inyección de dependencias / Composition Root** | `users.module.js`, `memberships.module.js`, `canchas.module.js`; constructor de `AccessService` | Ensamblado en un único lugar por módulo; los tests inyectan repositorios falsos y un reloj fijo. |
| **DTO** | `users.dto.js`, `plans.dto.js`, `activity.dto.js`, `access.dto.js`, `payment.dto.js` | Normalizan lo que entra y definen lo que sale (la contraseña nunca se expone). |
| **Middleware** | `verificarToken` → `requireRole` / `soloPersonal` / `requireClassAccess` → controlador | La autorización se declara en la ruta. `createRequireAgendaManager` es una fábrica con dependencias inyectables. |
| **Singleton** | `pool`, `classWaitlistSubject`, `export default new AccessService()` | Un módulo ES se evalúa una sola vez: instancia única compartida, sin implementarlo a mano. |

**Estados de la reserva y del pago**

```mermaid
stateDiagram-v2
  direction LR
  state "Reserva de cancha" as R {
    [*] --> pendiente
    pendiente --> confirmada: pago aprobado
    pendiente --> cancelada: pago rechazado / error (compensación)
    confirmada --> cancelada
    cancelada --> [*]
  }
  state "Pago" as P {
    [*] --> PENDIENTE
    PENDIENTE --> APROBADO
    PENDIENTE --> RECHAZADO
    APROBADO --> REEMBOLSADO
  }
```

**Sobre las pasarelas.** Los adaptadores **simulan** la respuesta del proveedor: reciben el pedido, aplican las reglas del dominio y devuelven un estado sin llamar a una API real. El token solo sirve para forzar escenarios de prueba (un token que contiene "rechazad" o "pendient"). La integración real consistiría en reemplazar el cuerpo de `cobrar()` por una llamada HTTP al proveedor sin tocar el servicio.

---

## 5. Control de concurrencia en las reservas

### 5.1 Reserva de canchas (RN-02, ADR-004)

La reserva se hace con **bloqueo pesimista** dentro de una transacción (`reservaCanchaRepository.insertReservaConBloqueoPesimista`):

```text
BEGIN
  SELECT id FROM cancha WHERE id = $1 FOR UPDATE      -- 1. bloquea la fila de la cancha
  SELECT id FROM reserva_cancha                        -- 2. verifica solapamiento
   WHERE id_cancha = $1 AND estado != 'cancelada'
     AND fecha_inicio < $fin AND fecha_fin > $inicio
  INSERT INTO reserva_cancha (... estado 'pendiente')  -- 3. inserta
COMMIT   (ROLLBACK ante cualquier error)
```

Capas de protección:

1. **Aplicación:** el `FOR UPDATE` serializa a quienes compiten por la misma cancha; el segundo entra recién cuando el primero terminó y ve el turno ocupado. Recibe un `409` con *"El horario seleccionado ya se encuentra ocupado o reservado"*.
2. **Base de datos:** una restricción de exclusión sobre el rango horario de cada cancha respalda la regla aunque falle la lógica de aplicación. El servicio traduce `23P01` y `23505` a `409`.
3. **Compensación:** si el cobro falla, el orquestador cancela la reserva y libera el turno.

Se bloquea la fila de la **cancha** y no cada turno porque los turnos se calculan, no son filas. La consecuencia es que dos reservas de horarios distintos de la misma cancha también se serializan; por eso la transacción es corta.

```mermaid
sequenceDiagram
  participant A as Usuario A
  participant B as Usuario B
  participant API as API (checkout)
  participant DB as PostgreSQL

  A->>API: POST checkout (cancha 1, 19:00)
  B->>API: POST checkout (cancha 1, 19:00)
  API->>DB: BEGIN + SELECT cancha FOR UPDATE (A)
  API->>DB: BEGIN + SELECT cancha FOR UPDATE (B)
  Note over DB: B espera: la fila está bloqueada por A
  API->>DB: A: verifica solapamiento → libre → INSERT → COMMIT
  DB-->>API: se libera el bloqueo
  API->>DB: B: verifica solapamiento → ocupado → ROLLBACK
  API-->>A: 201 reserva confirmada (tras el cobro)
  API-->>B: 409 horario ocupado
```

### 5.2 Inscripción a clases

- `lockActivityById` hace `SELECT ... FOR UPDATE` sobre la fila de la clase: serializa reservas, listas de espera, cancelaciones y cambios de cupo de esa clase.
- El índice único parcial `uq_inscripciones_clase_usuario_activa` impide, a nivel de base, dos inscripciones activas del mismo socio. El servicio traduce su violación a `409` (*"Ya tenés una inscripción activa en esta clase"*).
- Dentro de la transacción se cuentan los lugares ocupados (confirmados más ofertas vigentes) y se valida el cupo antes de insertar.

### 5.3 Pagos: idempotencia y duplicados

- **Idempotencia:** si llega una `idempotencyKey` ya registrada, se devuelve el pago anterior sin volver a cobrar. La consulta se hace antes y dentro de la sección crítica; además, la base captura la violación de unicidad (`23505`) y devuelve el pago existente.
- **Un pago aprobado por reserva:** `findApprovedByReservaId` y `DuplicatePaymentError` (409). Un cerrojo en memoria por reserva (`locksPorReserva`) serializa los intentos dentro de **una misma instancia** del proceso; con varias instancias, la garantía la da la base.

### 5.4 Pruebas de concurrencia

| Prueba | Qué verifica | Nivel |
|---|---|---|
| `test/reservaCancha.concurrencia.test.js` | 2 y 5 reservas simultáneas del mismo turno: una gana y el resto recibe 409 (servicio y HTTP) | Repositorio transaccional **simulado** |
| `test/payments.test.js` | 10 pagos simultáneos sobre la misma reserva: se aprueba uno y 9 reciben `DuplicatePaymentError` | Repositorio en memoria |
| `test/payments.test.js` | Reintento con la misma `idempotencyKey`: la pasarela se invoca una sola vez | Repositorio en memoria |
| `activities/activityIntegration.test.js` | Dos socios compiten por el último cupo: una reserva gana y la otra recibe 409 | **PostgreSQL real** (`TEST_DATABASE_URL`) |
| `test/subscriptions.concurrency.test.js` | 5 renovaciones simultáneas generan un solo cobro | Servicio de pagos simulado |

---

## 6. Arquitectura offline del control de acceso

**Objetivo (RNF-01).** La terminal de una sede debe seguir validando QR aunque se cae la conexión con el servidor central (ADR-003, ADR-007).

**Decisión.** La contingencia vive en el cliente (`accesoService.js`, `sedeService.js`), con una réplica local en `localStorage`; no hay servidores ni bases locales en las sedes.

### 6.1 El QR rotativo (RF-04)

- Formato: `FITZONE-<idUsuario>-<timestamp_ms>`, generado en el navegador del socio (`CredencialScreen`) y regenerado cada 60 segundos.
- Vigencia: se acepta si la antigüedad está entre **-10 000 ms** (tolerancia por reloj adelantado) y **+65 000 ms** (60 s de rotación más 5 s de red). Lo valida `validarFormatoYVigenciaQR` en el servidor y `parsearYValidarQR` en la terminal, con la misma regla.
- El `AccessService` recibe un **reloj inyectable**, lo que permite probar los casos límite exactos (65 000 ms vs 65 001 ms).

### 6.2 Datos replicados y frecuencia

| Clave de `localStorage` | Contenido | Se actualiza |
|---|---|---|
| `fitzone_padron_offline` | Socios activos con `estado_suscripcion`, `esta_adentro`, `id_sede_activa`, `id_rol` | En cada consulta de estado de sede con conexión (al abrir el panel, cambiar de sede y tras cada escaneo) |
| `fitzone_sedes_offline` | Catálogo de sedes con su cupo | Al cargar las sedes con conexión |
| `fitzone_estado_sede_<id>` | Último aforo, cupo y movimientos | En cada consulta con la cola vacía |
| `fitzone_cola_accesos_offline` | Cola de eventos pendientes (FIFO) | En cada ingreso o salida local |

### 6.3 Validación sin conexión y sincronización

```mermaid
sequenceDiagram
  participant S as Socio (portal)
  participant T as Terminal (accesoService)
  participant LS as localStorage
  participant API as API central
  participant DB as PostgreSQL

  S->>S: genera QR FITZONE-id-timestamp (cada 60 s)
  S->>T: muestra el QR
  T->>API: POST /accesses/scan
  API--xT: sin conexión (Network Error)
  T->>T: parsearYValidarQR (formato + vigencia)
  T->>LS: lee padrón: membresía, sede activa (RN-01), cupo (RF-05)
  T->>LS: actualiza padrón, aforo y encola evento {usuarioId, sedeId, tipoAccion, fechaEvento}
  T-->>S: acceso autorizado (Modo Offline)

  Note over T,API: la conexión vuelve
  T->>T: sincronizarColaOffline (cerrojo promesaSincronizacion)
  T->>API: POST /accesses/sincronizar-offline {eventos}
  API->>API: ordena por fechaEvento ascendente
  API->>DB: ingreso: si no está adentro → createAccess / salida: registrarSalida
  API-->>T: 200 {procesados, errores}
  T->>LS: limpia la cola y refresca el padrón
```

### 6.4 Resolución de conflictos al reconectar

- **Orden:** el servidor procesa los eventos por `fechaEvento` ascendente, de modo que un ingreso se aplica antes que su salida.
- **Idempotencia:** un `ingreso` de un socio que ya figura adentro se descarta (RN-01); una `salida` sin ingreso abierto no genera registro.
- **Concurrencia en el cliente:** un cerrojo (`promesaSincronizacion`) evita sincronizaciones paralelas y la secuencia es siempre sincronizar → consultar estado → actualizar réplica, para que una consulta temprana no pise el aforo local con datos viejos.
- **Equivalencia de reglas:** la terminal valida membresía activa, ingreso en otra sede (RN-01) y cupo por sede (RF-05), igual que el servidor. Los clientes externos no suman al aforo.

### 6.5 Limitaciones

- La réplica se carga solo cuando la terminal tuvo conexión; los cambios posteriores (altas, renovaciones) no están hasta la próxima descarga.
- Capacidad de `localStorage` (~5 MB) y dependencia del navegador: limpiar los datos del sitio con eventos pendientes los pierde.
- La cola se vacía al recibir `200` del lote, aunque el servidor informe `errores > 0`. No hay una pantalla de conciliación manual para esos eventos.
- Se requiere el reloj de la terminal sincronizado con el servidor.

---

## 7. Guía de extensión

La estructura modular y los patrones aplicados permiten incorporar nuevas funcionalidades sin modificar el núcleo del sistema ni romper contratos existentes.

### 7.1 Agregar un módulo funcional en el backend

1. **Crear la carpeta del módulo** en `backend/src/modules/<nombre>/` respetando las capas estándar:
   - `repositories/<nombre>.repository.js`: fábrica `createXRepository(pool)` con SQL parametrizado (`$1, $2`).
   - `services/<nombre>.service.js`: fábrica `createXService({ repo, ...deps })` con reglas de negocio y errores de dominio.
   - `controllers/<nombre>.controller.js`: fábrica `createXController(service)` que traduce `req` / `res` HTTP.
   - `routes/<nombre>.routes.js`: fábrica `createXRouter(controller)` con middlewares de autorización (`requireRole`).
   - `<nombre>.module.js`: *composition root* del módulo donde se instancian y conectan las capas.
2. **Registrar el router en el ensamblador:** importar el módulo en `backend/src/appRouter.js` y montarlo bajo `/api/<ruta>` (el middleware `verificarToken` ya protege todas las rutas montadas después de `/auth`).
3. **Versionar cambios de esquema:** si el módulo requiere tablas o columnas nuevas, agregar un script secuencial en `backend/migrations/00X_<descripcion>.sql` para que lo aplique `apply_migrations.mjs` en CI y producción.
4. **Agregar vistas en el frontend:** crear `frontend/src/modules/<nombre>/` con sus subcarpetas `{components, hooks, pages, services, routes.jsx}` y registrar sus rutas en `App.jsx` dentro de `ProtectedRoute`.

### 7.2 Agregar una nueva política de precio (Strategy)

- **Para planes de membresía:** agregar la clave y función de cálculo en el objeto `pricingStrategies` de `backend/src/modules/memberships/domain/pricingStrategies.js` (por ejemplo, `CORPORATIVO: { calcular: (base) => base * 0.85 }`) y asignar ese `tipo` en la tabla `plan`. Tanto `obtenerEstrategiaDePrecio` como `toPlanResponseDTO` aplican el redondeo y devuelven `precioFinal` automáticamente.
- **Para tarifas de canchas:** definir la función pura en `backend/src/modules/canchas/domain/canchaDomain.js` recibiendo `{ precioBase, precioHoraPico, esPico }` y registrarla en `seleccionarEstrategiaTarifa`.

### 7.3 Registrar una nueva pasarela de pago (Adapter + Factory)

1. Crear una subclase de `PasarelaPago` en `backend/src/modules/payments/gateways/PasarelaPago.js` implementando `cobrar({ monto, moneda, token, metadata })` y mapeando la respuesta del proveedor a `{ estado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE', transaccionId, mensaje }`.
2. Registrar el nuevo adaptador en `PasarelaFactory.conPasarelasEstandar()` (o mediante `factory.registrar('NOMBRE_PASARELA', new NuevoAdapter())`) sin modificar `pagoService.js`.

### 7.4 Suscribir un nuevo canal de notificación (Observer)

- Implementar un objeto con el método `update(evento)` y suscribirlo mediante `classWaitlistSubject.subscribe(nuevoObserver)` (clases grupales) o en `subscriptionObserver.js` (renovación de membresías). El `Subject` aísla excepciones para que un fallo en un canal externo (correo, push) no interrumpa la operación principal.

---

## 8. Pruebas: cómo correrlas y cómo leer la cobertura

### 8.1 Comandos

```bash
# Backend (runner nativo de Node: node --test)
cd backend
npm test                      # toda la suite; no requiere base de datos
npm run test:coverage         # suite + c8 con verificación de umbrales por archivo

# Integración contra PostgreSQL (opcional; usar una base DISTINTA de la de la aplicación)
export TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/fitzone_integration_test?sslmode=disable"
npm test

# Frontend (Vitest + Testing Library, entorno jsdom)
cd ../frontend
npm test
npm run build
```

### 8.2 Pirámide de pruebas (ADR-008)

| Nivel | Qué cubre | Ejemplos |
|---|---|---|
| **Unitarias** (base) | Dominio y servicios con repositorios falsos y reloj fijo | `accessService.test.js` (casos límite del QR), `canchaDomain.test.js`, `reservaCanchaDomain.test.js`, `pricingStrategies.test.js`, `authDomain.test.js`, `classPolicy.test.js`, `waitlistObserver.test.js`, `activityService.test.js`, `plans.test.js`, `users.test.js` |
| **Integración** | Ruta → controlador → servicio → dominio con una app Express real y repositorios simulados | `canchas.integration.test.js`, `memberships.integration.test.js`, `activityPermissions.test.js`, `payments.test.js` (flujo HTTP del pago y el PDF) |
| **Integración con PostgreSQL** | Transacciones, bloqueos y restricciones reales | `activityIntegration.test.js` (corre con `TEST_DATABASE_URL`) |
| **Concurrencia** (tope) | Reservas y pagos simultáneos | Ver sección 5.4 |
| **Frontend** | Componentes y hooks | `ClaseCard.test.jsx`, `ClaseTable.test.jsx`, `useClases.test.jsx` |

### 8.3 Cobertura

`npm run test:coverage` ejecuta `npm test` bajo **c8** y verifica los umbrales **por archivo** sobre una lista de archivos incluidos (`--include=...` en `package.json`): servicios y repositorios de clases, servicio de accesos, dominio y servicio de autenticación, dominio y servicios de canchas, todo el módulo de pagos y los servicios de membresías y usuarios.

| Métrica | Umbral configurado por archivo |
|---|---|
| Líneas | 15% |
| Ramas | 10% |
| Funciones | 0% |

El pipeline falla si algún archivo incluido queda por debajo.

**Cómo leer el reporte.** c8 imprime una tabla por archivo con `% Stmts`, `% Branch`, `% Funcs` y `% Lines`, y la columna `Uncovered Line #s` con las líneas sin ejecutar. Para un reporte navegable:

```bash
npx c8 --reporter=html --include=src/modules/**/*.js npm test
# abre coverage/index.html
```

El objetivo declarado en ADR-008 es un umbral global del **70%**. Regenerar el reporte antes de la entrega y registrar el porcentaje real en el README; los umbrales de `package.json` deben coincidir con lo que afirma el ADR.

---

## 9. Pipeline de integración y entrega continuas

El pipeline está en `.github/workflows/ci.yml` (GitHub Actions) y se dispara con cada *push* y cada *pull request* hacia `main`.

```mermaid
flowchart LR
  PR["Pull Request / push a main"] --> CO["Checkout del código"]
  CO --> N["Node.js 24"]
  N --> B1["Backend: npm ci"]
  B1 --> DBS["Bases aisladas (PostgreSQL 16)<br/>fitzone_app_test + fitzone_integration_test"]
  DBS --> SCH["Esquema de prueba + migraciones<br/>(activities-test-schema.sql, apply_migrations.mjs)"]
  SCH --> T["npm run test:coverage<br/>pruebas + umbrales de cobertura"]
  T --> F1["Frontend: npm ci + npm test"]
  F1 --> F2["Frontend: npm run build"]
  F2 --> OK["Resultado: aprobado / rechazado"]
```

| Etapa | Detalle |
|---|---|
| Servicio | `postgres:16` con *health check* (`pg_isready`) |
| Variables de prueba | `NODE_ENV=test`, `JWT_SECRET` de CI, `DATABASE_URL` y `TEST_DATABASE_URL` apuntando a dos bases distintas |
| Bases | Se crean dos bases; en ambas se carga `backend/test/activities-test-schema.sql` y se aplican las migraciones |
| Pruebas | `npm run test:coverage` (suite completa más verificación de cobertura) |
| Frontend | `npm test` (Vitest) y `npm run build` |

**Alcance.** El pipeline implementa **integración continua**. El despliegue se hace manualmente con Docker Compose (ADR-009), a partir de un tag. Para que el pipeline bloquee los *merge*, activar en GitHub la protección de `main` exigiendo que el chequeo pase (*Settings → Branches → Require status checks to pass*).

---

## 10. Convenciones de código, ramas y mensajes de commit

### 10.1 Código

- **Módulos ES** (`"type": "module"`): `import` / `export`; extensión `.js` obligatoria en los imports.
- **Nombres de archivo:** los nombres deben coincidir **exactamente** con los imports, incluidas mayúsculas. Windows lo tolera y Linux (CI, Docker) no: un `UseHistorialSocio.js` importado como `useHistorialSocio.js` rompe el build.
- **Estructura de un módulo backend:** `routes/ → controllers/ → services/ → repositories/`, con `dtos/` y `domain/` cuando hay reglas propias, `errors.js` para errores del módulo y `*.module.js` como ensamblado.
- **Fábricas con dependencias:** `createXRepository(pool)`, `createXService({ ...deps })`, `createXController(service)`, `createXRouter(controller)`.
- **Idioma:** el dominio se nombra en español (`reserva`, `cancha`, `suscripcion`); el vocabulario técnico, en inglés (`controller`, `repository`).
- **Capas:** el SQL vive solo en repositorios; las reglas de negocio, en servicios y dominio; el controlador solo traduce HTTP.
- **Frontend:** componentes en `PascalCase.jsx`, hooks `useXxx`, servicios `xxxService.js`, una carpeta por módulo.

### 10.2 Contratos de error

| Origen | Forma de la respuesta |
|---|---|
| Middleware central (`errorHandler`) | `{ success: false, status, message }` (con `stack` solo en `NODE_ENV=development`) |
| Pagos | `{ success: false, code, message }` (`code` identifica el error de dominio) |
| Accesos | `{ success: false, mensaje }` |
| Clases | `{ message }` |

Códigos de estado usados: `400` datos inválidos, `401` token ausente o vencido, `403` sin permiso, `404` inexistente, `409` conflicto (horario ocupado, transición inválida, duplicado), `422` dato sensible de tarjeta (RNF-02), `402` pago rechazado en el checkout. El cliente (`httpClient`) acepta `mensaje`, `message` o `error`.

### 10.3 Ramas

- `main` es la rama de integración y la que ejecuta el pipeline.
- Cada cambio se desarrolla en una rama `feature/<tema>` (o `fix/<tema>`) y entra por *pull request*.
- Las entregas se marcan con *tags* anotados (`v1.0-entrega`).
- Antes de subir: `npm run build` (frontend) y `npm test` (backend) en verde.

### 10.4 Mensajes de commit

Formato *Conventional Commits* con el módulo entre paréntesis:

```text
<tipo>(<módulo>): <descripción en imperativo>
```

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un defecto |
| `refactor` | Cambio interno sin alterar el comportamiento |
| `test` | Pruebas |
| `docs` | Documentación |
| `security` | Cambios de seguridad |

Ejemplos reales del repositorio: `feat(accesses): contingencia offline en terminal de sede y sincronizacion diferida (RNF-01)`, `security(accesses): integración de middleware de autorización por roles`, `fix(accesses): vincular aforo maximo en tiempo real con el cupo de cada sede en BD (RF-05)`. Evitar mensajes como "cambios" o "fix" sin contexto.

---

## Anexo — Limitaciones conocidas y deuda técnica

1. **Pasarelas simuladas.** Mercado Pago y MODO están implementados como adaptadores que simulan la respuesta del proveedor; no hay llamadas HTTP reales ni *webhooks*.
2. **Tarifa del checkout.** El cobro de una reserva usa el monto que envía el cliente. La estrategia de tarifa de externo para el socio en mora (RN-03) existe en el dominio, pero no se aplica al cobrar según quién paga. Actualizar esta nota cuando se corrija.
3. **Descuento duplicado en el frontend.** `CanchaCard` y `HorarioSlotCard` recalculan el 15% cuando el backend ya envía `precioSocio`.
4. **Medio de pago "Pagar en Sede".** Visible en el modal de reserva, pero `PasarelaFactory` no lo registra y el backend responde `400`.
5. **Autorización en pagos.** `paymentController` lee `req.user` y el middleware de autenticación deja el usuario en `req.usuario`; `GET /payments/:id/comprobante` no verifica que el pago pertenezca a quien lo pide.
6. **Dos pools de conexión.** `config/db.js` (con SSL) y `src/db.js` (usado por el repositorio de pagos).
7. **Autorización por rol en dos mecanismos.** Comparación por id numérico (`requireRole`, `soloPersonal`) y por el `tipo` de la tabla `rol` (módulo de clases).
8. **Esquema base sin versionar.** Solo las migraciones de clases, asignación de sede y tipo de plan están en el repositorio.
9. **Renovación de membresía no atómica de punta a punta.** Cobro, actualización de la suscripción y vinculación del pago son pasos separados.
10. **Contraseñas con SHA-256 sin sal.** Recomendable pasar a bcrypt o argon2 en producción.
11. **Observers que solo registran en consola.** La huella persistente de los eventos es la fila de notificación (clases) y el pago/suscripción (membresías).
12. **Despliegue manual.** No hay publicación automática de imágenes ni *endpoint* de salud.