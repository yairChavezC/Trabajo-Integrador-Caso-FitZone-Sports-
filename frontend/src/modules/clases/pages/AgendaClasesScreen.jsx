import { useEffect, useRef, useState } from 'react';
import { useClases } from '../hooks/useClases';
import { useSede } from '../../../shared/context/SedeContext';
import ClaseTable from '../components/ClaseTable';
import { formatoFechaHora } from '../utils/claseUtils';
import {
  getNotificacionesClases,
  marcarNotificacionClaseLeida
} from '../services/claseService';
import './ClasesScreen.css';

const getEstadoOfertaNotificacion = (notificacion) => {
  if (notificacion.ofertaVencida || notificacion.estadoInscripcion === 'expirado') {
    return { texto: 'Oferta vencida', clase: 'vencida' };
  }
  if (notificacion.estadoInscripcion === 'notificado') {
    return { texto: 'Oferta pendiente', clase: 'pendiente' };
  }
  if (notificacion.estadoInscripcion === 'confirmado') {
    return { texto: 'Lugar confirmado', clase: 'confirmada' };
  }
  if (notificacion.estadoInscripcion === 'cancelado') {
    return { texto: 'Oferta rechazada', clase: 'rechazada' };
  }
  return null;
};

export default function AgendaClasesScreen({ puedeInscribirse = false }) {
  const { sedeSeleccionada } = useSede();
  const [tab, setTab] = useState('todas');
  const tabRefs = useRef({});
  const [verTodasLasSedes, setVerTodasLasSedes] = useState(false);
  const {
    clases,
    loading,
    hasLoaded,
    error,
    actionError,
    reservar,
    cancelar,
    listaEspera,
    aceptarOferta,
    isActionPending
  } = useClases(puedeInscribirse
    ? { idSede: verTodasLasSedes ? null : sedeSeleccionada?.id ?? null }
    : {});
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionesCargadas, setNotificacionesCargadas] = useState(false);
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
            setNotificacionesCargadas(true);
          }
        })
        .catch((err) => {
          if (activo) {
            setErrorNotificaciones(err.message);
            setNotificacionesCargadas(true);
          }
        });
    };

    cargarNotificaciones();
    const intervalId = window.setInterval(cargarNotificaciones, 30000);

    return () => {
      activo = false;
      window.clearInterval(intervalId);
    };
  }, [puedeInscribirse]);

  const manejarTeclasTab = (event) => {
    const tabs = ['todas', 'mis-clases'];
    const indiceActual = tabs.indexOf(event.currentTarget.dataset.tab);
    let indiceSiguiente;

    switch (event.key) {
      case 'ArrowRight':
        indiceSiguiente = (indiceActual + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        indiceSiguiente = (indiceActual - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        indiceSiguiente = 0;
        break;
      case 'End':
        indiceSiguiente = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const siguienteTab = tabs[indiceSiguiente];
    setTab(siguienteTab);
    tabRefs.current[siguienteTab]?.focus();
  };

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
  const agendaCargada = hasLoaded || clases.length > 0;

  if (loading && !agendaCargada) {
    return <p className="clases-empty" role="status">Cargando agenda de clases...</p>;
  }
  if (error && !agendaCargada) {
    return (
      <div className="clases-container">
        <p className="clases-alert" role="alert">No se pudo cargar la agenda de clases: {error}</p>
      </div>
    );
  }

  return (
    <div className="clases-container" aria-busy={loading} data-testid="agenda-contenedor">
      <header className="clases-header">
        <h2>Agenda de clases grupales</h2>
        <p>Consultá horarios, instructores y lugares disponibles en la sede seleccionada o en todas las sedes.</p>
      </header>

      {loading && (
        <p className="clases-empty" role="status">Actualizando agenda de clases...</p>
      )}
      {error && (
        <div className="clases-alert" role="alert">
          No se pudo actualizar la agenda de clases. Se conserva el estado cargado: {error}
        </div>
      )}
      {actionError && <div className="clases-alert" role="alert">{actionError}</div>}

      {puedeInscribirse && (
        <section aria-labelledby="notificaciones-clases-title" className="clases-notificaciones">
          <div className="clases-section-heading">
            <div>
              <h3 id="notificaciones-clases-title">Notificaciones</h3>
              <p>Avisos sobre lugares liberados en clases grupales.</p>
            </div>
          </div>
          {errorNotificaciones && (
            <div className="clases-alert" role="alert">
              No se pudieron cargar o actualizar las notificaciones: {errorNotificaciones}
            </div>
          )}
          {!notificacionesCargadas && notificaciones.length === 0 ? (
            <p className="clases-empty" role="status">Cargando notificaciones...</p>
          ) : notificaciones.length === 0 && !errorNotificaciones ? (
            <p className="clases-empty" role="status">No tenés notificaciones de clases.</p>
          ) : notificaciones.length > 0 ? (
            <ul className="clases-notificaciones-lista">
              {notificaciones.map((notificacion) => {
                const estadoOferta = getEstadoOfertaNotificacion(notificacion);
                const ofertaVencida = estadoOferta?.clase === 'vencida';
                const mostrarVencimiento = notificacion.fechaExpiracionOferta
                  && ['notificado', 'expirado'].includes(notificacion.estadoInscripcion);

                return (
                  <li
                    key={notificacion.id}
                    className={notificacion.leidaAt ? 'clases-notificacion leida' : 'clases-notificacion'}
                  >
                    <p>{notificacion.mensaje}</p>
                    {estadoOferta && (
                      <span className={`clases-notificacion-estado ${estadoOferta.clase}`}>
                        {estadoOferta.texto}
                      </span>
                    )}
                    {mostrarVencimiento && (
                      <p className="clases-notificacion-vencimiento">
                        {ofertaVencida ? 'Oferta vencida el ' : 'Oferta vigente hasta '}
                        <time dateTime={notificacion.fechaExpiracionOferta}>
                          {formatoFechaHora(notificacion.fechaExpiracionOferta)}
                        </time>
                        .
                      </p>
                    )}
                    <time dateTime={notificacion.creadaAt}>
                      {formatoFechaHora(notificacion.creadaAt)}
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
                );
              })}
            </ul>
          ) : null}
        </section>
      )}

      <section aria-label="Agenda de clases">
        {puedeInscribirse && (
          <label className="clases-filtro-sede">
            Mostrar clases de
            <select
              aria-label="Filtrar por sede"
              value={verTodasLasSedes ? 'todas' : 'seleccionada'}
              onChange={(event) => setVerTodasLasSedes(event.target.value === 'todas')}
            >
              <option value="seleccionada">
                {sedeSeleccionada
                  ? `Sede seleccionada: ${sedeSeleccionada.nombre}`
                  : 'Sede seleccionada'}
              </option>
              <option value="todas">Todas las sedes</option>
            </select>
          </label>
        )}
        <div className="clases-tabs agenda-tabs" role="tablist" aria-label="Vistas de clases">
          <button
            type="button"
            role="tab"
            id="agenda-tab-todas"
            aria-controls="agenda-panel-todas"
            aria-selected={tab === 'todas'}
            tabIndex={tab === 'todas' ? 0 : -1}
            data-tab="todas"
            ref={(element) => { tabRefs.current.todas = element; }}
            onKeyDown={manejarTeclasTab}
            className={tab === 'todas' ? 'active' : ''}
            onClick={() => setTab('todas')}
          >
            Todas las clases ({clases.length})
          </button>
          <button
            type="button"
            role="tab"
            id="agenda-tab-mis-clases"
            aria-controls="agenda-panel-mis-clases"
            aria-selected={tab === 'mis-clases'}
            tabIndex={tab === 'mis-clases' ? 0 : -1}
            data-tab="mis-clases"
            ref={(element) => { tabRefs.current['mis-clases'] = element; }}
            onKeyDown={manejarTeclasTab}
            className={tab === 'mis-clases' ? 'active' : ''}
            onClick={() => setTab('mis-clases')}
          >
            Mis reservas / En espera ({misInscripcionesCount})
          </button>
        </div>

        {['todas', 'mis-clases'].map((vista) => {
          const activa = tab === vista;
          const clasesDeVista = vista === 'mis-clases'
            ? clases.filter((clase) => Boolean(clase.miInscripcion))
            : clases;
          const titulo = vista === 'mis-clases' ? 'Mis clases programadas' : 'Próximas clases';

          return (
            <div
              key={vista}
              id={`agenda-panel-${vista}`}
              role="tabpanel"
              aria-labelledby={`agenda-tab-${vista}`}
              tabIndex={0}
              hidden={!activa}
            >
              {activa && (
                <>
                  <div className="clases-section-heading">
                    <div>
                      <h3>{titulo}</h3>
                      <p>
                        {vista === 'mis-clases'
                          ? 'Consultá el estado de tus reservas confirmadas, lugares en espera y ofertas temporales.'
                          : 'Podés reservar durante las 48 horas previas al inicio. Si no hay lugares, anotate en la lista de espera.'}
                      </p>
                    </div>
                  </div>
                  {clasesDeVista.length === 0 ? (
                    <p className="clases-empty" role="status">
                      {vista === 'mis-clases'
                        ? 'Todavía no tenés reservas, lugares en espera ni ofertas en esta agenda.'
                        : verTodasLasSedes
                          ? 'No hay clases próximas disponibles en las sedes consultadas.'
                          : 'No hay clases próximas disponibles para la sede seleccionada.'}
                    </p>
                  ) : (
                    <ClaseTable
                      clases={clasesDeVista}
                      onReservar={reservar}
                      onCancelar={cancelar}
                      onListaEspera={listaEspera}
                      onAceptarOferta={aceptarOferta}
                      isActionPending={isActionPending}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
