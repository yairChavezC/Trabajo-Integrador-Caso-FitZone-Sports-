import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClaseCard from './ClaseCard';
import { getInscripcionesClase } from '../services/claseService';

vi.mock('../services/claseService', () => ({
  getInscripcionesClase: vi.fn()
}));

const claseBase = {
  id: 7,
  idSede: 1,
  nombre: 'Yoga',
  profesor: 'Ana García',
  cupo: 8,
  cupoDisponible: 2,
  sede: 'Centro',
  fechaInicio: '2026-11-10T10:00:00.000Z',
  fechaFin: '2026-11-10T11:00:00.000Z',
  puedeReservar: true,
  puedeAnotarseListaEspera: false,
  puedeCancelar: false,
  puedeAceptarOferta: false,
  miInscripcion: null
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ClaseCard', () => {
  it('usa las banderas del backend para habilitar las acciones', () => {
    const onReservar = vi.fn();
    const { rerender } = render(
      <ClaseCard clase={claseBase} onReservar={onReservar} soloLectura={false} />
    );

    const reservar = screen.getByRole('button', { name: 'Reservar lugar' });
    expect(reservar).toBeEnabled();
    fireEvent.click(reservar);
    expect(onReservar).toHaveBeenCalledWith(7);

    rerender(
      <ClaseCard
        clase={{ ...claseBase, puedeReservar: false }}
        onReservar={onReservar}
        soloLectura={false}
      />
    );
    expect(screen.getByRole('button', { name: 'Reservar lugar' })).toBeDisabled();
  });

  it('confirma antes de cancelar una reserva', () => {
    const onCancelar = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const clase = {
      ...claseBase,
      puedeReservar: false,
      puedeCancelar: true,
      miInscripcion: { estado: 'confirmado' }
    };
    render(
      <ClaseCard clase={clase} onCancelar={onCancelar} soloLectura={false} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    expect(window.confirm).toHaveBeenCalled();
    expect(onCancelar).not.toHaveBeenCalled();

    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    expect(onCancelar).toHaveBeenCalledWith(7);
  });

  it('extrae y muestra inscriptos con su badge de estado', async () => {
    getInscripcionesClase.mockResolvedValue([
      { id: 2, idUsuario: 4, nombreUsuario: 'Socio Test', estado: 'confirmado' }
    ]);

    render(
      <ClaseCard
        clase={claseBase}
        modoAdministracion
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ver inscriptos' }));

    expect(await screen.findByText('Socio Test')).toBeInTheDocument();
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
    expect(getInscripcionesClase).toHaveBeenCalledWith(7);
  });
});
