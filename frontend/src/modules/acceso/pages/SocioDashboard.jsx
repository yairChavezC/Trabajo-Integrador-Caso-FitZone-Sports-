import React from 'react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useHistorialSocio } from '../hooks/UseHistorialSocio';
import { HistorialAccesosTable } from '../components/HistorialAccesosTable';
import { accesoService } from '../services/accesoService';
import './AccesoScreen.css';

const resolverEstadoClase = (cl) => {
  const estadoRaw = (cl.estado || 'confirmado').toLowerCase().trim();
  const fechaRef = cl.fechaFin || cl.fechaInicio;
  const yaPaso = fechaRef ? new Date(fechaRef) < new Date() : false;

  if (estadoRaw === 'cancelado' || estadoRaw === 'expirado' || estadoRaw === 'no_elegible') {
    return { texto: 'Cancelada', claseBadge: 'acceso-badge acceso-badge--danger' };
  }
  if (estadoRaw === 'en espera' || estadoRaw === 'notificado') {
    return {
      texto: yaPaso ? 'Cerrada' : 'En espera',
      claseBadge: 'acceso-badge acceso-badge--warning'
    };
  }
  if (yaPaso) {
    return { texto: 'Finalizada', claseBadge: 'acceso-badge acceso-badge--info' };
  }
  return { texto: 'Confirmada', claseBadge: 'acceso-badge acceso-badge--success' };
};

export const SocioDashboard = () => {
  const { usuario: usuarioContext } = useAuth();
  const usuario = usuarioContext || accesoService.obtenerUsuarioActual();

  const {
    historial: historialAccesosRaw,
    canchasReservadas,
    clasesReservadas,
    loading: loadingAccesos,
    loadingCanchas,
    loadingClases
  } = useHistorialSocio();

  const historialAccesos = historialAccesosRaw ? historialAccesosRaw.slice(0, 5) : [];

  const obtenerClaseEstadoReserva = (estado) => {
    if (estado === 'cancelada') return 'acceso-badge acceso-badge--danger';
    if (estado === 'pendiente') return 'acceso-badge acceso-badge--warning';
    return 'acceso-badge acceso-badge--success';
  };

  return (
    <div className="socio-dashboard-container">
      <header className="socio-dashboard-header">
        <div>
          <h1 className="acceso-title">Mi Actividad</h1>
          <p className="acceso-subtitle">
            Resumen de tus últimos ingresos, reservas de canchas y clases grupales
          </p>
        </div>
        <div className="socio-user-pill">
          <span>{usuario?.nombre || 'Socio'}</span>
          {usuario?.dni && <span className="socio-user-dni">DNI {usuario.dni}</span>}
        </div>
      </header>

      <div className="socio-dashboard-grid">
        {/* Tabla 1: Últimos Accesos */}
        <section className="socio-section-card">
          <div className="socio-section-header">
            <h2 className="socio-section-title">Últimos Accesos</h2>
            <span className="socio-section-count">{historialAccesos.length} registros</span>
          </div>
          <HistorialAccesosTable
            historial={historialAccesos}
            loading={loadingAccesos}
            compacto={true}
          />
        </section>

        {/* Tabla 2: Canchas Reservadas */}
        <section className="socio-section-card">
          <div className="socio-section-header">
            <h2 className="socio-section-title">Reservas de Canchas</h2>
            <span className="socio-section-count">{canchasReservadas.length} turnos</span>
          </div>

          {loadingCanchas ? (
            <div className="acceso-history-empty">Cargando reservas...</div>
          ) : canchasReservadas.length === 0 ? (
            <div className="acceso-history-empty">Sin reservas de canchas activas.</div>
          ) : (
            <div className="socio-table-wrapper">
              <table className="acceso-history-table">
                <thead>
                  <tr>
                    <th>Cancha</th>
                    <th>Fecha y Hora</th>
                    <th className="acceso-text-right">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {canchasReservadas.map((c) => {
                    const estadoText = c.estado
                      ? c.estado.charAt(0).toUpperCase() + c.estado.slice(1)
                      : 'Confirmada';
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
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Tabla 3: Clases Grupales */}
        <section className="socio-section-card socio-section-card--full">
          <div className="socio-section-header">
            <h2 className="socio-section-title">Clases Grupales Inscriptas</h2>
            <span className="socio-section-count">{clasesReservadas.length} clases</span>
          </div>

          {loadingClases ? (
            <div className="acceso-history-empty">Cargando clases...</div>
          ) : clasesReservadas.length === 0 ? (
            <div className="acceso-history-empty">No registrás inscripciones a clases grupales.</div>
          ) : (
            <div className="socio-table-wrapper">
              <table className="acceso-history-table">
                <thead>
                  <tr>
                    <th>Actividad</th>
                    <th>Sede</th>
                    <th>Profesor</th>
                    <th>Horario</th>
                    <th className="acceso-text-right">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clasesReservadas.map((cl) => {
                    const nombreClase = cl.nombreClase || cl.nombre_clase || cl.nombre || cl.titulo || 'Clase';
                    const sede = cl.sede || 'Sede Principal';
                    const profesor = cl.instructor || cl.profesor || '---';
                    const horarioFormateado = cl.fechaInicio
                      ? new Date(cl.fechaInicio).toLocaleString('es-AR', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })
                      : cl.horario || '---';
                    const { texto: estadoTexto, claseBadge } = resolverEstadoClase(cl);

                    return (
                      <tr key={cl.idInscripcion || cl.idClase || cl.id}>
                        <td className="acceso-history-time">{nombreClase}</td>
                        <td className="acceso-history-event">{sede}</td>
                        <td className="acceso-history-event">{profesor}</td>
                        <td className="acceso-history-event">{horarioFormateado}</td>
                        <td className="acceso-text-right">
                          <span className={claseBadge}>{estadoTexto}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};