# Bitácora – Chavez Coradini, Yair Nahuel – Rol P1 a P4

## Sprint 1 – Unidad I – Semana del 2026-08-27

### 2026-08-29 · 2 h

**Actividad**
Inicialización del repositorio central en GitHub para el proyecto integrador "FitZone Sports" y creación del archivo base `README.md`.

**Decisión**
Establecer un monorepo con carpetas separadas para `backend`, `frontend` y `docs` para centralizar el versionado y el flujo de trabajo colaborativo del equipo.

**Problema o bloqueo**
Sin bloqueos.

**Commits**
`e47088f` Initial commit

---

### 2026-09-03 · 4 h

**Actividad**
Actualización de la documentación inicial del repositorio y creación de la estructura base del backend en Node.js y Express, configurando la conexión a PostgreSQL (`config/db.js`), middlewares globales (`cors.js`, `errorHandler.js`, `globalMiddlewares.js`) y el esqueleto modular (`activities`, `auth`, `courts`, `memberships`, `payments`, `reservations`, `users`, `core/orchestrator`).

**Decisión**
Adoptar una arquitectura monolítica modular por capas (`routes`, `controllers`, `services`, `repositories`) con un directorio `core/` para middlewares transversales y orquestación intermodular.

**Problema o bloqueo**
Al integrar la rama con los avances iniciales del frontend surgieron divergencias en el historial remoto, resueltas mediante merge limpio de `origin/main`.

**Commits**
`00f7e6c` Update README.md · `6745c60` feat: estructura backend, conexion db y middlewares · `6091885` Merge remote-tracking branch 'origin/main'

---

### 2026-09-06 · 1 h

**Actividad**
Corrección de la importación del middleware `errorHandler` en el punto de entrada `backend/src/index.js`.

**Decisión**
Centralizar el manejo de excepciones HTTP en el pipeline principal de Express antes de levantar los módulos funcionales.

**Problema o bloqueo**
El middleware de errores no estaba importado en `index.js`, lo que impedía capturar fallos no controlados de forma uniforme. Se corrigió el import en el archivo de entrada.

**Commits**
`0a071be` fix(backend): importar errorHandler en index.js

---

### 2026-09-07 · 5 h

**Actividad**
Implementación del módulo de autenticación con emisión y verificación de tokens JWT (`authMiddleware.js`, `authRoutes.js`, `authController.js`, `authService.js`, `authRepository.js`), implementación completa del módulo de sedes (`sedeRoutes.js`, `sedeController.js`, `sedeService.js`, `sedeRepository.js`) y montaje en `appRouter.js`. En frontend, construcción del layout principal (`MainLayout`, `NavTabs`, `SedeSelector`, `UserProfileCard`), rutas protegidas (`ProtectedRoute.jsx`), contexto global de sedes (`SedeContext.jsx`) y pantallas de Login (`LoginScreen`, `LoginForm`, `useLogin`).

**Decisión**
Proteger las rutas de negocio en `appRouter.js` mediante `verificarToken` dejando únicamente `/auth` como ruta pública, y gestionar la sede activa de forma global en el cliente con `SedeContext` para filtrar las vistas por sucursal.

**Problema o bloqueo**
Sin bloqueos.

**Commits**
`efce2d8` feat: login con JWT, pipeline de sedes y layout principal · `f1d822a` feat(auth): actualizar diseño visual del login con estilo FitZone

---

### 2026-09-09 · 5 h

**Actividad**
Desarrollo de la primera versión funcional del Módulo 4 (Canchas Deportivas) en backend (`canchasRoutes.js`, `canchaController.js`, `canchaService.js`, `canchaRepository.js`) y en frontend (`CanchasScreen`, `CanchasFiltros`, `CanchaCard`, `CanchaDrawer`, `HorarioSlotCard`, `CustomDatePicker`), además de la creación del cliente HTTP base (`httpClient.js`). Posteriormente, reorganización del frontend separando `AuthContext.jsx`, `ProtectedRoute.jsx` y `layouts/mainLayout`.

**Decisión**
Desacoplar la autenticación del resto de los módulos mediante `AuthContext` y `ProtectedRoute`, y estructurar las vistas de cada módulo bajo `frontend/src/modules/` con subcarpetas `components/`, `pages/`, `hooks/` y `services/`.

