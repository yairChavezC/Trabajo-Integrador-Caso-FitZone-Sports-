import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useHistorialSocio } from '../hooks/useHistorialSocio';
import { HistorialAccesosTable } from '../components/HistorialAccesosTable';
import { httpClient } from '../../../core/api/httpClient';

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
      // 1. Petición de canchas (Ya funciona)
      try {
        const resCanchas = await httpClient.get('/reservas-canchas/mis-reservas').catch(() => ({ data: [] }));
        const dataCanchas = resCanchas?.data?.data || resCanchas?.data || [];
        setCanchasReservadas(Array.isArray(dataCanchas) ? dataCanchas.slice(0, 5) : []);
      } catch (e) {
        setCanchasReservadas([]);
      } finally {
        setLoadingCanchas(false);
      }

      // 2. 👈 Petición REAL a tus clases grupales
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

  return (
    <div style={{ 
      padding: '2rem 3rem', 
      width: '100%', 
      boxSizing: 'border-box', 
      fontFamily: 'system-ui, -apple-system, sans-serif' 
    }}>
      
      {/* Encabezado del Socio */}
      <header style={{ 
        marginBottom: '2rem', 
        borderBottom: '2px solid #f3f4f6',
        paddingBottom: '1rem',
        width: '100%'
      }}>
        <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.25rem 0', color: '#111827', fontWeight: '700' }}>
          Mi Actividad en FitZone
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
          Socio: <strong style={{ color: '#374151' }}>{usuario?.nombre || 'Socio'}</strong> · DNI: <strong style={{ color: '#374151' }}>{usuario?.dni || '---'}</strong>
        </p>
      </header>

      {/* Grilla expandida a lo ancho de la pantalla */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(550px, 1fr))', 
        gap: '2rem', 
        width: '100%',
        alignItems: 'start' 
      }}>
        
        {/* SECCIÓN 1: Control de Acceso */}
        <section style={{ 
          background: '#ffffff', 
          borderRadius: '16px', 
          border: '1px solid #e5e7eb', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', 
          padding: '1.5rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ marginBottom: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', color: '#1f2937', margin: 0, fontWeight: '600' }}>
              🚪 Últimos Accesos (Entradas y Salidas)
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>
              Tus últimos 5 registros de molinete.
            </p>
          </div>
          <HistorialAccesosTable historial={historialAccesos} loading={loadingAccesos} />
        </section>

        {/* SECCIÓN 2: Canchas Reservadas */}
        <section style={{ 
          background: '#ffffff', 
          borderRadius: '16px', 
          border: '1px solid #e5e7eb', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', 
          padding: '1.5rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ marginBottom: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', color: '#1f2937', margin: 0, fontWeight: '600' }}>
              🎾 Canchas Reservadas
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>
              Tus últimas 5 reservas de canchas.
            </p>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', color: '#9ca3af', fontSize: '0.75rem', fontWeight: '700' }}>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>CANCHA</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>TURNO</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {loadingCanchas ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Cargando canchas...</td></tr>
                ) : canchasReservadas.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '2.5rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                      No tenés canchas reservadas.
                    </td>
                  </tr>
                ) : (
                  canchasReservadas.map((c) => {
                    // Mapeo dinámico de estados con sus respectivos colores
                    const estadoText = c.estado ? c.estado.charAt(0).toUpperCase() + c.estado.slice(1) : 'Confirmada';
                    const colorFondo = c.estado === 'cancelada' ? '#fee2e2' : c.estado === 'pendiente' ? '#fef3c7' : '#dcfce7';
                    const colorTexto = c.estado === 'cancelada' ? '#b91c1c' : c.estado === 'pendiente' ? '#d97706' : '#166534';

                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        {/* 👈 nombreCancha tal cual llega del backend */}
                        <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: '500', color: '#111827' }}>
                          {c.nombreCancha || 'Cancha'}
                        </td>
                        
                        {/* 👈 fechaInicio formateada a DD/MM/YYYY HH:MM */}
                        <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#4b5563' }}>
                          {c.fechaInicio ? new Date(c.fechaInicio).toLocaleString('es-AR', { 
                            dateStyle: 'short', 
                            timeStyle: 'short' 
                          }) : '---'}
                        </td>
                        
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '99px', 
                            fontSize: '0.75rem', 
                            fontWeight: '700', 
                            background: colorFondo, 
                            color: colorTexto 
                          }}>
                            {estadoText}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECCIÓN 3: Clases Grupales Inscriptas (Ocupa todo el ancho inferior) */}
        <section style={{ 
          background: '#ffffff', 
          borderRadius: '16px', 
          border: '1px solid #e5e7eb', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', 
          padding: '1.5rem', 
          gridColumn: '1 / -1',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ marginBottom: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', color: '#1f2937', margin: 0, fontWeight: '600' }}>
              🧘‍♂️ Clases Grupales Inscriptas
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>
              Tus últimas 5 inscripciones a clases grupales.
            </p>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', color: '#9ca3af', fontSize: '0.75rem', fontWeight: '700' }}>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>CLASE / ACTIVIDAD</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>PROFESOR</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>HORARIO</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {loadingClases ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Cargando clases...</td></tr>
                ) : clasesReservadas.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2.5rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                      No estás inscripto en ninguna clase grupal.
                    </td>
                  </tr>
                ) : (
                  clasesReservadas.map((cl) => (
                    <tr key={cl.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: '500', color: '#111827' }}>{cl.nombre_clase || cl.titulo || 'Clase'}</td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#4b5563' }}>{cl.profesor || '---'}</td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#4b5563' }}>{cl.horario || '---'}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '700', background: '#e0e7ff', color: '#3730a3' }}>
                          Inscripto
                        </span>
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