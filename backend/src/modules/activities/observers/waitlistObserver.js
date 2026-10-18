/**
 * Patrón Observer para RF-08 (lista de espera de clases grupales).
 * El Subject avisa a los observers cuando se libera un cupo por una baja.
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

  async notify(evento) {
    for (const observer of this.observers) {
      await observer.update(evento);
    }
  }
}

export class ConsoleWaitlistObserver {
  async update(evento) {
    console.log(
      `[Observer/ListaEspera] Clase ${evento.idClase}: se notificó al usuario ${evento.idUsuario} ` +
        `(inscripción ${evento.idInscripcion}). Motivo: ${evento.motivo}`
    );
  }
}

export const classWaitlistSubject = new WaitlistSubject();
classWaitlistSubject.subscribe(new ConsoleWaitlistObserver());
