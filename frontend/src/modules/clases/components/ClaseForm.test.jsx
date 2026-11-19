import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClaseForm from './ClaseForm';

const initialFormData = {
  idSede: '1',
  nombre: '',
  profesor: '',
  cupo: '',
  fechaInicio: '',
  fechaFin: ''
};

afterEach(() => {
  cleanup();
});

const dateTimeLocal = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

function FormHarness({
  onSubmit = vi.fn(),
  initialData = initialFormData,
  isEditing = false,
  fechaInicioOriginal = ''
}) {
  const [formData, setFormData] = useState(initialData);

  return (
    <ClaseForm
      formData={formData}
      setFormData={setFormData}
      onSubmit={onSubmit}
      isEditing={isEditing}
      fechaInicioOriginal={fechaInicioOriginal}
      sedes={[{ id: 1, nombre: 'Centro' }]}
    />
  );
}

function fillValidFields() {
  const inicio = new Date(Date.now() + 10 * 60 * 1000);
  inicio.setSeconds(0, 0);
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  fireEvent.change(screen.getByLabelText('Disciplina / nombre'), {
    target: { value: 'Yoga' }
  });
  fireEvent.change(screen.getByLabelText('Instructor'), {
    target: { value: 'Ana García' }
  });
  fireEvent.change(screen.getByLabelText('Cupo máximo'), {
    target: { value: '12' }
  });
  fireEvent.change(screen.getByLabelText('Inicio'), {
    target: { value: dateTimeLocal(inicio) }
  });
  fireEvent.change(screen.getByLabelText('Fin'), {
    target: { value: dateTimeLocal(fin) }
  });
}

describe('ClaseForm', () => {
  it.each([
    { modo: 'creación', isEditing: false },
    { modo: 'edición', isEditing: true }
  ])('envía los datos válidos en modo $modo', ({ isEditing }) => {
    const onSubmit = vi.fn();
    const initialData = isEditing
      ? {
          ...initialFormData,
          nombre: 'Pilates',
          profesor: 'Ana García',
          cupo: '12',
          fechaInicio: dateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
          fechaFin: dateTimeLocal(new Date(Date.now() + 2 * 60 * 60 * 1000))
        }
      : initialFormData;
    const { container } = render(
      <FormHarness onSubmit={onSubmit} isEditing={isEditing} initialData={initialData} />
    );

    if (!isEditing) fillValidFields();

    for (const label of ['Sede', 'Disciplina / nombre', 'Instructor', 'Cupo máximo', 'Inicio', 'Fin']) {
      expect(screen.getByLabelText(label)).toBeRequired();
    }

    fireEvent.submit(container.querySelector('form'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('impide enviar un inicio pasado y muestra una explicación', () => {
    const onSubmit = vi.fn();
    const { container } = render(<FormHarness onSubmit={onSubmit} />);
    fillValidFields();
    fireEvent.change(screen.getByLabelText('Inicio'), {
      target: { value: '2000-01-01T10:00' }
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La fecha de inicio debe ser futura.'
    );
    expect(screen.getByLabelText('Inicio')).toHaveAttribute('min');
    fireEvent.submit(container.querySelector('form'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('permite editar otros datos sin cambiar el inicio de una clase pasada', () => {
    const onSubmit = vi.fn();
    const fechaInicioOriginal = '2000-01-01T10:00';
    const initialData = {
      idSede: '1',
      nombre: 'Yoga',
      profesor: 'Ana García',
      cupo: '12',
      fechaInicio: fechaInicioOriginal,
      fechaFin: '2000-01-01T11:00'
    };
    const { container } = render(
      <FormHarness
        onSubmit={onSubmit}
        initialData={initialData}
        isEditing
        fechaInicioOriginal={fechaInicioOriginal}
      />
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.submit(container.querySelector('form'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('exige que la fecha de finalización sea posterior a la de inicio', () => {
    const onSubmit = vi.fn();
    const { container } = render(<FormHarness onSubmit={onSubmit} />);
    fillValidFields();
    const inicio = screen.getByLabelText('Inicio').value;
    fireEvent.change(screen.getByLabelText('Fin'), {
      target: { value: inicio }
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La fecha de finalización debe ser posterior a la de inicio.'
    );
    fireEvent.submit(container.querySelector('form'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', '1.5'])(
    'impide enviar un cupo no válido (%s)',
    (cupo) => {
      const onSubmit = vi.fn();
      const { container } = render(<FormHarness onSubmit={onSubmit} />);
      fillValidFields();
      fireEvent.change(screen.getByLabelText('Cupo máximo'), {
        target: { value: cupo }
      });

      expect(screen.getByRole('alert')).toHaveTextContent(
        'El cupo debe ser un entero positivo.'
      );
      fireEvent.submit(container.querySelector('form'));

      expect(onSubmit).not.toHaveBeenCalled();
    }
  );
});
