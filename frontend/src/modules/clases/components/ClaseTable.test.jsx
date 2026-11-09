import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClaseTable from './ClaseTable';

const clase = {
  id: 21,
  idSede: 1,
  nombre: 'Funcional',
  profesor: 'Martín',
  cupo: 12,
  cupoDisponible: 0,
  sede: 'Centro',
  fechaInicio: '2026-11-10T10:00:00.000Z',
  fechaFin: '2026-11-10T11:00:00.000Z',
  puedeReservar: false,
  puedeAnotarseListaEspera: true,
  puedeCancelar: false,
  puedeAceptarOferta: false,
  miInscripcion: null
};

describe('ClaseTable', () => {
  it('muestra las clases y entrega al card las acciones calculadas por el backend', () => {
    const onListaEspera = vi.fn();
    render(
      <ClaseTable
        clases={[clase]}
        soloLectura={false}
        onListaEspera={onListaEspera}
      />
    );

    expect(screen.getByRole('heading', { name: 'Funcional' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sumarme a la lista de espera' })).toBeEnabled();
  });

  it('muestra el estado vacío cuando no hay clases', () => {
    render(<ClaseTable clases={[]} />);
    expect(screen.getByText('No encontramos próximas clases para esta sede.')).toBeInTheDocument();
  });
});
