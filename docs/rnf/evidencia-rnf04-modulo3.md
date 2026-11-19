# Evidencia RNF-04 — Alta de sede nueva sin recompilar

## Requisito

RNF-04: El sistema debe permitir dar de alta una sede nueva sin detener el sistema ni recompilar.

## Evidencia — Módulo M3 Clases Grupales

### 1. Modelo de datos dinámico

La tabla `sede` es independiente del código. Las clases grupales referencian `id_sede` como FK dinámica:

```sql
CREATE TABLE public.clase_grupal (
  id BIGSERIAL PRIMARY KEY,
  id_sede BIGINT NOT NULL REFERENCES public.sede(id) ON DELETE RESTRICT,
  ...
);
```

No hay IDs de sede hardcodeados en el código. Cada clase consulta la sede a la que pertenece en tiempo de ejecución.

### 2. Seed demuestra 25 sedes funcionando

`backend/seed.sql` crea 25 sedes y una clase en cada una:

```sql
INSERT INTO public.sede (id, nombre, ...) VALUES
  (1, 'Sede Central', ...),
  (2, 'Sede Norte', ...),
  ...
  (25, 'Sede Morón', ...)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clase_grupal (id, id_sede, ...)
SELECT 100 + s.id, s.id, ...
FROM public.sede s
WHERE s.id > 1;
```

### 3. Consulta dinámica por sede

El repositorio `activityRepository.findAllActivities` filtra por `idSede` en tiempo de consulta:

```sql
SELECT c.*, s.nombre AS sede
FROM public.clase_grupal c
INNER JOIN public.sede s ON s.id = c.id_sede
WHERE ($1::bigint IS NULL OR c.id_sede = $1)
  AND ...
```

Si se agrega una sede nueva con `INSERT INTO sede`, las clases de esa sede aparecen automáticamente en la agenda sin recompilar.

### 4. Control de acceso por sede

El middleware `createRequireAgendaManager` verifica que el recepcionista solo acceda a su `idSede` asignada:

```js
const sedeAsignada = await getAssignedSiteForUser(req.usuario.id);
if (Number(idSede) !== Number(sedeAsignada)) {
  return res.status(403).json({ message: 'Solo podés gestionar tu sede asignada.' });
}
```

Esto funciona para cualquier sede nueva sin cambios en el código.

### 5. Verificación

```sql
-- Agregar una sede nueva
INSERT INTO public.sede (nombre, provincia, ciudad, cupo, activa)
VALUES ('Sede Nueva Test', 'Buenos Aires', 'La Plata', 30, TRUE)
RETURNING id;

-- Crear una clase en la sede nueva
INSERT INTO public.clase_grupal (id_sede, nombre, profesor, cupo, fecha_inicio, fecha_fin)
VALUES (<id_sede_nueva>, 'Clase Test', 'Prof Test', 20, NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 1 hour');

-- La clase aparece automáticamente en GET /clases?idSede=<id_sede_nueva>
-- Sin recompilar, sin reiniciar el servidor.
```

**Conclusión:** RNF-04 se cumple. El alta de una sede nueva es una operación de datos (INSERT en `sede`) que no requiere recompilación ni reinicio del sistema.