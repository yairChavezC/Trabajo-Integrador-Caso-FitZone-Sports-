import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClaseTable from './ClaseTable';

afterEach(() => {
  cleanup();
});

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

  it('reenvía a cada card los inscriptos, carga, error y callback por id', () => {
    const onLoadInscriptos = vi.fn();
    const otraClase = { ...clase, id: 22, nombre: 'Pilates' };
    const { container } = render(
      <ClaseTable
        clases={[clase, otraClase]}
        modoAdministracion
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onLoadInscriptos={onLoadInscriptos}
        inscriptosPorClase={{
          21: [{ id: 1, idUsuario: 9, nombreUsuario: 'Socio A', estado: 'confirmado' }]
        }}
        cargandoInscriptosPorClase={{ 22: false }}
        errorInscriptosPorClase={{ 22: 'Error al cargar inscriptos.' }}
      />
    );

    const cards = container.querySelectorAll('.clase-card');
    const primeraCard = within(cards[0]);
    const segundaCard = within(cards[1]);

    fireEvent.click(primeraCard.getByRole('button', { name: 'Ver inscriptos' }));
    expect(onLoadInscriptos).toHaveBeenCalledWith(21);
    expect(primeraCard.getByText('Socio A')).toBeInTheDocument();
    expect(segundaCard.queryByText('Socio A')).not.toBeInTheDocument();

    fireEvent.click(segundaCard.getByRole('button', { name: 'Reintentar carga' }));
    expect(onLoadInscriptos).toHaveBeenCalledWith(22);
    expect(segundaCard.getByRole('alert')).toHaveTextContent('Error al cargar inscriptos.');
  });
});
