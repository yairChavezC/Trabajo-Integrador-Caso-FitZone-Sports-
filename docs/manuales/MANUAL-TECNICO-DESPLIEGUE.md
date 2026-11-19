# Manual Tecnico y de Despliegue - FitZone Sports

## 1. Arquitectura
- **Backend:** Node.js + Express modular (ccesses, ctivities, uth, canchas, memberships, payments, eservations, sedes, users, core/orchestrator/pagoCanchaOrchestrator.js) con PostgreSQL/Supabase.
- **Frontend:** SPA en React + Vite (core, shared, modules).

## 2. Variables de entorno
Configurar conexion a PostgreSQL/Supabase, secreto JWT y credenciales de pasarela de pago sin subir secretos al repositorio.

## 3. Ejecucion y Docker
- Desarrollo: iniciar backend en ackend/ y frontend en rontend/.
- Docker Compose desde la raiz: docker compose up -d --build, docker compose ps y docker compose down.

## 4. Pruebas y cobertura
Ejecutar 
pm test en ackend/ y revisar cobertura con c8 (umbral minimo 70%) y documentacion OpenAPI/Swagger.

## 5. Rollback
Detener contenedores (docker compose down), volver al tag o commit estable (git checkout <tag-o-commit-estable>), levantar nuevamente (docker compose up -d --build) y verificar flujos criticos y base de datos.
