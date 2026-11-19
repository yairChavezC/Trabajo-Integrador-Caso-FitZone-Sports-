/**
 * Transactional observers run before commit and may abort it; secondary observers run after commit.
 */
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

  async notify(evento, { transactionClient } = {}) {
    const dentroDeTransaccion = transactionClient !== undefined && transactionClient !== null;

    for (const observer of this.observers) {
      if (Boolean(observer.transactional) !== dentroDeTransaccion) continue;

      if (dentroDeTransaccion) {
        await observer.update(evento, { transactionClient });
        continue;
      }

      try {
        await observer.update(evento);
      } catch (error) {
        const observerName = observer?.constructor?.name || 'observer';
        console.error(`[Observer/ListaEspera] Error notificando ${observerName}:`, error);
      }
    }
  }
}

export class NotificationPersistenceObserver {
  constructor(notificationRepo) {
    this.notificationRepo = notificationRepo;
    this.transactional = true;
  }

  async update(evento, { transactionClient } = {}) {
    if (!transactionClient) {
      throw new Error('El observer de notificaciones requiere una transacción activa.');
    }

    return this.notificationRepo.createWaitlistPromotion(evento, transactionClient);
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

export const createWaitlistSubject = (
  notificationRepo,
  secondaryObservers = [new ConsoleWaitlistObserver()]
) => {
  const subject = new WaitlistSubject();
  subject.subscribe(new NotificationPersistenceObserver(notificationRepo));
  for (const observer of secondaryObservers) {
    subject.subscribe(observer);
  }
  return subject;
};
