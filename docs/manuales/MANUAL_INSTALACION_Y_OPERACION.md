# FitZone Sports — Manual de instalación y operación

* **Ubicación en el repositorio:** `docs/manuales/Manual-de-Instalacion-y-Operacion.md`

> **Nota sobre comandos:** Los comandos están escritos para Git Bash / Linux / macOS. Donde cambia la sintaxis, se indica la variante para **PowerShell**.

---

## 1. Requisitos previos · Versiones exactas de software

| Componente | Versión / Rango | Fuente en el repositorio |
| :--- | :--- | :--- |
| **Node.js** | `24.x` (usa el `npm` incluido) | `backend/Dockerfile`, `frontend/Dockerfile`, `.github/workflows/ci.yml` |
| **PostgreSQL** | `16` (probado en CI). En producción: **Supabase** (PostgreSQL gestionado) | `ci.yml`, `README.md` |
| **Extensión PostgreSQL** | `pgcrypto` (función `digest()` para el hash de contraseñas) | `authRepository.js`, `users.repository.js` |
| **Docker Engine + Docker Compose v2** | Versión reciente (el `docker-compose.yml` no declara `version`) | `docker-compose.yml` |
| **nginx (imagen del frontend)** | `1.27-alpine` | `frontend/Dockerfile` |
| **Git** | Cualquier versión reciente | — |

### Dependencias del backend (`backend/package.json`, módulos ES, `"type": "module"`)

| Paquete | Rango declarado |
| :--- | :--- |
| `express` | `^5.2.1` |
| `pg` | `^8.23.1` |
| `jsonwebtoken` | `^9.0.3` |
| `helmet` | `^8.3.0` |
| `cors` | `^2.8.6` |
| `dotenv` | `^17.4.2` |
| `swagger-ui-express` | `^5.0.1` |
| `@supabase/supabase-js` | `^2.118.0` |
| `c8` *(desarrollo)* | `^12.0.0` |

### Dependencias del frontend (`frontend/package.json`)

| Paquete | Rango declarado |
| :--- | :--- |
| `react` / `react-dom` | `^19.2.8` |
| `react-router-dom` | `^7.18.3` |
| `axios` | `^1.20.0` |
| `lucide-react` | `^1.74.0` |
| `qrcode.react` | `^4.2.0` |
| `vite` *(desarrollo)* | `^8.2.2` |
| `vitest` *(desarrollo)* | `^5.1.0` |
| `@testing-library/react` *(desarrollo)* | `^16.3.3` |
| `eslint` *(desarrollo)* | `^10.9.0` |

Las versiones exactas instaladas quedan fijadas por `package-lock.json`. Para listarlas:

```bash
cd backend && npm ls --depth=0
cd ../frontend && npm ls --depth=0
```

### Verificar el entorno

```bash
node -v          # debe empezar con v24
docker -v
docker compose version
git --version
```

---

## 2. Puesta en marcha en entorno de desarrollo

### 2.1 Obtener el código

```bash
git clone https://github.com/yairChavezC/Trabajo-Integrador-Caso-FitZone-Sports-.git
cd Trabajo-Integrador-Caso-FitZone-Sports-
```

### 2.2 Preparar la base de datos

Se necesita una base PostgreSQL con el esquema de FitZone. Hay dos caminos:

* **Supabase (el que usa el equipo):** crear el proyecto y copiar la cadena de conexión **Pooler**.
* **PostgreSQL local:** crear una base vacía y habilitar la extensión `pgcrypto`:

