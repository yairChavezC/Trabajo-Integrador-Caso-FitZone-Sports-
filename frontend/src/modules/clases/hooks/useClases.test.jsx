import '@testing-library/jest-dom/vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useClases } from './useClases';
import {
  anotarListaEspera,
  aceptarOfertaListaEspera,
  cancelarReservaClase,
  getClases,
  getInscripcionesClase,
  reservarClase
} from '../services/claseService';
import { useSede } from '../../../shared/context/SedeContext';

vi.mock('../../../shared/context/SedeContext', () => ({
  useSede: vi.fn()
}));

vi.mock('../services/claseService', () => ({
  getClases: vi.fn(),
  createClase: vi.fn(),
  updateClase: vi.fn(),
  deleteClase: vi.fn(),
  getInscripcionesClase: vi.fn(),
  reservarClase: vi.fn(),
  cancelarReservaClase: vi.fn(),
  anotarListaEspera: vi.fn(),
  aceptarOfertaListaEspera: vi.fn()
}));

const clases = [{ id: 3, nombre: 'Yoga', idSede: 1 }];
const clasesPorSede = [
  { id: 3, nombre: 'Yoga', idSede: 1 },
  { id: 4, nombre: 'Pilates', idSede: 2 }
];

beforeEach(() => {
  vi.clearAllMocks();
  useSede.mockReturnValue({ sedeSeleccionada: null });
  getClases.mockResolvedValue(clases);
});

