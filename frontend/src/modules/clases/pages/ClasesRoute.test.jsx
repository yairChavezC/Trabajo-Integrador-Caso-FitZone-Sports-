import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSede } from '../../../shared/context/SedeContext';
import { getRolClases } from '../services/claseService';
import ClasesRoute from './ClasesRoute';

vi.mock('../../../shared/context/SedeContext', () => ({
  useSede: vi.fn()
}));

vi.mock('../services/claseService', () => ({
  getRolClases: vi.fn()
}));

vi.mock('./ClasesScreen', () => ({
  default: () => <div>Gestión de clases</div>
}));

vi.mock('./AgendaClasesScreen', () => ({
  default: ({ puedeInscribirse }) => (
    <div>{puedeInscribirse ? 'Agenda del socio' : 'Agenda de solo lectura'}</div>
  )
}));

beforeEach(() => {
  vi.clearAllMocks();
  useSede.mockReturnValue({
    sedeSeleccionada: { id: 4, nombre: 'Centro' },
    sedes: [{ id: 4, nombre: 'Centro' }],
    cargando: false
  });
});

afterEach(cleanup);

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/clases']}>
      <Routes>
        <Route path="/clases" element={<ClasesRoute />} />
        <Route path="/canchas" element={<p>Redirigido a canchas</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ClasesRoute', () => {
  it('muestra la carga y luego habilita la gestión para el gerente', async () => {
    let resolverRol;
    getRolClases.mockReturnValue(new Promise((resolve) => {
      resolverRol = resolve;
    }));

    renderRoute();

    expect(screen.getByText('Cargando permisos de clases...')).toBeInTheDocument();
    await act(async () => resolverRol({ tipo: 'gerente' }));

    expect(await screen.findByText('Gestión de clases')).toBeInTheDocument();
  });

  it('permite al socio acceder a su agenda con acciones de inscripción', async () => {
    getRolClases.mockResolvedValue({ tipo: 'socio' });

    renderRoute();

    expect(await screen.findByText('Agenda del socio')).toBeInTheDocument();
  });

  it('permite al recepcionista gestionar únicamente con su sede seleccionada', async () => {
    getRolClases.mockResolvedValue({ tipo: 'recepcionista', idSede: 4 });

    renderRoute();

    expect(await screen.findByText('Gestión de clases')).toBeInTheDocument();
  });

  it('no habilita la administración si la sede seleccionada no es la asignada', async () => {
    useSede.mockReturnValue({
      sedeSeleccionada: { id: 2, nombre: 'Norte' },
      sedes: [
        { id: 2, nombre: 'Norte' },
        { id: 4, nombre: 'Centro' }
      ],
      cargando: false
    });
    getRolClases.mockResolvedValue({ tipo: 'recepcionista', idSede: 4 });

    renderRoute();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Seleccioná Centro en el selector de sedes para gestionar su agenda.'
    );
    expect(screen.queryByText('Gestión de clases')).not.toBeInTheDocument();
  });

  it('redirige al cliente externo a canchas', async () => {
    getRolClases.mockResolvedValue({ tipo: 'cliente_externo' });

    renderRoute();

    expect(await screen.findByText('Redirigido a canchas')).toBeInTheDocument();
  });

  it('muestra un error accesible cuando falla la consulta del rol', async () => {
    getRolClases.mockRejectedValue(new Error('Servicio no disponible.'));

    renderRoute();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar el rol: Servicio no disponible.'
    );
  });
});
