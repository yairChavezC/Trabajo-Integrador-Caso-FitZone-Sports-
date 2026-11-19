# FitZone Sports

## 1. Qué es el sistema

FitZone Sports es una plataforma web integral para administrar gimnasios y centros deportivos en múltiples sedes desde un mismo lugar. Permite gestionar socios, planes y membresías, controlar el ingreso y egreso en puerta con código QR (incluyendo operación ante cortes de conexión), reservar clases grupales con lista de espera y alquilar canchas con precios dinámicos y control de turnos simultáneos. También centraliza el cobro con pasarelas de pago y la emisión de comprobantes en PDF para socios, clientes externos, recepción y gerencia.

## 2. Integrantes del equipo

| Integrante | Rol | Usuario de Git | Módulo / Responsabilidad |
| :--- | :--- | :--- | :--- |
| Chavez Coradini, Yair Nahuel | P1–P4 | `yairChavezC` | M4: Canchas Deportivas |
| Iachini, Lucas Javier | P1–P4 | `Iachini2609` | M2: Gimnasio y Control de Acceso |
| Romero, Ludmila | P1–P4 | `LudmilaRomero` | M1: Usuarios y Membresías |
| Acosta, Marcela | P1–P4 | `MarAcosta1523` | M3: Clases Grupales |
| Ríos, Epifanía Elizabeth | P1–P4 | `epifaniaerios` | M5: Pagos y Facturación |

## 3. Puesta en marcha

1. Cloná el repositorio e ingresá al directorio raíz (donde se encuentra `docker-compose.yml`):
   ```bash
   git clone https://github.com/yairChavezC/Trabajo-Integrador-Caso-FitZone-Sports-.git && cd Trabajo-Integrador-Caso-FitZone-Sports-
   ```

2. Copiá las plantillas de variables de entorno y completá las credenciales de conexión a la base de datos en Supabase y el secreto JWT:
   ```bash
   cp .env.example .env && cp backend/.env.example backend/.env && cp frontend/.env.example frontend/.env
   ```

3. Construí y levantá los servicios de backend y frontend con Docker Compose:
   ```bash
   docker compose up -d --build
   ```

4. Verificá que ambos contenedores estén activos y saludables:
   ```bash
   docker compose ps
   ```

5. Abrí la aplicación en el navegador (puerto configurado en `docker-compose.yml` / `frontend/nginx.conf`, por defecto `http://localhost:80` o `http://localhost:5173`) e iniciá sesión con cualquiera de los usuarios de prueba.

## 4. Credenciales de usuarios de prueba

> La base de datos en Supabase ya se encuentra poblada con los datos iniciales del sistema. Para iniciar sesión en la aplicación se utiliza el **DNI** como identificador de usuario junto con la **contraseña** (`1q2w3e4r` para todos los perfiles):

| Rol (`tipo` / `id_rol`) | Nombre | DNI (Usuario de acceso) | Correo | Contraseña |
| :--- | :--- | :--- | :--- | :--- |
| **Recepcionista** (`1`) | Sergio Romero | `32901458` | `sromero@fitzone.com` | `1q2w3e4r` |
| **Cliente Externo** (`2`) | Edinson Cavani | `94182045` | `ecavani@fitzone.com` | `1q2w3e4r` |
| **Socio** (`3`) | Luis Advíncula | `95348210` | `ladvincula@fitzone.com` | `1q2w3e4r` |
| **Gerente** (`4`) | Kevin Zenón | `43719854` | `kzenon@fitzone.com` | `1q2w3e4r` |

## 5. Enlaces a documentación del proyecto

| Categoría | Ruta en el repositorio | Contenido |
| :--- | :--- | :--- |
| **ADR** | [`docs/adr/`](docs/adr/) (`ADR-001.md` a `ADR-010.md`) | Registros de decisión arquitectónica y diseño del sistema |
| **Diagramas** | [`docs/diagramas/`](docs/diagramas/) | Diagramas de arquitectura, modelo de datos y flujos |
| **Manuales** | [`MANUAL-USUARIO.md`](docs/manuales/MANUAL-USUARIO.md) y [`MANUAL-TECNICO-DESPLIEGUE.md`](docs/manuales/MANUAL-TECNICO-DESPLIEGUE.md) | Manual de usuario y manual técnico y de despliegue |
| **Bitácoras** | [`docs/bitacoras/`](docs/bitacoras/) (`LOG-chavez.md`, `LOG-erios.md`, etc.) | Bitácoras individuales por integrante con trazabilidad a commits |

## 6. Estado de pruebas y cobertura

* **Suite de pruebas (`node --test`):** **147 tests** en total — **145 aprobados**, **0 fallidos** y **2 omitidos** (pruebas de concurrencia e integración PostgreSQL condicionadas a `TEST_DATABASE_URL`).
* **Cobertura (`c8`):** **79.62%** de cobertura total de líneas (`All files`), **79.62%** en sentencias (`% Stmts`), **77.19%** en ramas (`% Branch`) y **74.59%** en funciones (`% Funcs`).