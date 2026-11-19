import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '../../../core/api/httpClient';
import {
  getClases,
  getRolClases,
  createClase,
  updateClase,
  deleteClase,
  reservarClase,
  cancelarReservaClase,
  anotarListaEspera,
  aceptarOfertaListaEspera,
  getNotificacionesClases,
  marcarNotificacionClaseLeida,
  getInscripcionesClase
} from './claseService';

vi.mock('../../../core/api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('claseService', () => {
  it('getClases envía parámetros correctamente', async () => {
    await getClases(true, 7);
    expect(httpClient.get).toHaveBeenCalledWith('/clases?incluirPasadas=true&idSede=7');

    await getClases(false, null);
    expect(httpClient.get).toHaveBeenCalledWith('/clases');
  });

  it('getRolClases llama al endpoint mi-rol', async () => {
    await getRolClases();
    expect(httpClient.get).toHaveBeenCalledWith('/clases/mi-rol');
  });

  it('createClase realiza POST a /clases', async () => {
    const payload = { nombre: 'Yoga' };
    await createClase(payload);
    expect(httpClient.post).toHaveBeenCalledWith('/clases', payload);
  });

  it('updateClase realiza PUT a /clases/:id', async () => {
    const payload = { profesor: 'Maria' };
    await updateClase(5, payload);
    expect(httpClient.put).toHaveBeenCalledWith('/clases/5', payload);
  });

  it('deleteClase realiza DELETE a /clases/:id', async () => {
    await deleteClase(3);
    expect(httpClient.delete).toHaveBeenCalledWith('/clases/3');
  });

  it('reservarClase realiza POST a /clases/:id/reservas', async () => {
    await reservarClase(4);
    expect(httpClient.post).toHaveBeenCalledWith('/clases/4/reservas');
  });

  it('cancelarReservaClase realiza DELETE a /clases/:id/reservas', async () => {
    await cancelarReservaClase(4);
    expect(httpClient.delete).toHaveBeenCalledWith('/clases/4/reservas');
  });

  it('anotarListaEspera realiza POST a /clases/:id/lista-espera', async () => {
    await anotarListaEspera(4);
    expect(httpClient.post).toHaveBeenCalledWith('/clases/4/lista-espera');
  });

  it('aceptarOfertaListaEspera realiza POST a /clases/:id/lista-espera/aceptar', async () => {
    await aceptarOfertaListaEspera(4);
    expect(httpClient.post).toHaveBeenCalledWith('/clases/4/lista-espera/aceptar');
  });

  it('getNotificacionesClases llama al endpoint notificaciones', async () => {
    await getNotificacionesClases();
    expect(httpClient.get).toHaveBeenCalledWith('/clases/notificaciones');
  });

  it('marcarNotificacionClaseLeida realiza PUT al endpoint leida', async () => {
    await marcarNotificacionClaseLeida(9);
    expect(httpClient.put).toHaveBeenCalledWith('/clases/notificaciones/9/leida');
  });

  it('getInscripcionesClase llama al endpoint inscripciones de una clase', async () => {
    await getInscripcionesClase(4);
    expect(httpClient.get).toHaveBeenCalledWith('/clases/4/inscripciones');
  });
});

