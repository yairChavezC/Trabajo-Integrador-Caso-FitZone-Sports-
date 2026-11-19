import React from 'react';

export const AforoCard = ({ 
    aforoActual = 0, 
    aforoMaximo = 100 
}) => {
    const porcentaje = aforoMaximo > 0 ? (aforoActual / aforoMaximo) * 100 : 0;

    let modificadorEstado = 'optimal';
    if (porcentaje >= 100) {
        modificadorEstado = 'full';
    } else if (porcentaje >= 70) {
        modificadorEstado = 'warning';
    }

    return (
        <div className="aforo-card">
            <h3 className="aforo-title">Aforo en Tiempo Real</h3>

            <div className={`aforo-value aforo-value--${modificadorEstado}`}>
                {aforoActual} <span className="aforo-max">/ {aforoMaximo}</span>
            </div>

            <div className="aforo-progress-track">
                <div
                    className={`aforo-progress-bar aforo-progress-bar--${modificadorEstado}`}
                    style={{ width: `${Math.min(porcentaje, 100)}%` }}
                />
            </div>

            <p className="aforo-caption">
                {porcentaje >= 100 ? '¡Capacidad máxima alcanzada!' : 'Personas activas en la instalación'}
            </p>
        </div>
    );
};