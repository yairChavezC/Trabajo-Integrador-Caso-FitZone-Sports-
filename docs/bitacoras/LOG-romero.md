# Bitácora — Romero, Ludmila — Rol P2 (Backend Developer)

## Sprint 1 — Unidad I — Semana del 2026-09-01

### 2026-09-01 · 2 h

**Actividad**
Armé el esqueleto inicial del proyecto frontend con React y Vite, y definí la estructura de carpetas del módulo en `core/`, `shared/` y `modules/`, documentada luego en ADR-004.

**Decisión**
Organizar `modules/` como un espejo de los módulos del backend (M1 a M5), para que cada integrante trabaje en su propia carpeta sin pisarse.

**Problema o bloqueo**
Ninguno relevante en esta sesión.

**Commits**
`5bb9795` feat: add initial frontend setup with React and Vite

---

### 2026-09-03 · 1.5 h

**Actividad**
Agregué los primeros archivos (services, hooks, components y pages) del módulo de Socios en el frontend.

**Decisión**
Separar cada capa del módulo en su propia carpeta (hooks, components, services, pages), siguiendo la estructura ya definida.

**Problema o bloqueo**
Tuve un conflicto de Git al mezclar mi copia local con el repositorio remoto (push rechazado por rama desactualizada); lo resolví con `pull` antes de `push` y revisando el log para no perder cambios de compañeros.

**Commits**
`cdf26f8` Agrega services, hooks, components y pages del módulo socios
`fbcb946` Merge branch 'main' of https://github.com/yairChavezC/Trabajo-Integrador-Caso-FitZone-Sports-

---

## Sprint 3 — Unidad II — Semana del 2026-09-28

### 2026-09-28 · 3 h

**Actividad**
Implementé el primer módulo backend de Usuarios (M1): rutas, controladores, servicios y repositorio, con conexión a PostgreSQL vía `pg`.

**Decisión**
Usar SQL directo en vez de un ORM, siguiendo el mismo patrón que el resto del backend del equipo.

**Problema o bloqueo**
Ninguno grave; fue la primera versión del módulo.

**Commits**
`2616d84` feat(users): agregar módulo de usuarios con rutas, controladores y servicios
`bf88ad2` feat(users): agregar repositorio de usuarios con funciones para obtener y crear usuarios

---

### 2026-10-08 · 2 h

**Actividad**
Reintegré el módulo de usuarios después de que el resto del equipo migrara el backend de CommonJS a ES Modules mientras yo no estaba trabajando en el repo.

**Decisión**
Migrar los cuatro archivos del módulo (`repository`, `service`, `controller`, `routes`) de `require`/`module.exports` a `import`/`export`, y conectarlos al `appRouter.js` central del equipo.

**Problema o bloqueo**
El servidor no arrancaba por un `ERR_MODULE_NOT_FOUND`, porque mi código seguía en el formato viejo. También tuve que resolver un error de conexión SSL a Supabase, cambiando la `DATABASE_URL` a la del *connection pooler*.

**Commits**
`c2ae864` Modulo 1: usuarios en backend y pantalla de socios en frontend

---

## Sprint 4 — Unidad II — Semana del 2026-10-13

### 2026-10-13 · 2 h

**Actividad**
Desarrollé el formulario de alta de socios (modal "Nuevo socio") en el frontend, conectado al backend.

**Decisión**
Agregar una capa de DTO (`users.dto.js`) para separar la validación de entrada de la lógica de negocio, y hashear la contraseña con SHA-256 antes de guardarla, igual que el login.

**Problema o bloqueo**
Un socio creado sin hashear la contraseña no podía loguearse después. Lo detecté probando el login con el usuario recién creado y corregí el `repository.create`.

**Commits**
`852f5c6` Formulario de nuevo socio: alta con contraseña hasheada, DTO y validaciones

---

### 2026-10-15 · 2.5 h

**Actividad**
Agregué la vista de detalle de un socio y conecté cada fila del listado para que lleve a ese detalle.

**Decisión**
Mostrar en el detalle los datos personales y el estado de membresía, reutilizando el mismo DTO de respuesta que el listado.

**Problema o bloqueo**
Ninguno grave.

**Commits**
