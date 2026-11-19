import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { useClases } from '../hooks/useClases';
import {
  getNotificacionesClases,
  marcarNotificacionClaseLeida
} from '../services/claseService';
import { useSede } from '../../../shared/context/SedeContext';
import AgendaClasesScreen from './AgendaClasesScreen';

vi.mock('../hooks/useClases', () => ({
  useClases: vi.fn()
}));

vi.mock('../services/claseService', () => ({
  getNotificacionesClases: vi.fn(),
  marcarNotificacionClaseLeida: vi.fn()
}));

vi.mock('../../../shared/context/SedeContext', () => ({
  useSede: vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
  useSede.mockReturnValue({
    sedeSeleccionada: { id: 4, nombre: 'Centro' }
  });
  useClases.mockReturnValue({
    clases: [],
    loading: false,
    error: null,
    actionError: null,
    reservar: vi.fn(),
    cancelar: vi.fn(),
    listaEspera: vi.fn(),
    aceptarOferta: vi.fn(),
    isActionPending: vi.fn(() => false)
  });
  getNotificacionesClases.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

describe('AgendaClasesScreen', () => {
  it('expone pestañas vinculadas a sus paneles y permite recorrerlas con teclado', async () => {
    const user = userEvent.setup();
    render(<AgendaClasesScreen puedeInscribirse />);

    const listaPestanas = screen.getByRole('tablist', { name: 'Vistas de clases' });
    const todas = screen.getByRole('tab', { name: /Todas las clases/ });
    const misClases = screen.getByRole('tab', { name: /Mis reservas/ });

    expect(listaPestanas).toBeInTheDocument();
    expect(todas).toHaveAttribute('aria-controls', 'agenda-panel-todas');
    expect(todas).toHaveAttribute('aria-selected', 'true');
    expect(todas).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tabpanel', { name: /Todas las clases/ })).toBeVisible();
    expect(misClases).toHaveAttribute('tabindex', '-1');

    todas.focus();
    await user.keyboard('{ArrowRight}');
    expect(misClases).toHaveFocus();
    expect(misClases).toHaveAttribute('aria-selected', 'true');
    expect(misClases).toHaveAttribute('aria-controls', 'agenda-panel-mis-clases');
    expect(screen.getByRole('tabpanel', { name: /Mis reservas/ })).toBeVisible();

    await user.keyboard('{Home}');
    expect(todas).toHaveFocus();
    expect(todas).toHaveAttribute('aria-selected', 'true');
  });

  it('anuncia la carga, los errores y los resultados vacíos de la agenda', () => {
    useClases.mockReturnValueOnce({
      clases: [],
      loading: true,
      error: null,
      actionError: null,
      reservar: vi.fn(),
      cancelar: vi.fn(),
      listaEspera: vi.fn(),
      aceptarOferta: vi.fn(),
      isActionPending: vi.fn(() => false)
    });
    const { rerender } = render(<AgendaClasesScreen />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando agenda de clases');

    useClases.mockReturnValueOnce({
      clases: [],
      loading: false,
      error: 'Conexión no disponible.',
      actionError: null,
      reservar: vi.fn(),
      cancelar: vi.fn(),
      listaEspera: vi.fn(),
      aceptarOferta: vi.fn(),
      isActionPending: vi.fn(() => false)
    });
    rerender(<AgendaClasesScreen />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar la agenda');

    useClases.mockReturnValueOnce({
      clases: [],
      loading: false,
      error: null,
      actionError: null,
      reservar: vi.fn(),
      cancelar: vi.fn(),
      listaEspera: vi.fn(),
      aceptarOferta: vi.fn(),
      isActionPending: vi.fn(() => false)
    });
    rerender(<AgendaClasesScreen />);
    expect(screen.getByRole('status')).toHaveTextContent('No hay clases próximas');
  });

  it('conserva los resultados visibles mientras informa una actualización', () => {
    useClases.mockReturnValue({
      clases: [{
        id: 1,
        nombre: 'Yoga',
        profesor: 'Ana',
        cupo: 8,
        cupoDisponible: 3,
        fechaInicio: '2026-11-14T19:00:00.000Z',
        fechaFin: '2026-11-14T20:00:00.000Z',
        sede: 'Centro'
      }],
      loading: true,
      error: null,
      actionError: null,
      reservar: vi.fn(),
      cancelar: vi.fn(),
      listaEspera: vi.fn(),
      aceptarOferta: vi.fn(),
      isActionPending: vi.fn(() => false)
    });

    render(<AgendaClasesScreen />);

    const contenedor = screen.getByTestId('agenda-contenedor');
    expect(contenedor).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Actualizando agenda de clases');
    expect(screen.getByRole('heading', { name: 'Yoga' })).toBeVisible();
  });

  it('mantiene la agenda cargada visible cuando falla el sondeo', () => {
    useClases.mockReturnValue({
      clases: [{
        id: 1,
        nombre: 'Yoga',
        profesor: 'Ana',
        cupo: 8,
        cupoDisponible: 3,
        fechaInicio: '2026-11-14T19:00:00.000Z',
        fechaFin: '2026-11-14T20:00:00.000Z',
        sede: 'Centro'
      }],
      loading: false,
      hasLoaded: true,
      error: 'Fallo temporal de conexión.',
      actionError: null,
      reservar: vi.fn(),
      cancelar: vi.fn(),
      listaEspera: vi.fn(),
      aceptarOferta: vi.fn(),
      isActionPending: vi.fn(() => false)
    });

    render(<AgendaClasesScreen />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo actualizar la agenda de clases'
    );
    expect(screen.getByRole('heading', { name: 'Yoga' })).toBeVisible();
  });

  it('permite alternar entre la sede seleccionada y todas las sedes', () => {
    render(<AgendaClasesScreen puedeInscribirse />);

    const filtro = screen.getByRole('combobox', { name: 'Filtrar por sede' });
    expect(filtro).toHaveValue('seleccionada');
    expect(useClases).toHaveBeenLastCalledWith({ idSede: 4 });

    fireEvent.change(filtro, { target: { value: 'todas' } });
    expect(useClases).toHaveBeenLastCalledWith({ idSede: null });

    fireEvent.change(filtro, { target: { value: 'seleccionada' } });
    expect(useClases).toHaveBeenLastCalledWith({ idSede: 4 });
  });

  it('muestra el error de una acción fallida', () => {
    useClases.mockReturnValue({
      clases: [],
      loading: false,
      error: null,
      actionError: 'No se pudo reservar.',
      reservar: vi.fn(),
      cancelar: vi.fn(),
      listaEspera: vi.fn(),
      aceptarOferta: vi.fn(),
      isActionPending: vi.fn(() => false)
    });

    render(<AgendaClasesScreen puedeInscribirse />);

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo reservar.');
  });

  it('muestra una oferta vencida sin quitar la notificación de la lista', async () => {
    const notificacion = {
      id: 17,
      mensaje: 'Se liberó un lugar y se generó una oferta.',
      creadaAt: '2026-11-13T19:00:00.000Z',
      leidaAt: null,
      estadoInscripcion: 'expirado',
      fechaExpiracionOferta: '2026-11-13T19:15:00.000Z',
      ofertaVencida: true
    };
    getNotificacionesClases.mockResolvedValue([notificacion]);
    const { container } = render(<AgendaClasesScreen puedeInscribirse />);

    const mensaje = await screen.findByText(notificacion.mensaje);
    const item = mensaje.closest('li');

    expect(item).toHaveTextContent('Oferta vencida');
    expect(item).toHaveTextContent('Oferta vencida el');
    expect(item.querySelector('time[datetime="2026-11-13T19:15:00.000Z"]'))
      .toBeInTheDocument();
    expect(container.querySelector('.clases-notificacion')).toBeInTheDocument();
  });

  it('anuncia la carga y los errores de notificaciones sin afirmar que no hay resultados', async () => {
    getNotificacionesClases.mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = render(<AgendaClasesScreen puedeInscribirse />);
    expect(screen.getByText('Cargando notificaciones...')).toHaveAttribute('role', 'status');
    unmount();

    getNotificacionesClases.mockRejectedValueOnce(new Error('Servicio no disponible.'));
    render(<AgendaClasesScreen puedeInscribirse />);

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('No se pudieron cargar o actualizar las notificaciones');
    expect(screen.queryByText('No tenés notificaciones de clases.')).not.toBeInTheDocument();
  });

  it('marca como leída sin quitarla y la conserva al volver a cargar la agenda', async () => {
    const notificacion = {
      id: 17,
      mensaje: 'Se liberó un lugar y se generó una oferta.',
      creadaAt: '2026-11-13T19:00:00.000Z',
      leidaAt: null,
      estadoInscripcion: 'notificado',
      fechaExpiracionOferta: '2026-11-13T20:00:00.000Z',
      ofertaVencida: false
    };
    const leida = { ...notificacion, leidaAt: '2026-11-13T19:05:00.000Z' };
    getNotificacionesClases
      .mockResolvedValueOnce([notificacion])
      .mockResolvedValueOnce([leida]);
    let completarLectura;
    marcarNotificacionClaseLeida.mockImplementation(
      () => new Promise((resolve) => {
        completarLectura = resolve;
      })
    );
    const primeraVista = render(<AgendaClasesScreen puedeInscribirse />);

    await screen.findByText(notificacion.mensaje);
    const boton = screen.getByRole('button', { name: 'Marcar como leída' });
    fireEvent.click(boton);
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();

    await act(async () => {
      completarLectura(leida);
    });
    await waitFor(() => expect(screen.getByText('Leída')).toBeInTheDocument());
    expect(screen.getByText(notificacion.mensaje)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como leída' }))
      .not.toBeInTheDocument();

    primeraVista.unmount();
    render(<AgendaClasesScreen puedeInscribirse />);

    await screen.findByText(notificacion.mensaje);
    expect(screen.getByText('Leída')).toBeInTheDocument();
    expect(getNotificacionesClases).toHaveBeenCalledTimes(2);
  });
});
