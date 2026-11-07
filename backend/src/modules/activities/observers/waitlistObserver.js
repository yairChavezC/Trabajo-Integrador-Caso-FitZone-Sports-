export class WaitlistSubject {
  constructor() {
    this.observers = [];
  }

  subscribe(observer) {
    this.observers.push(observer);
    return () => {
      this.observers = this.observers.filter((item) => item !== observer);
    };
  }

  async notify(evento) {
    for (const observer of this.observers) {
      await observer.update(evento);
    }
  }
}

export class ConsoleWaitlistObserver {
  async update(evento) {
    console.log(
      `[Observer/ListaEspera] Clase ${evento.idClase}: oferta temporal enviada al usuario ${evento.idUsuario} ` +
        `(inscripción ${evento.idInscripcion}). Motivo: ${evento.motivo}`
    );
  }
}

export class NotificationWaitlistObserver {
  constructor(notificationRepo = null) {
    this.notificationRepo = notificationRepo;
  }

  async update(evento) {
    try {
      const repo = this.notificationRepo || (await import('../repositories/notificationRepository.js'));
      await repo.createWaitlistPromotion(evento);
    } catch (err) {
      // Si la tabla no está creada aún en la BD o falla la persistencia, se registra en log sin interrumpir el flujo
      console.warn('[Observer/Notificaciones] No se pudo guardar la notificación persistente:', err.message);
    }
  }
}

export const classWaitlistSubject = new WaitlistSubject();
classWaitlistSubject.subscribe(new ConsoleWaitlistObserver());
classWaitlistSubject.subscribe(new NotificationWaitlistObserver());