```sql
CREATE DATABASE fitzone;
\c fitzone
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

El esquema y los datos iniciales se cargan según la **sección 5**.

### 2.3 Configurar variables de entorno del backend

Crear `backend/.env` (el backend lee el `.env` del directorio desde donde se lo ejecuta):

```env
DATABASE_URL=postgresql://usuario:password@host:5432/fitzone
JWT_SECRET=una_clave_larga_y_aleatoria
NODE_ENV=development
```

> **Nota SSL:** Con una PostgreSQL local sin SSL agregá `?sslmode=disable` al final de `DATABASE_URL` (por ejemplo: `postgresql://usuario:password@localhost:5432/fitzone?sslmode=disable`). El backend activa SSL por defecto; esa opción es la que lo desactiva (es lo que usa el CI). Si usás Supabase, la base por defecto suele llamarse `postgres`.

### 2.4 Levantar el backend

```bash
cd backend
npm ci
npm run dev        # node --watch src/index.js
```

Debe aparecer: `Servidor backend corriendo en http://localhost:3000`.
* **Contrato de la API (Swagger UI):** <http://localhost:3000/api-docs>

### 2.5 Levantar el frontend

En otra terminal:

```bash
cd frontend
npm ci
npm run dev
```

Abrir <http://localhost:5173>. En desarrollo, Vite redirige todo `/api` hacia `http://127.0.0.1:3000` (configurado en `vite.config.js`), por lo que no hace falta definir `VITE_API_URL`.

### 2.6 Verificar

1. En el navegador, <http://localhost:5173> muestra la pantalla de ingreso.
2. Ingresar con un usuario de prueba (ver **sección 5.4**).
3. Un usuario con perfil **Socio** o **Personal** aterriza en **Acceso**; un **Cliente externo** aterriza en **Canchas**.

### 2.7 Pruebas

```bash
cd backend
npm test                 # node --test, sin base de datos
npm run test:coverage    # c8: pruebas + verificación de umbrales por archivo

cd ../frontend
npm test                 # vitest run
npm run build            # compila para producción
npm run lint             # eslint
```

Para ejecutar también la prueba de integración con PostgreSQL de clases grupales, definir una base distinta de la de la aplicación:

```bash
# Git Bash / Linux / macOS
export TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/fitzone_integration_test?sslmode=disable"
npm test
```

```powershell
# PowerShell
$env:TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/fitzone_integration_test?sslmode=disable"
npm test
```

El test se salta solo si `TEST_DATABASE_URL` no está definida y se rehúsa a correr si apunta a la misma base que `DATABASE_URL`. Nunca apuntarla a la base de producción: crea y borra datos.

---

## 3. Puesta en marcha en entorno de producción

La estrategia adoptada es contenedores con **Docker Compose** (backend Node + frontend estático servido por nginx) contra una base gestionada en **Supabase**.

### 3.1 Preparar la configuración

```bash
# Git Bash / Linux / macOS
cp .env.example .env
```

```powershell
# PowerShell
Copy-Item .env.example .env
```

Editar `.env` en la raíz del repositorio:

```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://usuario:password@aws-0-region.pooler.supabase.com:5432/postgres
JWT_SECRET=<clave aleatoria de al menos 32 caracteres>
VITE_API_URL=http://<host-del-servidor>:3000/api/
```

Generar una clave segura:

```bash
openssl rand -hex 32
```

> `.env` está fuera del control de versiones. No lo subas al repositorio: solo se versiona `.env.example`.

### 3.2 Construir y levantar

```bash
docker compose up --build -d
docker compose ps
```

| Servicio | Contenedor | URL |
| :--- | :--- | :--- |
| **Frontend (nginx)** | `fitzone-frontend` | <http://localhost:5173> |
| **Backend (Express)** | `fitzone-backend` | <http://localhost:3000> |
| **Swagger UI** | — | <http://localhost:3000/api-docs> |

La base de datos no está en el compose: se usa la de Supabase. Los servicios tienen `restart: unless-stopped`, por lo que se reinician solos tras una caída o un reinicio del servidor.

### 3.3 Puntos a tener en cuenta

