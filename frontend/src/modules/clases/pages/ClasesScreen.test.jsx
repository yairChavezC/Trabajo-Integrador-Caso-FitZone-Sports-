import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClasesScreen from './ClasesScreen';
import { useClases } from '../hooks/useClases';
import { useSede } from '../../../shared/context/SedeContext';

vi.mock('../hooks/useClases', () => ({
  useClases: vi.fn()
}));

vi.mock('../../../shared/context/SedeContext', () => ({
  useSede: vi.fn()
}));

const sedeSeleccionada = { id: 1, nombre: 'Centro' };

const fechaFutura = (horasAdelante) => (
  new Date(Date.now() + horasAdelante * 60 * 60 * 1000).toISOString()
);

const claseExistente = {
  id: 22,
  idSede: 1,
  nombre: 'Pilates',
  profesor: 'Laura Pérez',
  cupo: 10,
  cupoDisponible: 10,
  tieneInscripciones: false,
  sede: 'Centro',
  fechaInicio: fechaFutura(24),
  fechaFin: fechaFutura(25)
};

const createActions = () => ({
  addClase: vi.fn(),
  editClase: vi.fn(),
  removeClase: vi.fn(),
  isActionPending: vi.fn(() => false),
  inscriptosPorClase: {},
  cargandoInscriptosPorClase: {},
  errorInscriptosPorClase: {},
  cargarInscriptos: vi.fn()
});

let actions;

beforeEach(() => {
  vi.clearAllMocks();
  actions = createActions();
  useSede.mockReturnValue({
    sedeSeleccionada,
    sedes: [sedeSeleccionada],
    cargando: false
  });
  useClases.mockReturnValue({
    clases: [],
    loading: false,
    error: null,
    actionError: null,
    ...actions
  });
});

afterEach(() => {
  cleanup();
});

function fillForm() {
  const inicio = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  const localValue = (date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };
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
    target: { value: localValue(inicio) }
  });
  fireEvent.change(screen.getByLabelText('Fin'), {
    target: { value: localValue(fin) }
  });
}

describe('ClasesScreen formulario', () => {
  it('mantiene el formulario visible si falla la actualización después de cargar', () => {
    useClases.mockReturnValue({
      clases: [],
      loading: false,
      hasLoaded: true,
      error: 'Fallo temporal de conexión.',
      actionError: null,
      ...actions
    });

    render(<ClasesScreen />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo actualizar la agenda de clases'
    );
    expect(screen.getByRole('heading', { name: 'Administrar agenda' })).toBeVisible();
    expect(screen.getByLabelText('Disciplina / nombre')).toBeVisible();
  });

  it('conserva los datos cuando falla la creación', async () => {
    actions.addClase.mockResolvedValue(null);
    const { container } = render(<ClasesScreen />);
    const form = within(container);
    fillForm();

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => expect(actions.addClase).toHaveBeenCalledTimes(1));
    expect(form.getByLabelText('Disciplina / nombre')).toHaveValue('Yoga');
    expect(form.getByLabelText('Instructor')).toHaveValue('Ana García');
    expect(form.getByLabelText('Cupo máximo')).toHaveValue(12);
  });

  it('conserva los datos y el modo de edición cuando falla la modificación', async () => {
    actions.editClase.mockResolvedValue(null);
    useClases.mockReturnValue({
      clases: [claseExistente],
      loading: false,
      error: null,
      actionError: null,
      ...actions
    });
    const { container } = render(<ClasesScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Disciplina / nombre'), {
      target: { value: 'Pilates reformer' }
    });

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => expect(actions.editClase).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Disciplina / nombre')).toHaveValue('Pilates reformer');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
    });
  });

  it('reinicia el formulario después de crear correctamente', async () => {
    actions.addClase.mockResolvedValue({ id: 23 });
    const { container } = render(<ClasesScreen />);
    fillForm();

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(screen.getByLabelText('Disciplina / nombre')).toHaveValue('');
    });
    expect(screen.getByLabelText('Instructor')).toHaveValue('');
    expect(screen.getByLabelText('Cupo máximo')).toHaveValue(null);
    expect(screen.getByLabelText('Inicio')).toHaveValue('');
    expect(screen.getByLabelText('Fin')).toHaveValue('');
  });

  it('reinicia el formulario después de modificar correctamente', async () => {
    actions.editClase.mockResolvedValue({ id: claseExistente.id });
    useClases.mockReturnValue({
      clases: [claseExistente],
      loading: false,
      error: null,
      actionError: null,
      ...actions
    });
    const { container } = render(<ClasesScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Disciplina / nombre'), {
      target: { value: 'Pilates reformer' }
    });

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(screen.getByLabelText('Disciplina / nombre')).toHaveValue('');
    });
    expect(actions.editClase).toHaveBeenCalledWith(
      claseExistente.id,
      expect.objectContaining({ nombre: 'Pilates reformer' })
    );
    expect(screen.getByRole('button', { name: 'Crear clase' })).toBeInTheDocument();
  });

  it('conecta cargarInscriptos y el estado de inscriptos hacia la tabla', () => {
    const inscriptos = [
      { id: 10, idUsuario: 5, nombreUsuario: 'Socio Inscripto', estado: 'confirmado' }
    ];
    useClases.mockReturnValue({
      clases: [claseExistente],
      loading: false,
      error: null,
      actionError: null,
      ...actions,
      inscriptosPorClase: { [claseExistente.id]: inscriptos }
    });

    render(<ClasesScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Ver inscriptos' }));

    expect(actions.cargarInscriptos).toHaveBeenCalledWith(claseExistente.id);
    expect(screen.getByText('Socio Inscripto')).toBeInTheDocument();
  });
});
