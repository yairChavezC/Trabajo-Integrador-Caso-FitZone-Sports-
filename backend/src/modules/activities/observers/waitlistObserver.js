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

export const classWaitlistSubject = new WaitlistSubject();
classWaitlistSubject.subscribe(new ConsoleWaitlistObserver());
