import React from 'react';

export const AforoCard = ({ 
    aforoActual = 0, 
    aforoMaximo = 100 
}) => {
    // Calculamos el porcentaje para el semáforo
    const porcentaje = (aforoActual / aforoMaximo) * 100;
    
    // Determinamos el color de estado según la ocupación
    let colorEstado = '#16a34a'; // Verde (óptimo)
    if (porcentaje >= 100) {
        colorEstado = '#dc2626'; // Rojo (capacidad máxima)
    } else if (porcentaje >= 70) {
        colorEstado = '#ea580c'; // Naranja (precaución)
    }

    return (
        <div style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '16px', 
            padding: '2.5rem 1.5rem', 
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', 
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: '100%',
            boxSizing: 'border-box'
        }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937', fontSize: '1.25rem', fontWeight: '600' }}>
                Aforo en Tiempo Real
            </h3>
            
            {/* Indicador numérico principal */}
            <div style={{ fontSize: '4rem', fontWeight: '800', color: colorEstado, lineHeight: '1', margin: '1rem 0' }}>
                {aforoActual} <span style={{ fontSize: '1.5rem', color: '#9ca3af', fontWeight: '600' }}>/ {aforoMaximo}</span>
            </div>
            
            {/* Barra de progreso visual (Semáforo) */}
            <div style={{ width: '100%', height: '10px', backgroundColor: '#f3f4f6', borderRadius: '99px', margin: '1.5rem 0', overflow: 'hidden' }}>
                <div style={{ 
                    width: `${Math.min(porcentaje, 100)}%`, 
                    height: '100%', 
                    backgroundColor: colorEstado,
                    transition: 'width 0.5s ease-in-out',
                    borderRadius: '99px'
                }}></div>
            </div>

            <p style={{ margin: '0', color: '#6b7280', fontSize: '0.95rem', fontWeight: '500' }}>
                {porcentaje >= 100 ? '¡Capacidad máxima alcanzada!' : 'Personas activas en la instalación'}
            </p>
        </div>
    );
};