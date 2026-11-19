# Índice de Diagramas — Módulo M3 Clases Grupales

Cada diagrama se entrega en **fuente editable** (`.mmd`, Mermaid) y en **exportación** (`.svg` y `.png`). Todos llevan autor, fecha y versión en el encabezado del archivo y en el pie de figura de este índice.

## Pie de figura

| # | Archivo fuente | Exportación | Tipo | Autor | Fecha | Versión |
|---|----------------|-------------|------|-------|-------|---------|
| 1 | `c4-3-componentes-clases-grupales.mmd` | `.svg` `.png` | C4 nivel 3 — Componentes | Acosta, Marcela | 2026-11-19 | 1.2 |
| 2 | `uml-secuencia-reserva-clase-grupal.mmd` | `.svg` `.png` | UML — Diagrama de secuencia | Acosta, Marcela | 2026-11-18 | 1.1 |
| 3 | `uml-secuencia-reserva-concurrente.mmd` | `.svg` `.png` | UML — Diagrama de secuencia | Acosta, Marcela | 2026-11-18 | 1.1 |
| 4 | `uml-actividad-lista-espera.mmd` | `.svg` `.png` | UML — Diagrama de actividad | Acosta, Marcela | 2026-11-18 | 1.1 |
| 5 | `uml-estados-inscripcion-7-estados.mmd` | `.svg` `.png` | UML — Diagrama de estados | Acosta, Marcela | 2026-11-18 | 1.1 |
| 6 | `uml-estados-reserva-clase-grupal.mmd` | `.svg` `.png` | UML — Diagrama de estados | Acosta, Marcela | 2026-11-18 | 1.1 |
| 7 | `uml-clases-dominio-observer-repository.mmd` | `.svg` `.png` | UML — Diagrama de clases | Acosta, Marcela | 2026-11-17 | 1.0 |
| 8 | `der-modulo3-clases-grupales.mmd` | `.svg` `.png` | DER físico | Acosta, Marcela | 2026-11-17 | 1.0 |

Los ocho diagramas están exportados en SVG y PNG, generados con Mermaid CLI 11 sobre Chrome.

### Nota sobre los metadatos en el archivo fuente

Mermaid no admite comentarios `%%` en la primera línea de un `flowchart` ni de un `erDiagram`, así que los diagramas 4 (`flowchart`) y 8 (`erDiagram`) no llevan el encabezado dentro del archivo. Sus metadatos de autor, fecha y versión están en el pie de figura de este índice, que es la ubicación alternativa que admiten los lineamientos. Los otros seis sí llevan el encabezado `%% Autor / %% Fecha / %% Versión` en el archivo.

## Cobertura de los diagramas obligatorios

| Exigencia del lineamiento | Diagrama que la cubre | Estado |
|---------------------------|----------------------|--------|
| C4-3 Componentes (obligatorio para el módulo) | #1 | ✅ |
| UML Secuencia — Reserva | #2 | ✅ |
| UML Secuencia — Reserva concurrente (RN-02) | #3 | ✅ |
| UML Estados — Reserva, con cancelación con y sin penalidad (RF-07, RF-10) | #6 | ✅ |
| UML Actividad — Lista de espera (RF-08, Observer) | #4 | ✅ |
| UML Clases del dominio — parte Observer y Repository | #7 | ✅ |
| DER físico con claves, índices y unicidad de la inscripción activa | #8 | ✅ |
| UML Estados — Inscripción con los 7 estados | #5 | ✅ (complementa #6) |

### Diagramas que no corresponden a M3

Estos son obligatorios del lineamiento pero pertenecen a otros módulos: C4-1 Contexto, C4-2 Contenedores, C4-3 Componentes de Canchas (M4), C4-3 Componentes de Acceso (M2), C4-4 Código (opcional), Secuencia de reserva de cancha con pago (M4), Secuencia de validación de acceso offline (M2), Estados de Membresía (M1), Diagrama de despliegue y Arquitectura del pipeline (equipo).

## Exportación

Los ocho `.svg` y los ocho `.png` ya están generados y versionados en esta carpeta. Para regenerarlos después de editar una fuente:

```powershell
# Windows PowerShell
.\docs\diagramas\exportar-diagramas.ps1
```

```bash
# Linux / macOS
bash docs/diagramas/exportar-diagramas.sh
```

Ambos scripts recorren los `.mmd` de esta carpeta y generan el `.svg` y el `.png` junto a cada fuente. Requieren Node.js 20+ y Chrome o Edge instalados; si no hay navegador, Mermaid CLI descarga Chromium en la primera ejecución.

## Convenciones

- **Formato:** Mermaid (`flowchart`, `stateDiagram-v2`, `sequenceDiagram`, `classDiagram`, `erDiagram`, `C4Component`). Es texto plano, versionable y editable sin herramientas propietarias.
- **Idioma de las etiquetas:** español, para que el diagrama sea legible en la defensa.
- **Colores:** la paleta se declara con `style` en los diagramas de flujo y no depende de variables CSS, de modo que la exportación sea idéntica en cualquier máquina.
- **Trazabilidad:** cada diagrama indica en sus notas el ADR y el requisito que lo respalda.