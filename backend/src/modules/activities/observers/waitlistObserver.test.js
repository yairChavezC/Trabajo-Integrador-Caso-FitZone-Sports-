import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ConsoleWaitlistObserver,
  NotificationWaitlistObserver,
  WaitlistSubject
} from './waitlistObserver.js';

test('el subject notifica en orden a los observers suscriptos', async () => {
  const subject = new WaitlistSubject();
  const notificaciones = [];
  const evento = { idClase: 1, idUsuario: 2 };

  subject.subscribe({
    async update(value) {
      notificaciones.push(['primero', value]);
    }
  });
  subject.subscribe({
    async update(value) {
      notificaciones.push(['segundo', value]);
    }
  });

  await subject.notify(evento);

  assert.deepEqual(notificaciones, [
    ['primero', evento],
    ['segundo', evento]
  ]);
});

test('el unsubscribe evita futuras notificaciones al observer', async () => {
  const subject = new WaitlistSubject();
  let notificaciones = 0;
  const unsubscribe = subject.subscribe({
    async update() {
      notificaciones += 1;
    }
  });

  unsubscribe();
  await subject.notify({ idClase: 1 });

  assert.equal(notificaciones, 0);
});

test('el observer registra el aviso de la oferta sin persistencia externa', async () => {
  const observer = new ConsoleWaitlistObserver();
  const evento = {
    idClase: 1,
    idUsuario: 2,
    idInscripcion: 3,
    motivo: 'oferta_temporal_lista_espera'
  };
  const logOriginal = console.log;
  const mensajes = [];
  console.log = (...args) => mensajes.push(args.join(' '));

  try {
    await observer.update(evento);
  } finally {
    console.log = logOriginal;
  }

  assert.match(mensajes[0], /oferta temporal enviada al usuario 2/);
  assert.match(mensajes[0], /inscripción 3/);
});

test('NotificationWaitlistObserver persiste la notificación a través del repositorio', async () => {
  const eventosGuardados = [];
  const fakeRepo = {
    createWaitlistPromotion: async (ev) => {
      eventosGuardados.push(ev);
      return { id: 101, ...ev };
    }
  };

  const observer = new NotificationWaitlistObserver(fakeRepo);
  const evento = {
    idClase: 10,
    nombreClase: 'Funcional',
    idUsuario: 5,
    idInscripcion: 42,
    motivo: 'oferta_temporal_lista_espera'
  };

  await observer.update(evento);

  assert.equal(eventosGuardados.length, 1);
  assert.deepEqual(eventosGuardados[0], evento);
});

test('NotificationWaitlistObserver captura fallos de persistencia sin interrumpir el flujo', async () => {
  const fakeRepo = {
    createWaitlistPromotion: async () => {
      throw new Error('Conexión fallida con la base de datos');
    }
  };

  const observer = new NotificationWaitlistObserver(fakeRepo);
  const warnOriginal = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(' '));

  try {
    await observer.update({
      idClase: 10,
      nombreClase: 'Spinning',
      idUsuario: 7,
      idInscripcion: 99,
      motivo: 'oferta_temporal_lista_espera'
    });
  } finally {
    console.warn = warnOriginal;
  }

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /No se pudo guardar la notificación persistente/);
});