**Problema o bloqueo**
Conflictos de sincronización local al integrar cambios con `origin/main` (resueltos mediante auto-stash) y duplicación inicial de `authService.jsx` tras mover carpetas, resuelta eliminando el archivo redundante.

**Commits**
`bf2bd9a` Auto stash before merge of "main" and "origin/main" · `79c588a` refactor(frontend): reorganizar layouts, rutas protegidas y flujo de AuthContext

---

## Sprint 2 – Unidad II – Semana del 2026-09-10

### 2026-09-14 · 1 h

**Actividad**
Actualización de la documentación general en `README.md` reflejando la estructura de módulos y responsabilidades del equipo durante el desarrollo de las capas backend.

**Decisión**
Mantener actualizada la guía de configuración y estructura del repositorio para facilitar la integración paralela de los módulos M1 a M5.

**Problema o bloqueo**
Sin bloqueos.

**Commits**
`c2587a3` Update README.md

---

## Sprint 4 – Unidad IV – Semana del 2026-10-12

### 2026-10-22 · 6 h

**Actividad**
Implementación integral del flujo de reservas de canchas y orquestación de pagos en backend (`reservaCanchaRoutes.js`, `reservaCanchaController.js`, `reservaCanchaService.js`, `reservaCanchaRepository.js` y `core/orchestrator/pagoCanchaOrchestrator.js`), junto con la separación de `app.js` respecto de `index.js` y manejadores de errores (`errorHandler.js`, `notFoundHandler.js`). En frontend, desarrollo del modal de checkout (`ModalCheckoutReserva`), alertas flotantes (`MensajeFlotante`), hooks (`useCanchasDisponibilidad`, `useCanchasFiltradas`) y servicio `reservaCanchaService.js`.

**Decisión**
Separar la instancia de Express (`app.js`) del arranque del servidor (`index.js`) para habilitar pruebas de integración HTTP sin levantar puertos reales, e implementar `pagoCanchaOrchestrator.js` para coordinar la creación de reservas de canchas con el procesamiento de pagos.

**Problema o bloqueo**
Necesidad de coordinar transacciones entre la reserva de turno y el cobro sin dejar turnos bloqueados ante rechazos; se resolvió centralizando la coordinación en `pagoCanchaOrchestrator.js`.

**Commits**
`a8c6e3a` feat(canchas): mejorar pantallas y reorganizar archivos base del backend

---

## Sprint 5 – Unidad V – Semana del 2026-10-26

### 2026-10-26 · 2 h

**Actividad**
Implementación del endpoint para listar el historial de reservas de canchas del usuario autenticado (`reservaCanchaRoutes.js`, `reservaCanchaController.js`, `reservaCanchaService.js`, `reservaCanchaRepository.js`).

**Decisión**
Obtener la identidad del usuario directamente desde el token JWT en el controlador para garantizar que cada socio consulte únicamente sus propias reservas.

**Problema o bloqueo**
Sin bloqueos.

**Commits**
`6c78583` Nuevo endpoint para ver todas las reservas de un usuario

---

## Cierre – Unidad VI – Semana del 2026-11-16

### 2026-11-17 · 1 h

**Actividad**
Ajuste en el enrutamiento inicial del frontend (`App.jsx`, `NavTabs.jsx`, `useLogin.js`) para redirigir el ingreso por defecto hacia `/acceso`.

**Decisión**
Priorizar la vista de control de acceso y credencial digital como pantalla principal tras el inicio de sesión.

**Problema o bloqueo**
Sin bloqueos.

**Commits**
`1516a57` feat(router): redirigir inicio a /acceso

---

### 2026-11-18 · 8 h