* **`VITE_API_URL` en tiempo de compilación:** se incrusta en el bundle al compilar. Si cambia la URL pública de la API hay que reconstruir la imagen del frontend (`docker compose build frontend`). Cambiar el `.env` y reiniciar no alcanza.
* **CORS:** el backend solo acepta pedidos de `CLIENT_URL` y de `http://localhost:5173`, `http://127.0.0.1:5173` y `http://localhost:3000`. Si el frontend se publica bajo otro dominio, hay que pasar `CLIENT_URL` al contenedor del backend. El `docker-compose.yml` actual no reenvía esa variable: agregar `CLIENT_URL: ${CLIENT_URL}` en `environment` del servicio `backend`.
* **Puerto del backend:** `src/index.js` escucha en el puerto `3000` fijo; la variable `PORT` solo afecta el mapeo externo del compose.
* **Errores en producción:** con `NODE_ENV=production`, los errores `500` devuelven un mensaje genérico (sin detalles internos).

---

## 4. Variables de entorno: tabla completa

| Variable | Ámbito | Obligatoria | Valor por defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Backend | Sí | — | Cadena de conexión PostgreSQL. Con Supabase, usar el Pooler. Para base local sin SSL, agregar `?sslmode=disable`. |
| `JWT_SECRET` | Backend | Sí | — | Clave de firma de los tokens. Si falta, el backend no arranca (*Falta la configuración JWT_SECRET*). |
| `NODE_ENV` | Backend | No | `production` en compose | `development` incluye el stack trace en las respuestas de error; cualquier otro valor lo oculta. |
| `PORT` | Compose | No | `3000` | Puerto publicado en el host. El proceso interno usa `3000` fijo. |
| `CLIENT_URL` | Backend | No | `http://localhost:5173` | Origen permitido por CORS. |
| `WAITLIST_OFFER_MINUTES` | Backend | No | `15` | Duración en minutos de la oferta de lugar a la lista de espera. Entero > 0. |
| `WAITLIST_OFFER_CHECK_INTERVAL_MS` | Backend | No | `60000` | Cada cuánto (en ms) el proceso en segundo plano revisa ofertas vencidas. Entero > 0. |
| `TEST_DATABASE_URL` | Pruebas | No | — | Base exclusiva para las pruebas de integración. Debe ser distinta de `DATABASE_URL`. |
| `VITE_API_URL` | Frontend (build) | No | `http://localhost:3000/api/` (Docker) · `/api/` (desarrollo) | URL base de la API. Se fija al compilar. |

Las dos variables `WAITLIST_*` están documentadas en `backend/.env.example`; el resto, en el `.env.example` de la raíz.

---

## 5. Base de datos: migraciones, reversión y datos semilla

### 5.1 Qué hay en el repositorio

| Archivo | Contenido |
| :--- | :--- |
| `backend/migrations/000_create_clases_grupales.sql` | Tablas `clase_grupal` e `inscripciones_clase_grupal`, con restricciones `CHECK` e índices. |
| `backend/migrations/001_create_usuario_sede.sql` | Tabla `usuario_sede` (asigna una sede a cada recepcionista). |
| `backend/migrations/002_create_class_notifications.sql` | Tabla `notificaciones_clase_grupal` e índices, incluido el índice único parcial `uq_inscripciones_clase_usuario_activa` que impide dos inscripciones activas del mismo socio en una clase. |
| `backend/test/activities-test-schema.sql` | Esquema mínimo (`rol`, `sede`, `plan`, `usuario`, `suscripcion`) solo para bases de prueba/CI. **No ejecutar en producción.** |

Las migraciones son idempotentes (`IF NOT EXISTS`): pueden ejecutarse más de una vez sin error. Se aplican en orden numérico.

> **Importante:** Las migraciones cubren solo el módulo de clases grupales. El esquema base (usuarios, roles, sedes, planes, suscripciones, control de acceso, canchas, reservas y pagos) fue creado directamente en Supabase y no está versionado como script. Ver **sección 5.5**.

### 5.2 Aplicar las migraciones

Con `psql`, en orden:

