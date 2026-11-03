import { useState } from 'react';
import { useClases } from '../hooks/useClases';
import ClaseTable from '../components/ClaseTable';
import './ClasesScreen.css';

export default function AgendaClasesScreen({ puedeInscribirse = false }) {
  const {
    clases,
    loading,
    error,
    actionError,
    reservar,
    cancelar,
    listaEspera,
    aceptarOferta
  } = useClases();
  const [tab, setTab] = useState('todas');

  const misInscripcionesCount = clases.filter((c) => Boolean(c.miInscripcion)).length;
  const clasesFiltradas = tab === 'mis-clases'
    ? clases.filter((c) => Boolean(c.miInscripcion))
    : clases;

  if (loading) return <p className="clases-empty">Cargando agenda de clases...</p>;
  if (error) return <p className="clases-alert">Error: {error}</p>;

  return (
    <main className="clases-container">
      <header className="clases-header">
        <h2>Agenda de clases grupales</h2>
        <p>Consultá horarios, instructores y lugares disponibles en la sede seleccionada.</p>
      </header>

      {actionError && <div className="clases-alert" role="alert">{actionError}</div>}

      <section aria-labelledby="agenda-clases-title">
        <div className="clases-tabs" role="tablist" style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'todas'}
            className={tab === 'todas' ? 'active' : ''}
            onClick={() => setTab('todas')}
          >
            Todas las clases ({clases.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'mis-clases'}
            className={tab === 'mis-clases' ? 'active' : ''}
            onClick={() => setTab('mis-clases')}
          >
            Mis reservas / En espera ({misInscripcionesCount})
          </button>
        </div>

        <div className="clases-section-heading">
          <div>
            <h3 id="agenda-clases-title">
              {tab === 'mis-clases' ? 'Mis clases programadas' : 'Próximas clases'}
            </h3>
            <p>
              {tab === 'mis-clases'
                ? 'Consultá el estado de tus reservas confirmadas, lugares en espera y ofertas temporales.'
                : 'Podés reservar durante las 48 horas previas al inicio. Si no hay lugares, anotate en la lista de espera.'}
            </p>
          </div>
        </div>
        <ClaseTable
          clases={clasesFiltradas}
          soloLectura={!puedeInscribirse}
          onReservar={reservar}
          onCancelar={cancelar}
          onListaEspera={listaEspera}
          onAceptarOferta={aceptarOferta}
        />
      </section>
    </main>
  );
}
