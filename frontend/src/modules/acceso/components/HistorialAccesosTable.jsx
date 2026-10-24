import React from 'react';

export const HistorialAccesosTable = ({ historial, loading }) => {
  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280', fontSize: '0.95rem' }}>
        Cargando tu historial de accesos...
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#ffffff', 
      borderRadius: '16px', 
      border: '1px solid #e5e7eb', 
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      overflow: 'hidden',
      marginTop: '1.5rem',
      width: '100%'
    }}>
      {/* Cabecera de la Tarjeta */}
      <div style={{ 
        padding: '1.25rem 1.5rem', 
        borderBottom: '1px solid #f3f4f6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1f2937', fontWeight: '600' }}>
          Historial de Ingresos y Egresos
        </h3>
        <span style={{ 
          background: '#e0e7ff', 
          color: '#3730a3', 
          padding: '4px 10px', 
          borderRadius: '99px', 
          fontSize: '0.8rem',
          fontWeight: '600'
        }}>
          {historial ? historial.length : 0} registros
        </span>
      </div>

      {/* Contenido / Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ backgroundColor: '#ffffff', color: '#9ca3af', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em' }}>
              <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>FECHA Y HORA DE ENTRADA</th>
              <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>SALIDA / ESTADÍA</th>
              <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>SUCURSAL</th>
              <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {!historial || historial.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontSize: '0.9rem' }}>
                  No hay registros recientes de acceso en las instalaciones.
                </td>
              </tr>
            ) : (
              historial.map((row) => {
                const estaAdentro = !row.fecha_salida;
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }}>
                    
                    {/* Fecha de entrada */}
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', color: '#111827', fontWeight: '500' }}>
                      {new Date(row.fecha_entrada).toLocaleString('es-AR', {
                        dateStyle: 'short',
                        timeStyle: 'medium'
                      })}
                    </td>

                    {/* Fecha de salida / Duración */}
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', color: '#4b5563' }}>
                      {estaAdentro ? (
                        <span style={{ 
                          background: '#dcfce7', 
                          color: '#166534', 
                          padding: '4px 10px', 
                          borderRadius: '6px', 
                          fontSize: '0.8rem', 
                          fontWeight: '600',
                          display: 'inline-block'
                        }}>
                          En sala actualmente
                        </span>
                      ) : (
                        new Date(row.fecha_salida).toLocaleTimeString('es-AR', {
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })
                      )}
                    </td>

                    {/* Sucursal */}
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem', color: '#4b5563', fontWeight: '500' }}>
                      {row.sede?.nombre || 'Sede Principal'}
                    </td>

                    {/* Estado con Badge */}
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <span style={{ 
                        padding: '5px 12px', 
                        borderRadius: '99px', 
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        display: 'inline-block',
                        background: estaAdentro ? '#fef3c7' : '#f3f4f6', 
                        color: estaAdentro ? '#b45309' : '#374151' 
                      }}>
                        {estaAdentro ? 'En Curso' : 'Completado'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};