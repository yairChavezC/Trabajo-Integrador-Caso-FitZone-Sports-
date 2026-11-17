import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useHistorialSocio } from '../hooks/UseHistorialSocio';
import { HistorialAccesosTable } from '../components/HistorialAccesosTable';
import { httpClient } from '../../../core/api/httpClient';
import './AccesoScreen.css';

export const SocioDashboard = () => {
  const { usuario: usuarioContext } = useAuth();
  const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || '{}');
  const usuario = usuarioContext || usuarioLocal;
  const userId = usuario?.id || 10;

  const { historial: historialAccesosRaw, loading: loadingAccesos } = useHistorialSocio();
  const historialAccesos = historialAccesosRaw ? historialAccesosRaw.slice(0, 5) : [];

  const [canchasReservadas, setCanchasReservadas] = useState([]);
  const [clasesReservadas, setClasesReservadas] = useState([]);
  const [loadingCanchas, setLoadingCanchas] = useState(true);
  const [loadingClases, setLoadingClases] = useState(true);

  useEffect(() => {
    const fetchActividadExtra = async () => {
      try {
        const resCanchas = await httpClient.get('/reservas-canchas/mis-reservas').catch(() => ({ data: [] }));
        const dataCanchas = resCanchas?.data?.data || resCanchas?.data || [];
        setCanchasReservadas(Array.isArray(dataCanchas) ? dataCanchas.slice(0, 5) : []);
      } catch (e) {
        setCanchasReservadas([]);
      } finally {
        setLoadingCanchas(false);
      }

      try {
        const resClases = await httpClient.get('/clases/mis-inscripciones').catch(() => ({ data: [] }));
        const dataClases = resClases?.data?.data || resClases?.data || [];
        setClasesReservadas(Array.isArray(dataClases) ? dataClases.slice(0, 5) : []);
      } catch (e) {
        setClasesReservadas([]);
      } finally {
        setLoadingClases(false);
      }
    };

    fetchActividadExtra();
  }, [userId]);

  const obtenerClaseEstadoReserva = (estado) => {
    if (estado === 'cancelada') return 'acceso-badge acceso-badge--danger';
    if (estado === 'pendiente') return 'acceso-badge acceso-badge--warning';
    return 'acceso-badge acceso-badge--success';
  };

  return (
    <div className="socio-dashboard-container">
      <header className="socio-dashboard-header">
        <h1 className="acceso-title">Mi Actividad en FitZone</h1>
        <p className="acceso-subtitle">
          Socio: <strong className="socio-dashboard-meta">{usuario?.nombre || 'Socio'}</strong> · DNI:{' '}
          <strong className="socio-dashboard-meta">{usuario?.dni || '---'}</strong>
        </p>
      </header>

      <div className="socio-dashboard-grid">
        <section className="socio-section-card">
          <div className="socio-section-header">
            <h2 className="socio-section-title">🚪 Últimos Accesos (Entradas y Salidas)</h2>
            <p className="socio-section-subtitle">Tus últimos 5 registros de molinete.</p>
          </div>
          <HistorialAccesosTable historial={historialAccesos} loading={loadingAccesos} />
        </section>

        <section className="socio-section-card">
          <div className="socio-section-header">
            <h2 className="socio-section-title">🎾 Canchas Reservadas</h2>
            <p className="socio-section-subtitle">Tus últimas 5 reservas de canchas.</p>
          </div>

          <div className="socio-table-wrapper">
            <table className="acceso-history-table">
              <thead>
                <tr>
                  <th>Cancha</th>
                  <th>Turno</th>
                  <th className="acceso-text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loadingCanchas ? (
                  <tr>
                    <td colSpan="3" className="acceso-history-empty">Cargando canchas...</td>
                  </tr>
                ) : canchasReservadas.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="acceso-history-empty">No tenés canchas reservadas.</td>
                  </tr>
                ) : (
                  canchasReservadas.map((c) => {
                    const estadoText = c.estado ? c.estado.charAt(0).toUpperCase() + c.estado.slice(1) : 'Confirmada';
                    return (
                      <tr key={c.id}>
                        <td className="acceso-history-time">{c.nombreCancha || 'Cancha'}</td>
                        <td className="acceso-history-event">
                          {c.fechaInicio
                            ? new Date(c.fechaInicio).toLocaleString('es-AR', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })
                            : '---'}
                        </td>
                        <td className="acceso-text-right">
                          <span className={obtenerClaseEstadoReserva(c.estado)}>{estadoText}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="socio-section-card socio-section-card--full">
          <div className="socio-section-header">
            <h2 className="socio-section-title">🧘‍♂️ Clases Grupales Inscriptas</h2>
            <p className="socio-section-subtitle">Tus últimas 5 inscripciones a clases grupales.</p>
          </div>

          <div className="socio-table-wrapper">
            <table className="acceso-history-table">
              <thead>
                <tr>
                  <th>Clase / Actividad</th>
                  <th>Profesor</th>
                  <th>Horario</th>
                  <th className="acceso-text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loadingClases ? (
                  <tr>
                    <td colSpan="4" className="acceso-history-empty">Cargando clases...</td>
                  </tr>
                ) : clasesReservadas.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="acceso-history-empty">No estás inscripto en ninguna clase grupal.</td>
                  </tr>
                ) : (
                  clasesReservadas.map((cl) => (
                    <tr key={cl.id}>
                      <td className="acceso-history-time">{cl.nombre_clase || cl.titulo || 'Clase'}</td>
                      <td className="acceso-history-event">{cl.profesor || '---'}</td>
                      <td className="acceso-history-event">{cl.horario || '---'}</td>
                      <td className="acceso-text-right">
                        <span className="acceso-badge acceso-badge--info">Inscripto</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};