```bash
for f in backend/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

El pipeline de CI las aplica con `node apply_migrations.mjs` (ejecutado desde `backend/` con `DATABASE_URL` definida), después de cargar `activities-test-schema.sql` en las bases de prueba.

Las migraciones requieren que ya existan las tablas `sede` y `usuario`.

### 5.3 Reversión

No hay scripts de reversión automáticos. Para deshacer las tres migraciones (en orden inverso por las claves foráneas) perdiendo los datos de esas tablas:

```sql
BEGIN;
DROP TABLE IF EXISTS public.notificaciones_clase_grupal;
DROP TABLE IF EXISTS public.usuario_sede;
DROP TABLE IF EXISTS public.inscripciones_clase_grupal;
DROP TABLE IF EXISTS public.clase_grupal;
COMMIT;
```

Antes de cualquier reversión en producción, hacer un respaldo (**sección 7**).

### 5.4 Datos semilla

El repositorio todavía no incluye un script de datos semilla. Hasta que se agregue, esta es la carga mínima para operar y probar. Es un script propuesto: probarlo primero en una base de pruebas y ajustar nombres de columnas si el esquema real difiere.

**Roles** (los IDs deben coincidir con los que usa la aplicación):

| `id` | Perfil |
| :---: | :--- |
| `1` | Personal de sede (recepcionista / administrador) |
| `2` | Cliente externo |
| `3` | Socio |
| `4` | Gerente |

**Usuarios de prueba:** La contraseña se guarda como SHA-256 en hexadecimal, así que hay que insertarla con `digest()`:

```sql
INSERT INTO public.usuario (dni, nombre, contacto, password, id_rol, activo) VALUES
  ('10000001', 'Recepcion Demo',       'recepcion@fitzone.com', encode(digest('Demo1234','sha256'),'hex'), 1, true),
  ('10000002', 'Cliente Externo Demo', 'externo@fitzone.com',   encode(digest('Demo1234','sha256'),'hex'), 2, true),
  ('10000003', 'Socio Demo',           'socio@fitzone.com',     encode(digest('Demo1234','sha256'),'hex'), 3, true),
  ('10000004', 'Gerente Demo',         'gerente@fitzone.com',   encode(digest('Demo1234','sha256'),'hex'), 4, true);
