import test from 'node:test';
import assert from 'node:assert/strict';
import { getClassNotifications, markClassNotificationAsRead } from '../src/modules/activities/services/notificationService.js';
import { BusinessError } from '../src/modules/activities/errors.js';

test('getClassNotifications rechaza usuario no autenticado', async () => {
  await assert.rejects(
    getClassNotifications(null),
    (error) => error instanceof BusinessError && error.status === 401
  );
  await assert.rejects(
    getClassNotifications(undefined),
    (error) => error instanceof BusinessError && error.status === 401
  );
});

test('markClassNotificationAsRead rechaza usuario no autenticado', async () => {
  await assert.rejects(
    markClassNotificationAsRead(1, null),
    (error) => error instanceof BusinessError && error.status === 401
  );
  await assert.rejects(
    markClassNotificationAsRead(1, undefined),
    (error) => error instanceof BusinessError && error.status === 401
  );
});

test('markClassNotificationAsRead rechaza notificación inexistente', async () => {
  await assert.rejects(
    markClassNotificationAsRead(999, 1),
    (error) => error instanceof BusinessError && error.status === 404
  );
});