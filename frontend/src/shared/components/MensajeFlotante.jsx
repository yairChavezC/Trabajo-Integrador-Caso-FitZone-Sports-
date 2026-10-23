import React, { useEffect } from 'react';
import './MensajeFlotante.css';

export function MensajeFlotante({ mensaje, tipo = 'exito', duracion = 4000, alCerrar }) {
  useEffect(() => {
    const temporizador = setTimeout(() => {
      alCerrar();
    }, duracion);

    return () => clearTimeout(temporizador);
  }, [duracion, alCerrar]);

  const icono = tipo === 'exito' ? '✓' : '✕';

  return (
    <div className={`mensaje-flotante mensaje-${tipo}`}>
      <div className="mensaje-icono">{icono}</div>
      <div className="mensaje-contenido">
        <span className="mensaje-titulo">
          {tipo === 'exito' ? 'Operación exitosa' : 'Atención'}
        </span>
        <p className="mensaje-texto">{mensaje}</p>
      </div>
      <button type="button" className="mensaje-btn-cerrar" onClick={alCerrar}>
        ✕
      </button>
    </div>
  );
}