```

**Credenciales para el README** *(ajustar a las reales del equipo)*:

| Rol | Usuario (DNI) | Contraseña |
| :--- | :--- | :--- |
| Recepcionista / Administrador | `[COMPLETAR]` | `[COMPLETAR]` |
| Cliente externo | `[COMPLETAR]` | `[COMPLETAR]` |
| Socio | `[COMPLETAR]` | `[COMPLETAR]` |
| Gerente | `[COMPLETAR]` | `[COMPLETAR]` |

**Sedes** *(los lineamientos piden al menos 25)*. Ejemplo con `generate_series`:

```sql
INSERT INTO public.sede (nombre, provincia, ciudad, cupo, activa)
SELECT 'FitZone Sede ' || n, 'Entre Ríos', 'Ciudad ' || n, 120, true
FROM generate_series(1, 25) AS n;
```

Además hay que cargar, por cada sede: canchas (`cancha`), su configuración horaria (`horarios_cancha_config`), clases (`clase_grupal`) y planes (`plan`). Un socio necesita una suscripción vigente para ingresar; un recepcionista, una fila en `usuario_sede` para gestionar clases.

### 5.5 Esquema base creado en Supabase (inferido del código)

Como el esquema base no está versionado, esta tabla resume lo que el código espera. Sirve como guía para reconstruirlo; contrastar con el esquema real de Supabase.

| Tabla | Columnas que usa la aplicación |
| :--- | :--- |
| `rol` | `id`, `tipousuario` |
| `usuario` | `id`, `dni` *(único)*, `nombre`, `contacto`, `foto`, `password`, `id_rol`, `activo`, `creado_at` |
| `sede` | `id`, `nombre`, `provincia`, `ciudad`, `cupo`, `activa` |
| `plan` | `id`, `nombre`, `precio`, `intervalo`, `duracion_dias`, `activo` |
| `suscripcion` | `id`, `id_usuario` *(único, requerido por el `ON CONFLICT (id_usuario)` de la renovación)*, `id_plan`, `estado`, `fecha_inicio`, `fecha_proximo_vencimiento`, `fecha_fin`, `descuento` |
| `control_acceso` | `id`, `id_sede`, `id_usuario`, `fecha_entrada`, `fecha_salida` |
| `cancha` | `id`, `nombre`, `tipo`, `precio_base`, `id_sede`, `estado` |
| `horarios_cancha_config` | `id_cancha`, `dia_semana`, `hora_apertura`, `hora_cierre`, `duracion_slot`, `inicio_hora_pico`, `fin_hora_pico`, `precio_hora_pico` |
| `reserva_cancha` | `id`, `id_cancha`, `id_usuario`, `fecha_inicio`, `fecha_fin`, `monto_total`, `estado` |
| `pagos` | `id`, `id_usuario`, `id_reserva_cancha`, `id_suscripcion`, `monto`, `moneda`, `medio_pago`, `transaccion_externa_id`, `estado`, `idempotency_key`, `motivo_rechazo`, `fecha_pago`, `creado_at` |

La unicidad de `idempotency_key` y la restricción que impide solapar reservas de una misma cancha (`RN-02`) deben estar declaradas en la base. El código las espera (captura los errores `23505` y `23P01`), pero ningún script del repositorio las crea. Verificarlas en Supabase y versionar su definición.

---

## 6. Despliegue: estrategia adoptada y procedimiento de reversión

### 6.1 Estrategia

* **Contenerización:** un `Dockerfile` por componente:
  * **Backend:** `node:24-alpine`, instala con `npm ci --omit=dev`, copia `src/` y `swagger.json` y ejecuta `node src/index.js`.
  * **Frontend:** build en dos etapas. Compila con Vite en `node:24-alpine` y publica `dist/` con `nginx:1.27-alpine` en el puerto `5173`.
* **Orquestación:** `docker-compose.yml` con los dos servicios, reinicio automático y el frontend dependiendo del backend.
* **Base de datos:** externa y gestionada (Supabase). Las imágenes no contienen datos.
* **Integración continua:** GitHub Actions (`.github/workflows/ci.yml`), disparada en cada `push` y `pull request` hacia `main`:
  1. Levanta un PostgreSQL 16 efímero.
  2. Instala el backend con `npm ci`.
  3. Crea dos bases aisladas (aplicación e integración), les carga el esquema de prueba y aplica las migraciones.
  4. Ejecuta `npm run test:coverage` (pruebas + umbrales de cobertura).
  5. Instala el frontend, corre `npm test` y `npm run build`.

El pipeline verifica el código; el despliegue en el servidor lo hace una persona con `docker compose` (no hay paso de despliegue automático). Para que el pipeline bloquee el merge, activar la protección de la rama `main` en GitHub (**Settings → Branches → Require status checks**).

### 6.2 Procedimiento de despliegue de una versión

```bash
git fetch --tags
git checkout v1.0-entrega          # el tag que se quiere desplegar
docker compose up --build -d
docker compose ps
curl -i http://localhost:3000/api-docs/    # debe responder 200
```

### 6.3 Reversión

Como todo cambio queda etiquetado, volver atrás es desplegar el tag anterior:

```bash
git checkout <tag-anterior>
docker compose up --build -d
```

Si la versión nueva incluyó migraciones de base de datos, la reversión del código no deshace el esquema. En ese caso:

1. Restaurar el respaldo tomado antes del despliegue (**sección 7**), o
2. Aplicar manualmente el script inverso (**sección 5.3**).

Por eso, ante un cambio de esquema, respaldar siempre antes de desplegar.

---

## 7. Respaldo y restauración

> **Estado actual:** El equipo no realiza respaldos programados. Esta sección documenta el procedimiento recomendado y debe implementarse antes de operar con datos reales.

### 7.1 Respaldo manual

Usar la conexión directa o en modo sesión de Supabase (el pooler en modo transacción puede no ser compatible con `pg_dump`):

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --file=fitzone_$(date +%Y%m%d_%H%M).dump
```

