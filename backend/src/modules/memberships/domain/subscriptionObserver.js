// Subject (Publicador de eventos de suscripción)
export function createSubscriptionSubject() {
  const observers = new Set();

  function subscribe(observer) {
    observers.add(observer);
    return () => observers.delete(observer); // Devuelve función para desuscribir
  }

  async function notify(evento) {
    for (const observer of observers) {
      try {
        await observer.update(evento);
      } catch (err) {
        // Un fallo en un observer no debe romper la renovación principal
        console.error('Error en observer de membresía:', err.message);
      }
    }
  }

  return { subscribe, notify };
}

// Observer concreto 1: Registro de auditoría
export const auditRenewalObserver = {
  update(evento) {
    console.log(
      `[AUDITORÍA MEMBRESÍA] Usuario #${evento.idUsuario} renovó plan "${evento.planNombre}" hasta ${evento.fechaProximoVencimiento}`
    );
  },
};

// Observer concreto 2: Notificación de bienvenida / confirmación
export const welcomeNotificationObserver = {
  update(evento) {
    console.log(
      `[NOTIFICACIÓN] Aviso generado para usuario #${evento.idUsuario}: tu membresía ${evento.planNombre} está activa.`
    );
  },
};