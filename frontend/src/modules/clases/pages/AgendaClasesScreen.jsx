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
        <div className="clases-section-heading">
          <div>
            <h3 id="agenda-clases-title">Próximas clases</h3>
            <p>Podés reservar durante las 48 horas previas al inicio. Si no hay lugares, anotate en la lista de espera.</p>
          </div>
        </div>
        <ClaseTable
          clases={clases}
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