Guardar el archivo fuera del servidor y fuera del repositorio. Supabase también ofrece respaldos propios desde el panel del proyecto; su disponibilidad y retención dependen del plan contratado.

### 7.2 Restauración

Sobre una base vacía (nunca sobre la de producción sin antes respaldarla):

```bash
pg_restore --no-owner --clean --if-exists -d "$DATABASE_URL" fitzone_YYYYMMDD_HHMM.dump
```

Para un respaldo en texto plano:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f respaldo.sql
```

### 7.3 Recomendación

Respaldo diario automático, retención de al menos 7 días y una prueba de restauración mensual en una base descartable.

---

## 8. Operación degradada: caída de la conexión principal y resincronización

El control de acceso de la sede sigue operando aunque se corte la conexión con el servidor central (`RNF-01`). La lógica vive en el navegador de la terminal de recepción.

### 8.1 Cómo funciona

1. **Réplica local:** Cada vez que el panel consulta el estado de la sede con conexión, el navegador descarga y guarda una copia de los socios activos (con estado de membresía, si están adentro y en qué sede) y del catálogo de sedes.
2. **Detección de caída:** Si el pedido de escaneo falla por red (*Network Error*, sin conexión o sin respuesta del servidor), la terminal valida el QR localmente.
3. **Validación local:** Se aplican las mismas reglas que en el servidor: formato y vigencia del QR (`65 s` de vigencia, `-10 s` de tolerancia de reloj), membresía activa, no estar adentro de otra sede (`RN-01`) y cupo de la sede.
4. **Cola diferida:** Cada ingreso o salida local se guarda en una cola ordenada y se muestra con el aviso `(Modo Offline)`.
5. **Resincronización:** Al volver la conexión, en el siguiente escaneo o al recargar el panel, la cola se envía al servidor (`POST /api/accesses/sincronizar-offline`). El servidor procesa los eventos en orden cronológico y descarta los ingresos de un socio que ya figura adentro (idempotencia). Un cerrojo evita sincronizaciones simultáneas. La cola se borra solo cuando el servidor responde con éxito.

### 8.2 Datos guardados en el navegador (`localStorage`)

| Clave | Contenido |
| :--- | :--- |
| `fitzone_padron_offline` | Copia local de socios |
| `fitzone_sedes_offline` | Catálogo de sedes y cupos |
| `fitzone_estado_sede_<id>` | Último aforo y movimientos de la sede |
| `fitzone_cola_accesos_offline` | Eventos pendientes de sincronizar |

### 8.3 Cómo probarlo

1. Abrir el panel de recepción con conexión y hacer un escaneo (se descarga la réplica).
2. Detener el backend:
   ```bash
   docker compose stop backend
   ```
3. Escanear un QR vigente: debe aceptarse con el aviso `(Modo Offline)`.
4. Reiniciar el backend:
   ```bash
   docker compose start backend
   ```
5. Recargar el panel: el aforo debe reflejar los ingresos que se hicieron sin conexión.

### 8.4 Limitaciones

* La terminal debe haber cargado el panel con conexión al menos una vez.
* Un alta o renovación hecha después de la última descarga de la réplica no figura offline.
* La réplica depende del navegador: borrar los datos del sitio con eventos pendientes los pierde.
* Los eventos aceptados offline que el servidor rechace al sincronizar (por ejemplo, un socio que quedó adentro en otra sede) se cuentan como no procesados.

---

## 9. Alta de una sede nueva sin detener el sistema

La aplicación no tiene una pantalla para crear sedes. Se hace con SQL sobre la base en funcionamiento. No requiere reiniciar el backend ni el frontend: la lista de sedes se consulta en cada carga de la aplicación, de modo que la sede nueva aparece en el selector la próxima vez que un usuario recarga la página (`RNF-04`).

```sql
BEGIN;

