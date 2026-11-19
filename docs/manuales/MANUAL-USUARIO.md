# Manual de Usuario — FitZone Sports

## 1. Propósito del sistema
FitZone Sports permite gestionar socios y membresías (`socios`), clases y actividades (`clases`), reservas de canchas (`canchas`), control de accesos y aforo por sede (`acceso`) y pagos con emisión de comprobantes en PDF (`pagos`).

## 2. Acceso y selección de sede
1. Accedé a la aplicación web e iniciá sesión desde el módulo de autenticación (`auth`).
2. Si operás en una sede o consultás disponibilidad por ubicación, verificá la sede activa en el contexto de sede (`SedeContext`) y tus permisos según tu rol (`ProtectedRoute`).

## 3. Flujos de uso principales

### 3.1 Socios y membresías (`socios`)
- Consultá y gestioná los datos de socios, estado de membresía y sesión activa desde el módulo de socios.
- Verificá que la membresía se encuentre habilitada antes de registrar ingresos o confirmar actividades asociadas.

### 3.2 Clases y reserva de canchas (`clases` y `canchas`)
1. Ingresá a **Clases** o **Canchas** según el recurso que necesites reservar o consultar.
2. Elegí fecha, horario y disponibilidad.
3. Confirmá la operación; el sistema valida disponibilidad y evita superposiciones o reservas concurrentes conflictivas.

### 3.3 Control de acceso y aforo en sede (`acceso`)
1. Registrá el ingreso del socio al llegar a la sede y el egreso al retirarse para mantener actualizado el aforo.
2. **Modo sin conexión (contingencia offline):** si cae la red en la terminal de recepción, el registro continúa usando la réplica local y se encola para sincronizarse con la base central al restablecerse la conexión, respetando orden cronológico e idempotencia.

### 3.4 Pagos y comprobantes PDF (`pagos`)
1. Iniciá el pago correspondiente desde el módulo de pagos o desde el flujo de reserva/membresía.
2. Completá el cobro a través de la pasarela configurada; el sistema no almacena datos sensibles de tarjeta (PAN, CVV o vencimiento).
3. Una vez aprobado el pago, consultá el detalle de la transacción y descargá o visualizá el comprobante en **PDF**.

## 4. Solución rápida de problemas frecuentes
- **Sesión vencida o sin permisos:** cerrá sesión, volvé a autenticarte y revisá que el rol tenga acceso a la vista solicitada.
- **Conflicto de horario o cupo:** seleccioná otro turno o cancha disponible y reintentá.
- **Corte de red en recepción:** aguardá la reconexión para que se complete la sincronización de la cola pendiente sin duplicar movimientos.
