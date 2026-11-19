import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClaseCard from './ClaseCard';

const claseBase = {
  id: 7,
  idSede: 1,
  nombre: 'Yoga',
  profesor: 'Ana García',
  cupo: 8,
  cupoDisponible: 2,
  tieneInscripciones: false,
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
  cleanup();
  vi.restoreAllMocks();
});

describe('ClaseCard', () => {
  it('usa las banderas del backend para habilitar las acciones', () => {
    const onReservar = vi.fn();
    const { rerender } = render(
      <ClaseCard clase={claseBase} onReservar={onReservar}  />
    );

    const reservar = screen.getByRole('button', { name: 'Reservar lugar' });
    expect(reservar).toBeEnabled();
    fireEvent.click(reservar);
    expect(onReservar).toHaveBeenCalledWith(7);

    rerender(
      <ClaseCard
        clase={{ ...claseBase, puedeReservar: false }}
        onReservar={onReservar}
             />
    );
    expect(screen.getByRole('button', { name: 'Reservar lugar' })).toBeDisabled();
  });

  it.each([
    {
      name: 'lista de espera',
      clase: { ...claseBase, cupoDisponible: 0, puedeAnotarseListaEspera: true },
      button: 'Sumarme a la lista de espera',
      callback: 'onListaEspera'
    },
    {
      name: 'aceptación de oferta',
      clase: {
        ...claseBase,
        puedeAceptarOferta: true,
        miInscripcion: {
          estado: 'notificado',
          fechaExpiracionOferta: '2026-11-13T20:30:00.000Z'
        }
      },
      button: 'Aceptar lugar ofrecido',
      callback: 'onAceptarOferta'
    }
  ])('envía la acción correcta para $name', ({ clase, button, callback }) => {
    const onAction = vi.fn();
    render(
      <ClaseCard
        clase={clase}
               {...{ [callback]: onAction }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: button }));

    expect(onAction).toHaveBeenCalledWith(clase.id);
  });

  it('abre el diálogo de confirmación antes de cancelar y no cancela al descartarlo', () => {
    const onCancelar = vi.fn();
    const clase = {
      ...claseBase,
      puedeReservar: false,
      puedeCancelar: true,
      miInscripcion: { estado: 'confirmado' }
    };
    render(<ClaseCard clase={clase} onCancelar={onCancelar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    expect(onCancelar).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(
      'Las reservas confirmadas se pueden cancelar hasta 2 horas antes del inicio. ¿Querés continuar?'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancela la reserva al confirmar en el diálogo', () => {
    const onCancelar = vi.fn();
    const clase = {
      ...claseBase,
      puedeReservar: false,
      puedeCancelar: true,
      miInscripcion: { estado: 'confirmado' }
    };
    render(<ClaseCard clase={clase} onCancelar={onCancelar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onCancelar).toHaveBeenCalledWith(7);
  });

  it('cancela una reserva tardía y advierte la penalidad en el diálogo', () => {
    const onCancelar = vi.fn();
    const clase = {
      ...claseBase,
      puedeReservar: false,
      puedeCancelar: true,
      fechaInicio: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 h antes
      miInscripcion: { estado: 'confirmado' }
    };
    render(<ClaseCard clase={clase} onCancelar={onCancelar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Las reservas confirmadas se pueden cancelar hasta 2 horas antes del inicio.');

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onCancelar).toHaveBeenCalledWith(7);
  });

  it('distingue la oferta pendiente y muestra su vencimiento', () => {
    const fechaExpiracionOferta = '2026-11-13T20:30:00.000Z';
    const { container, rerender } = render(
      <ClaseCard
        clase={{
          ...claseBase,
          miInscripcion: { estado: 'notificado', fechaExpiracionOferta }
        }}
        />
    );
    const card = within(container);
    const estado = card.getByRole('status', { name: 'Estado de inscripción' });

    expect(estado).toHaveTextContent('Oferta pendiente de aceptación');
    expect(estado).toHaveTextContent('Aceptá antes del');
    expect(estado.querySelector('time')).toHaveAttribute('dateTime', fechaExpiracionOferta);
    expect(estado).toHaveClass('estado-notificado');

    rerender(
      <ClaseCard
        clase={{ ...claseBase, miInscripcion: { estado: 'confirmado' } }}
        />
    );
    expect(card.getByRole('status', { name: 'Estado de inscripción' }))
      .toHaveTextContent('Reserva confirmada');
    expect(card.getByText('Confirmado')).toBeInTheDocument();
  });

  it.each([
    {
      estado: 'notificado',
      button: 'Rechazar lugar ofrecido',
      mensaje: '¿Querés rechazar la oferta? El lugar se liberará para otra persona.'
    },
    {
      estado: 'en espera',
      button: 'Salir de la lista de espera',
      mensaje: '¿Querés salir de la lista de espera? Podés hacerlo antes de que comience la clase.'
    }
  ])('explica cómo confirmar la acción para $estado', ({ estado, button, mensaje }) => {
    const onCancelar = vi.fn();
    render(
      <ClaseCard
        clase={{
          ...claseBase,
          puedeCancelar: true,
          miInscripcion: {
            estado,
            ...(estado === 'notificado'
              ? { fechaExpiracionOferta: '2026-11-13T20:30:00.000Z' }
              : {})
          }
        }}
        onCancelar={onCancelar}
        />
    );

    fireEvent.click(screen.getByRole('button', { name: button }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(mensaje);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onCancelar).toHaveBeenCalledWith(7);
  });

  it('explica por qué una reserva confirmada no se puede cancelar', () => {
    const { container } = render(
      <ClaseCard
        clase={{
          ...claseBase,
          puedeCancelar: false,
          miInscripcion: { estado: 'confirmado' }
        }}
             />
    );
    const card = within(container);

    expect(card.getByRole('button', { name: 'Cancelar reserva' })).toBeDisabled();
    expect(card.getByRole('note')).toHaveTextContent(
      'Las reservas confirmadas requieren al menos 2 horas de anticipación'
    );
  });

  it('no permite aceptar una oferta que el backend informa vencida', () => {
    const { rerender } = render(
      <ClaseCard
        clase={{
          ...claseBase,
          puedeAceptarOferta: false,
          miInscripcion: {
            estado: 'notificado',
            fechaExpiracionOferta: '2026-11-13T15:00:00.000Z'
          }
        }}
             />
    );

    expect(screen.getByRole('button', { name: 'Aceptar lugar ofrecido' })).toBeDisabled();

    rerender(
      <ClaseCard
        clase={{ ...claseBase, puedeAceptarOferta: false, miInscripcion: null }}
             />
    );
    expect(screen.queryByRole('button', { name: 'Aceptar lugar ofrecido' }))
      .not.toBeInTheDocument();
  });

  it.each([
    {
      accion: 'reservar',
      clase: claseBase,
      boton: 'Reservando...'
    },
    {
      accion: 'lista-espera',
      clase: { ...claseBase, cupoDisponible: 0, puedeAnotarseListaEspera: true },
      boton: 'Anotando...'
    },
    {
      accion: 'aceptar-oferta',
      clase: {
        ...claseBase,
        puedeAceptarOferta: true,
        miInscripcion: {
          estado: 'notificado',
          fechaExpiracionOferta: '2026-11-13T20:30:00.000Z'
        }
      },
      boton: 'Aceptando...'
    },
    {
      accion: 'cancelar',
      clase: {
        ...claseBase,
        puedeCancelar: true,
        miInscripcion: { estado: 'confirmado' }
      },
      boton: 'Cancelando...'
    }
  ])('deshabilita la acción $accion mientras se procesa', ({ accion, clase, boton }) => {
    const { container } = render(
      <ClaseCard
        clase={clase}
               isActionPending={(nombre) => nombre === accion}
      />
    );

    expect(within(container).getByRole('button', { name: boton })).toBeDisabled();
  });

  it('solicita y muestra inscriptos recibidos por props', () => {
    const onLoadInscriptos = vi.fn();
    const inscriptos = [
      { id: 2, idUsuario: 4, nombreUsuario: 'Socio Test', estado: 'confirmado' }
    ];
    const { container, rerender } = render(
      <ClaseCard
        clase={claseBase}
        modoAdministracion
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onLoadInscriptos={onLoadInscriptos}
      />
    );
    const card = within(container);
    expect(card.getByRole('button', { name: 'Eliminar' })).toBeEnabled();
    fireEvent.click(card.getByRole('button', { name: 'Ver inscriptos' }));

    expect(onLoadInscriptos).toHaveBeenCalledWith(7);

    rerender(
      <ClaseCard
        clase={claseBase}
        modoAdministracion
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onLoadInscriptos={onLoadInscriptos}
        inscriptos={inscriptos}
      />
    );

    expect(screen.getByText('Socio Test')).toBeInTheDocument();
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  it('muestra errores de inscriptos y permite volver a solicitar los datos', () => {
    const onLoadInscriptos = vi.fn();
    const { rerender } = render(
      <ClaseCard
        clase={claseBase}
        modoAdministracion
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onLoadInscriptos={onLoadInscriptos}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver inscriptos' }));
    rerender(
      <ClaseCard
        clase={claseBase}
        modoAdministracion
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onLoadInscriptos={onLoadInscriptos}
        errorInscriptos="No se pudieron cargar los inscriptos."
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudieron cargar los inscriptos.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga' }));
    expect(onLoadInscriptos).toHaveBeenCalledTimes(2);
  });

  it('no muestra inscriptos previos cuando falla una recarga', () => {
    const inscriptosPrevios = [
      { id: 2, idUsuario: 4, nombreUsuario: 'Socio Test', estado: 'confirmado' }
    ];
    const { rerender } = render(
      <ClaseCard
        clase={claseBase}
        modoAdministracion
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onLoadInscriptos={vi.fn()}
        inscriptos={inscriptosPrevios}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver inscriptos' }));
    expect(screen.getByText('Socio Test')).toBeInTheDocument();

    rerender(
      <ClaseCard
        clase={claseBase}
        modoAdministracion
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onLoadInscriptos={vi.fn()}
        inscriptos={inscriptosPrevios}
        errorInscriptos="Error al actualizar inscriptos."
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Error al actualizar inscriptos.');
    expect(screen.queryByText('Socio Test')).not.toBeInTheDocument();
  });

  it('bloquea la eliminación y explica el motivo si hay inscripciones', () => {
    const onDelete = vi.fn();
    const { container } = render(
      <ClaseCard
        clase={{ ...claseBase, tieneInscripciones: true }}
        modoAdministracion
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );

    const card = within(container);
    const eliminar = card.getByRole('button', { name: 'Eliminar' });
    expect(eliminar).toBeDisabled();
    expect(card.getByRole('note')).toHaveTextContent(
      'No se puede eliminar: esta clase tiene inscripciones y su historial debe conservarse.'
    );
    fireEvent.click(eliminar);
    expect(onDelete).not.toHaveBeenCalled();
  });
});