-- 1. La sede (solo se listan las que tienen activa = true)
INSERT INTO public.sede (nombre, provincia, ciudad, cupo, activa)
VALUES ('FitZone Concordia', 'Entre Ríos', 'Concordia', 120, true)
RETURNING id;

-- 2. Una cancha de la sede (usar el id devuelto arriba)
INSERT INTO public.cancha (nombre, tipo, precio_base, id_sede, estado)
VALUES ('Cancha Pádel 1', 'Pádel - Césped sintético', 18000, <id_sede>, 'disponible')
RETURNING id;

-- 3. Su horario por día de la semana (0 = domingo ... 6 = sábado), con horario pico
INSERT INTO public.horarios_cancha_config
  (id_cancha, dia_semana, hora_apertura, hora_cierre, duracion_slot,
   inicio_hora_pico, fin_hora_pico, precio_hora_pico)
SELECT <id_cancha>, d, '09:00', '23:00', 60, '19:00', '21:00', 22000
FROM generate_series(0, 6) AS d;

-- 4. Asignar un recepcionista a la sede
INSERT INTO public.usuario_sede (id_usuario, id_sede) VALUES (<id_usuario>, <id_sede>);

COMMIT;
```

**Notas:**

* `usuario_sede` admite una sola sede por usuario (la clave primaria es `id_usuario`).
* El tipo de cancha se usa como filtro por deporte: lo que está antes del guion se toma como el deporte (`Pádel`).
* El cupo de la sede es el aforo máximo que usa el control de acceso.
* Ajustar los nombres de columnas a las del esquema real (ver **sección 5.5**).

---

## 10. Monitoreo: registros, métricas y verificación de estado

### 10.1 Registros (logs)

El backend escribe en la salida estándar. Con Docker:

```bash
docker compose logs -f backend
docker compose logs --since 1h backend
```

**Qué buscar:**

| Prefijo / mensaje | Significado |
| :--- | :--- |
| `[ERROR] <MÉTODO> <ruta>:` | Error no controlado en un pedido (middleware central de errores) |
| `Error en ...` | Errores capturados en los controladores y repositorios |
| `[Observer/ListaEspera]` | Oferta de lugar enviada a un socio de la lista de espera |
| `[AUDITORÍA MEMBRESÍA]` | Renovación de membresía registrada |
| `[NOTIFICACIÓN]` | Aviso de membresía activa generado |
| `Error procesando vencimientos de lista de espera` | Falló el proceso periódico de ofertas vencidas |

### 10.2 Verificación de estado

No hay un endpoint `/health`. Se verifica con:

```bash
# 1. El servicio responde (Swagger UI público)
curl -i http://localhost:3000/api-docs/

