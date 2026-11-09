import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ConsoleWaitlistObserver,
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

test('un fallo en un observer no impide notificar a los siguientes', async () => {
  const subject = new WaitlistSubject();
  const notificaciones = [];
  const errores = [];
  const errorOriginal = console.error;
  console.error = (...args) => errores.push(args);

  subject.subscribe({
    async update() {
      throw new Error('Fallo del primer observer');
    }
  });
  subject.subscribe({
    async update(evento) {
      notificaciones.push(evento);
    }
  });

  try {
    const evento = { idClase: 1 };
    await subject.notify(evento);
    assert.deepEqual(notificaciones, [evento]);
    assert.equal(errores.length, 1);
    assert.match(errores[0][0], /Error notificando Object/);
  } finally {
    console.error = errorOriginal;
  }
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
