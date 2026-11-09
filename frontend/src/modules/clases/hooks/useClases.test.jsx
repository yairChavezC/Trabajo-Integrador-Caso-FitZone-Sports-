import '@testing-library/jest-dom/vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useClases } from './useClases';
import {
  getClases,
  reservarClase
} from '../services/claseService';

vi.mock('../../../shared/context/SedeContext', () => ({
  useSede: () => ({ sedeSeleccionada: null })
}));

vi.mock('../services/claseService', () => ({
  getClases: vi.fn(),
  createClase: vi.fn(),
  updateClase: vi.fn(),
  deleteClase: vi.fn(),
  reservarClase: vi.fn(),
  cancelarReservaClase: vi.fn(),
  anotarListaEspera: vi.fn(),
  aceptarOfertaListaEspera: vi.fn()
}));

const clases = [{ id: 3, nombre: 'Yoga', idSede: 1 }];

beforeEach(() => {
  vi.clearAllMocks();
  getClases.mockResolvedValue(clases);
});

describe('useClases', () => {
  it('carga las clases y no vuelve al estado de carga al actualizar', async () => {
    const { result } = renderHook(() => useClases());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.clases).toEqual(clases);

    await act(async () => {
      await result.current.fetchClases();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.clases).toEqual(clases);
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
});