# 2. La base de datos y el login funcionan
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nombre_usuario":"<dni>","contrasenia":"<clave>"}'
```

Un `200` con un token confirma que el backend, la conexión a la base y la clave de firma funcionan. Cualquier otra ruta de `/api` responde `401` sin token; es lo esperado.

```bash
docker compose ps          # estado de los contenedores
docker stats --no-stream   # uso de CPU y memoria
```

### 10.3 Métricas

No hay un sistema de métricas instalado. Se recomienda monitorear de forma externa: disponibilidad del `/api-docs`, reinicios de contenedores (`docker compose ps`) y consumo de la base desde el panel de Supabase.

### 10.4 Proceso en segundo plano

Al iniciar, el backend arranca un proceso que cada `WAITLIST_OFFER_CHECK_INTERVAL_MS` (`60 s`) vence las ofertas de lista de espera caducadas y ofrece el lugar al siguiente. Si se reinicia el backend, se retoma solo.

---

## 11. Resolución de problemas de instalación

| Síntoma | Causa probable | Solución |
| :--- | :--- | :--- |
| El backend no arranca: `Falta la configuración JWT_SECRET` | `JWT_SECRET` no definida | Definirla en `backend/.env` (desarrollo) o en el `.env` raíz (Docker). |
| `Falta la variable DATABASE_URL en el archivo .env` | No hay `.env` o se ejecutó desde otra carpeta | Crear `backend/.env` y ejecutar `npm run dev` desde `backend/`. |
| `ERR_MODULE_NOT_FOUND` / `require is not defined` | Código en CommonJS dentro de un proyecto ES Modules | Usar `import` / `export` (el backend declara `"type": "module"`). |
| Error de conexión SSL a la base | Conexión directa en lugar del pooler, o base local sin SSL | Con Supabase usar la URL del Pooler. En local agregar `?sslmode=disable`. |
| `function digest(...) does not exist` | Falta la extensión `pgcrypto` | Ejecutar `CREATE EXTENSION IF NOT EXISTS pgcrypto;`. |
| Login siempre responde *"Usuario o contraseña incorrectos"* | La contraseña no se guardó como SHA-256 hexadecimal, o el usuario está inactivo | Insertarla con `encode(digest('clave','sha256'),'hex')` y verificar `activo = true`. |
| El frontend muestra *"Bloqueado por la política de CORS"* / errores de red en el navegador | Origen del frontend no permitido | Definir `CLIENT_URL` en el backend (y reenviarla desde `docker-compose.yml`). |
| El frontend en Docker llama a una URL equivocada | `VITE_API_URL` se fijó al compilar | Corregir `.env` y ejecutar `docker compose build frontend`. |
| El panel vuelve al login cada tanto | El token vence a los 30 minutos | Es el comportamiento esperado: volver a ingresar. |
| Pantalla en blanco en el frontend | Error de importación (por ejemplo, diferencia de mayúsculas en nombres de archivo, que falla en Linux pero no en Windows) | `cd frontend && npm run build` indica el archivo y la línea. |
| Pagos o renovaciones fallan con error de conexión a la base | El módulo de pagos usa su propio pool (`src/db.js`) sin la opción SSL del resto | Verificar que `DATABASE_URL` sea válida para ambos; con base local usar `?sslmode=disable`. |
| Un pago responde `400` *"Medio de pago o pasarela no soportada"* | Método no registrado en la fábrica de pasarelas | Usar `MERCADOPAGO`, `MODO` o `TARJETA`. |
| Los tests de integración se saltan | `TEST_DATABASE_URL` sin definir | Definirla (base distinta de la de la aplicación). |
| `npm run test:coverage` falla | Algún archivo cayó bajo los umbrales (líneas 15%, ramas 10% por archivo) o hay un test en rojo | Revisar el reporte de `c8` y la salida de `npm test`. |
| `docker compose up` falla con puerto ocupado | `3000` o `5173` en uso | Liberar el puerto o cambiar el mapeo en `docker-compose.yml`. |
| Un recepcionista recibe *"Tu perfil no tiene una sede asignada"* | Falta la fila en `usuario_sede` | Insertarla (**sección 9**, paso 4). |

---

## Apéndice — Verificación rápida de una instalación

- [ ] `node -v` muestra la versión `24`.
- [ ] La base tiene la extensión `pgcrypto`, el esquema base y las tres migraciones.
- [ ] Hay roles `1` a `4`, al menos una sede y un usuario de cada perfil.
- [ ] `docker compose ps` muestra `fitzone-backend` y `fitzone-frontend` en ejecución.
- [ ] <http://localhost:3000/api-docs> abre el Swagger UI.
- [ ] El login devuelve un token.
- [ ] `npm run test:coverage` (backend) y `npm test` (frontend) terminan en verde.
- [ ] No hay archivos `.env` en `git status`.