describe('useClases', () => {
  it('carga las clases y no vuelve al estado de carga al actualizar', async () => {
    const { result } = renderHook(() => useClases());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.clases).toEqual(clases);
    expect(getClases).toHaveBeenCalledWith(false, null);

    await act(async () => {
      await result.current.fetchClases();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.clases).toEqual(clases);
  });

  it('expone el error del servicio si falla la carga inicial', async () => {
    getClases.mockRejectedValueOnce(new Error('Servicio de clases no disponible.'));
    const { result } = renderHook(() => useClases());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.clases).toEqual([]);
    expect(result.current.error).toBe('Servicio de clases no disponible.');
  });

  it('conserva las clases cargadas y el error del sondeo hasta una respuesta correcta', async () => {
    let actualizar = () => {};
    const setIntervalOriginal = window.setInterval.bind(window);
    const intervalSpy = vi.spyOn(window, 'setInterval').mockImplementation((callback, delay) => {
      if (delay === 30000) actualizar = callback;
      return setIntervalOriginal(callback, delay);
    });
    getClases
      .mockResolvedValueOnce(clases)
      .mockRejectedValueOnce(new Error('Fallo temporal de conexión.'))
      .mockResolvedValueOnce(clasesPorSede);
    const { result, unmount } = renderHook(() => useClases());

    try {
      await waitFor(() => expect(result.current.hasLoaded).toBe(true));
      expect(result.current.clases).toEqual(clases);

      act(() => actualizar());
      await waitFor(() => {
        expect(result.current.error).toBe('Fallo temporal de conexión.');
      });
      expect(result.current.clases).toEqual(clases);
      expect(result.current.hasLoaded).toBe(true);

      act(() => actualizar());
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
      expect(result.current.clases).toEqual(clasesPorSede);
    } finally {
      unmount();
      intervalSpy.mockRestore();
    }
  });

  it('bloquea acciones duplicadas y expone el estado pendiente sin ocultar la lista', async () => {
    let completarReserva;
    reservarClase.mockImplementation(
      () => new Promise((resolve) => {
        completarReserva = resolve;
      })
    );
    const { result } = renderHook(() => useClases());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let primera;
    await act(async () => {
      primera = result.current.reservar(3);
    });
    expect(result.current.isActionPending('reservar', 3)).toBe(true);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      expect(await result.current.reservar(3)).toBeNull();
    });
    expect(reservarClase).toHaveBeenCalledTimes(1);

    await act(async () => {
      completarReserva({ data: { id: 12 } });
      await primera;
    });

    expect(result.current.isActionPending('reservar', 3)).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('consulta otra vez al cambiar la sede seleccionada', async () => {
    useSede.mockReturnValue({ sedeSeleccionada: { id: 1 } });
    getClases.mockImplementation((_, idSede) =>
      Promise.resolve([clasesPorSede.find((clase) => clase.idSede === idSede)])
    );
    const { result, rerender } = renderHook(() => useClases());

    await waitFor(() => expect(result.current.clases).toEqual([clasesPorSede[0]]));
    expect(getClases).toHaveBeenLastCalledWith(false, 1);

    useSede.mockReturnValue({ sedeSeleccionada: { id: 2 } });
    rerender();

    await waitFor(() => {
      expect(getClases).toHaveBeenLastCalledWith(false, 2);
      expect(result.current.clases).toEqual([clasesPorSede[1]]);
    });
  });

  it('devuelve la respuesta del servicio sin volver a filtrar por sede', async () => {
    useSede.mockReturnValue({ sedeSeleccionada: { id: 1 } });
    const respuestaDelBackend = [clasesPorSede[1]];
    getClases.mockResolvedValue(respuestaDelBackend);
    const { result } = renderHook(() => useClases());

    await waitFor(() => expect(result.current.clases).toEqual(respuestaDelBackend));

    expect(getClases).toHaveBeenCalledWith(false, 1);
  });

  it('carga inscriptos por clase y expone errores de consulta', async () => {
    const inscriptos = [
      { id: 2, idUsuario: 4, nombreUsuario: 'Socio Test', estado: 'confirmado' }
    ];
    getInscripcionesClase
      .mockResolvedValueOnce({ data: inscriptos })
      .mockRejectedValueOnce(new Error('No se pudieron cargar los inscriptos.'));
    const { result } = renderHook(() => useClases());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.cargarInscriptos(7);
    });
    expect(getInscripcionesClase).toHaveBeenCalledWith(7);
    expect(result.current.inscriptosPorClase[7]).toEqual(inscriptos);
    expect(result.current.cargandoInscriptosPorClase[7]).toBe(false);
    expect(result.current.errorInscriptosPorClase[7]).toBeNull();

    await act(async () => {
      await result.current.cargarInscriptos(7);
    });
    expect(result.current.errorInscriptosPorClase[7])
      .toBe('No se pudieron cargar los inscriptos.');
  });

  it('permite pedir todas las sedes aunque haya una sede seleccionada', async () => {
    useSede.mockReturnValue({ sedeSeleccionada: { id: 1 } });
    getClases.mockResolvedValue(clasesPorSede);
    const { result } = renderHook(() => useClases({ idSede: null }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getClases).toHaveBeenCalledWith(false, null);
    expect(result.current.clases).toEqual(clasesPorSede);
  });

  it.each([
    {
      action: 'reservar',
      service: reservarClase,
      before: { ...clases[0], miInscripcion: null },
      after: { ...clases[0], miInscripcion: { estado: 'confirmado' } }
    },
    {
      action: 'cancelar',
      service: cancelarReservaClase,
      before: { ...clases[0], miInscripcion: { estado: 'confirmado' } },
      after: { ...clases[0], miInscripcion: null }
    },
    {
      action: 'listaEspera',
      service: anotarListaEspera,
      before: { ...clases[0], miInscripcion: null },
      after: { ...clases[0], miInscripcion: { estado: 'en espera' } }
    },
    {
      action: 'aceptarOferta',
      service: aceptarOfertaListaEspera,
      before: {
        ...clases[0],
        miInscripcion: {
          estado: 'notificado',
          fechaExpiracionOferta: '2026-11-13T20:30:00.000Z'
        }
      },
      after: { ...clases[0], miInscripcion: { estado: 'confirmado' } }
    }
  ])('refresca el estado luego de $action', async ({ action, service, before, after }) => {
    getClases.mockResolvedValueOnce([before]).mockResolvedValueOnce([after]);
    service.mockResolvedValue({ data: { id: 8 } });
    const { result } = renderHook(() => useClases({ idSede: null }));

    await waitFor(() => expect(result.current.clases).toEqual([before]));
    await act(async () => {
      await result.current[action](3);
    });

    expect(service).toHaveBeenCalledWith(3);
    expect(result.current.clases).toEqual([after]);
  });

  it('expone el error de una acción fallida y no muestra un estado exitoso', async () => {
    reservarClase.mockRejectedValue(new Error('No se pudo reservar.'));
    const { result } = renderHook(() => useClases({ idSede: null }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      expect(await result.current.reservar(3)).toBeNull();
    });

    expect(result.current.actionError).toBe('No se pudo reservar.');
    expect(getClases).toHaveBeenCalledTimes(1);
  });
});