**Actividad**
Refactorización arquitectónica de los módulos de Canchas, Reservas y Auth aplicando Inyección de Dependencias mediante funciones factoría y módulos ensambladores (`canchas.module.js`, `auth.module.js`). Implementación de los patrones de diseño Strategy (cálculo dinámico de tarifas según horario pico y condición de socio en `canchaDomain.js`) y State (transiciones de estado de reservas en `reservaCanchaDomain.js`). Documentación del contrato OpenAPI 3.0 en `backend/swagger.json` con montaje de Swagger UI. Creación de suites de pruebas unitarias, de integración y de concurrencia (`authDomain.test.js`, `authService.test.js`, `canchaDomain.test.js`, `canchaService.test.js`, `canchas.integration.test.js`, `reservaCancha.concurrencia.test.js`, `reservaCanchaDomain.test.js`, `reservaCanchaService.test.js`). Corrección del pipeline CI en `.github/workflows/ci.yml` y configuración de despliegue con `Dockerfile` (`backend`/`frontend`), `docker-compose.yml`, `nginx.conf` y `.env.example`.

**Decisión**
Adoptar funciones factoría y un Composition Root por módulo (`canchas.module.js`, `auth.module.js`) para desacoplar la lógica de dominio y servicios de la base de datos en tests; encapsular reglas de precios y estados en capas `domain/` puras; y contenerizar backend y frontend con Docker Compose para estandarizar el despliegue.

**Problema o bloqueo**
El workflow de GitHub Actions fallaba por la ruta del esquema SQL de pruebas y la ausencia de `JWT_SECRET` en el entorno de CI; se corrigió la ruta en `.github/workflows/ci.yml` y se inyectó la variable de entorno de prueba.

**Commits**
`33394d2` refactor(canchas): aplicar inyeccion de dependencias mediante factory functions y modulo ensamblador · `caf9e92` Merge remote-tracking branch 'origin/main' · `2359887` refactor(canchas): integrar reserva_cancha al modulo canchas con DI · `438cfee` feat(canchas): implementar patrones Strategy y State · `0705390` docs(api): agregar contrato OpenAPI 3.0 en backend/swagger.json y montar Swagger UI · `67c4747` refactor(auth): aplicar inyeccion de dependencias y · `127ed01` test(canchas,auth): agregar pruebas unitarias, de integracion y concurrencia · `e66d584` fix(ci): corregir ruta de esquema de test y agregar JWT_SECRET al workflow · `b03e5ee` Merge remote-tracking branch 'origin/main' · `65fbdd4` build(docker): agregar Dockerfile para backend/frontend, docker-compose.yml y .env.example

---

### 2026-11-19 · 5 h

**Actividad**
Actualización de la configuración de Docker (`docker-compose.yml`, `frontend/Dockerfile`, `.env.example`) e integración de la rama `feature/usuarios-membresias-pagos`. Colaboración en ajustes de integración sobre Clases Grupales y Accesos (`accesoService.js`, `activityRepository.js`, `inscriptionRepository.js`, `activityService.js`, `ClaseCard.jsx`, `AgendaClasesScreen.jsx`, `ClasesScreen.css`) y actualización de su prueba de integración (`activityIntegration.test.js`). Centralización de todos los archivos `*.test.js` del backend dentro de `backend/test/` y ampliación completa de `backend/swagger.json` documentando todos los módulos de la API.

**Decisión**
Unificar la ubicación de todas las pruebas automatizadas del backend en el directorio `backend/test/` para simplificar la ejecución con `node --test` y el reporte de cobertura con `c8`, y mantener `backend/swagger.json` como fuente única de verdad del contrato REST completo.

**Problema o bloqueo**
Al unificar los módulos de todos los integrantes hacia el cierre, las pruebas estaban dispersas dentro de subcarpetas de `src/modules/` y Swagger solo documentaba cuatro módulos; se reubicaron los tests en `backend/test/` ajustando sus rutas relativas y se incorporaron los endpoints de Accesos, Clases Grupales, Membresías/Planes, Usuarios y Sedes en `swagger.json`.

**Commits**
`ad07b44` build(docker): actualizar docker-compose, Dockerfile de frontend y .env.example · `bfeeda1` Merge remote-tracking branch 'origin/feature/usuarios-membresias-pagos' · `1ae870a` feat(clases,acceso): unificar estilos de agenda, corregir consulta de inscripciones y permitir baja sin reservas activas · `27967f8` test(clases): actualizar prueba de integracion para baja de clases sin inscripciones activas · `72312bc` mover(test): centralizar pruebas del backend en test/ · `ad11a40` docs(swagger): documentar endpoints de clases, socios y membresias