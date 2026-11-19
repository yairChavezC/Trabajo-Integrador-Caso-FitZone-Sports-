# ADR del módulo M3 — Clases Grupales

Los ADR obligatorios **ADR-001 a ADR-010 ya están en el repositorio**, redactados por el equipo. Acá van los ADR que agregó el módulo M3 para las decisiones que tomó durante su propio desarrollo.

## ADR de M3

| ADR | Título | Requisitos |
|-----|--------|------------|
| ADR-011 | Cancelación tardía con penalización | RF-07 |
| ADR-012 | Lista de espera con patrón Observer | RF-08 |
| ADR-013 | Notificación transaccional en lista de espera | RF-08 |
| ADR-014 | Control de concurrencia en reservas: no sobreventa de cupo | RF-06, RN-02 |
| ADR-015 | Separación de servicios: activityService e inscriptionService | RF-06, RF-07, RF-08 |
| ADR-016 | Control de acceso por roles y sede | RF-06, RN-01 |
| ADR-017 | Estados de inscripción (7 estados) | RF-06, RF-07, RF-08 |
| ADR-018 | Diálogo de confirmación y notificaciones al usuario | RF-07, RF-08 |
| ADR-019 | Estrategia de pruebas del módulo M3 | RNF-03 |
| ADR-021 | Alineación de tipos de fecha a TIMESTAMP WITHOUT TIME ZONE | RF-06, RF-07 |
| ADR-022 | Qué hace la vista de clases cuando la reserva devuelve 403 | RF-06, RF-07 |
| ADR-023 | La vista de clases no recalcula la penalidad y usa Design Tokens | RF-07 |

## Criterios de redacción

- Todos están en estado `Aceptado`. Ninguno quedó en «Propuesto».
- Cada uno enumera entre tres y cuatro alternativas con su «por qué se descartó», que es la sección que más pesa en la rúbrica.
- Cada uno cierra con consecuencias positivas, negativas y deuda asumida.
- **Un ADR no se corrige: se supera.** Los ADR-021, 022 y 023 nacieron así: registran decisiones que se tomaron después de los ADR-011 a ADR-019 y que no correspondía reescribir en los originales.

## Numeración

- **ADR-020 no existe**: su contenido («penalidad por cancelación tardía») decía lo mismo que ADR-011. Duplicar un ADR resta claridad, así que se descartó y su material quedó absorbido en ADR-011 y ADR-021.
- Los ADR de M3 arrancan en 011 porque los diez primeros son los obligatorios del sistema.
- Si el equipo agrega más ADR, la numeración sigue correlativa desde 024.