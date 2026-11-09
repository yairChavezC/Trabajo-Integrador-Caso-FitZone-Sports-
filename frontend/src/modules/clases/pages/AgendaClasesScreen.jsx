import { useEffect, useState } from 'react';
import { useClases } from '../hooks/useClases';
import ClaseTable from '../components/ClaseTable';
import {
  getNotificacionesClases,
  marcarNotificacionClaseLeida
} from '../services/claseService';
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
    aceptarOferta,
    isActionPending
  } = useClases();
  const [tab, setTab] = useState('todas');
  const [notificaciones, setNotificaciones] = useState([]);
  const [errorNotificaciones, setErrorNotificaciones] = useState(null);
  const [marcandoLeida, setMarcandoLeida] = useState(null);

  useEffect(() => {
    if (!puedeInscribirse) return undefined;
    let activo = true;

    const cargarNotificaciones = () => {
      getNotificacionesClases()
        .then((data) => {
          if (activo) {
            setNotificaciones(Array.isArray(data) ? data : []);
            setErrorNotificaciones(null);
          }
        })
        .catch((err) => {
          if (activo) setErrorNotificaciones(err.message);
        });
    };

    cargarNotificaciones();
    const intervalId = window.setInterval(cargarNotificaciones, 30000);

    return () => {
      activo = false;
      window.clearInterval(intervalId);
    };
  }, [puedeInscribirse]);

  const marcarLeida = async (id) => {
    try {
      setMarcandoLeida(id);
      setErrorNotificaciones(null);
      const actualizada = await marcarNotificacionClaseLeida(id);
      setNotificaciones((actuales) =>
        actuales.map((notificacion) => notificacion.id === actualizada.id ? actualizada : notificacion)
      );
    } catch (err) {
      setErrorNotificaciones(err.message);
    } finally {
      setMarcandoLeida(null);
    }
  };

  const misInscripcionesCount = clases.filter((c) => Boolean(c.miInscripcion)).length;
  const clasesFiltradas = tab === 'mis-clases'
    ? clases.filter((c) => Boolean(c.miInscripcion))
    : clases;

  if (loading && clases.length === 0) {
    return <p className="clases-empty">Cargando agenda de clases...</p>;
  }
  if (error) return <p className="clases-alert">Error: {error}</p>;

  return (
    <main className="clases-container">
      <header className="clases-header">
        <h2>Agenda de clases grupales</h2>
        <p>Consultá horarios, instructores y lugares disponibles en la sede seleccionada.</p>
      </header>

      {actionError && <div className="clases-alert" role="alert">{actionError}</div>}

      {puedeInscribirse && (
        <section aria-labelledby="notificaciones-clases-title" className="clases-notificaciones">
          <div className="clases-section-heading">
            <div>
              <h3 id="notificaciones-clases-title">Notificaciones</h3>
              <p>Avisos sobre lugares liberados en clases grupales.</p>
            </div>
          </div>
          {errorNotificaciones && <div className="clases-alert" role="alert">{errorNotificaciones}</div>}
          {notificaciones.length === 0 ? (
            <p className="clases-empty">No tenés notificaciones de clases.</p>
          ) : (
            <ul className="clases-notificaciones-lista">
              {notificaciones.map((notificacion) => (
                <li
                  key={notificacion.id}
                  className={notificacion.leidaAt ? 'clases-notificacion leida' : 'clases-notificacion'}
                >
                  <p>{notificacion.mensaje}</p>
                  <time dateTime={notificacion.creadaAt}>
                    {new Date(notificacion.creadaAt).toLocaleString('es-AR')}
                  </time>
                  {notificacion.leidaAt ? (
                    <span>Leída</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => marcarLeida(notificacion.id)}
                      disabled={marcandoLeida === notificacion.id}
                    >
                      {marcandoLeida === notificacion.id ? 'Guardando...' : 'Marcar como leída'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="agenda-clases-title">
        <div className="clases-tabs agenda-tabs" role="tablist">
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
          isActionPending={isActionPending}
        />
      </section>
    </main>
  );
}
