import React from 'react';

export const AforoCard = ({ 
    aforoActual = 0, 
    aforoMaximo = 100, 
    onAjusteManual 
}) => {
    // Calculamos el porcentaje para el semáforo (RF-05)
    const porcentaje = (aforoActual / aforoMaximo) * 100;
    
    // Determinamos el color de estado según la ocupación
    let colorEstado = '#2e7d32'; // Verde (óptimo)
    if (porcentaje >= 100) {
        colorEstado = '#d32f2f'; // Rojo (capacidad máxima)
    } else if (porcentaje >= 70) {
        colorEstado = '#ed6c02'; // Naranja (precaución)
    }

    return (
        <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '12px', 
            padding: '1.5rem', 
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '100%'
        }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Aforo en Tiempo Real</h3>
            
            {/* Indicador numérico principal */}
            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: colorEstado, lineHeight: '1' }}>
                {aforoActual} <span style={{ fontSize: '1.5rem', color: '#999' }}>/ {aforoMaximo}</span>
            </div>
            
            {/* Barra de progreso visual (Semáforo) */}
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', margin: '1rem 0', overflow: 'hidden' }}>
                <div style={{ 
                    width: `${Math.min(porcentaje, 100)}%`, 
                    height: '100%', 
                    backgroundColor: colorEstado,
                    transition: 'width 0.3s ease-in-out'
                }}></div>
            </div>

            <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.9rem' }}>
                {porcentaje >= 100 ? '¡Capacidad máxima alcanzada!' : 'Personas activas en este momento'}
            </p>

            {/* Controles de ajuste manual (RF-05) */}
            {onAjusteManual && (
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
                    <button 
                        type="button"
                        onClick={() => onAjusteManual('salida')}
                        disabled={aforoActual <= 0}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: aforoActual <= 0 ? '#f5f5f5' : '#fdeded',
                            color: aforoActual <= 0 ? '#ccc' : '#d32f2f',
                            border: '1px solid',
                            borderColor: aforoActual <= 0 ? '#eee' : '#f4c7c7',
                            borderRadius: '6px',
                            cursor: aforoActual <= 0 ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        -1 Salida
                    </button>
                    <button 
                        type="button"
                        onClick={() => onAjusteManual('ingreso')}
                        disabled={aforoActual >= aforoMaximo}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: aforoActual >= aforoMaximo ? '#f5f5f5' : '#edf7ed',
                            color: aforoActual >= aforoMaximo ? '#ccc' : '#2e7d32',
                            border: '1px solid',
                            borderColor: aforoActual >= aforoMaximo ? '#eee' : '#c8e6c9',
                            borderRadius: '6px',
                            cursor: aforoActual >= aforoMaximo ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        +1 Ingreso
                    </button>
                </div>
            )}
        </div>
    );
};