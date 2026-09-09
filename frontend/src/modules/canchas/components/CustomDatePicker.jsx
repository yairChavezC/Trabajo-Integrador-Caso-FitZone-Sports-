import React, { useState, useRef, useEffect } from 'react';
import './CustomDatePicker.css';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

export function CustomDatePicker({ fechaSeleccionada, onChangeFecha }) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);

  // Parsear fecha actual YYYY-MM-DD
  const [anio, mes, dia] = fechaSeleccionada.split('-').map(Number);
  const [vistaMes, setVistaMes] = useState(mes - 1);
  const [vistaAnio, setVistaAnio] = useState(anio);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const clickAfuera = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', clickAfuera);
    return () => document.removeEventListener('mousedown', clickAfuera);
  }, []);

  const formatearFechaDisplay = (str) => {
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  };

  const diasEnElMes = new Date(vistaAnio, vistaMes + 1, 0).getDate();
  const primerDiaSemana = new Date(vistaAnio, vistaMes, 1).getDay();

  const handleMesAnterior = () => {
    if (vistaMes === 0) {
      setVistaMes(11);
      setVistaAnio((prev) => prev - 1);
    } else {
      setVistaMes((prev) => prev - 1);
    }
  };

  const handleMesSiguiente = () => {
    if (vistaMes === 11) {
      setVistaMes(0);
      setVistaAnio((prev) => prev + 1);
    } else {
      setVistaMes((prev) => prev + 1);
    }
  };

  const handleElegirDia = (nroDia) => {
    const dStr = String(nroDia).padStart(2, '0');
    const mStr = String(vistaMes + 1).padStart(2, '0');
    onChangeFecha(`${vistaAnio}-${mStr}-${dStr}`);
    setAbierto(false);
  };

  return (
    <div className="custom-datepicker-wrapper" ref={contenedorRef}>
      <button 
        type="button" 
        className={`custom-datepicker-trigger ${abierto ? 'activo' : ''}`}
        onClick={() => setAbierto(!abierto)}
      >
        <span className="dp-label">FECHA:</span>
        <span className="dp-valor">{formatearFechaDisplay(fechaSeleccionada)}</span>
        <span className="dp-icono">📅</span>
      </button>

      {abierto && (
        <div className="custom-datepicker-popover">
          <div className="dp-header">
            <span className="dp-mes-anio">
              {MESES[vistaMes]} {vistaAnio}
            </span>
            <div className="dp-nav-btns">
              <button type="button" onClick={handleMesAnterior}>‹</button>
              <button type="button" onClick={handleMesSiguiente}>›</button>
            </div>
          </div>

          <div className="dp-dias-semana">
            {DIAS_SEMANA.map((d, i) => (
              <span key={i} className="dp-dia-header">{d}</span>
            ))}
          </div>

          <div className="dp-matriz-dias">
            {Array.from({ length: primerDiaSemana }).map((_, i) => (
              <span key={`vacio-${i}`} className="dp-dia-vacio"></span>
            ))}
            {Array.from({ length: diasEnElMes }).map((_, i) => {
              const num = i + 1;
              const esHoy = 
                num === dia && 
                vistaMes === (mes - 1) && 
                vistaAnio === anio;

              return (
                <button
                  type="button"
                  key={num}
                  className={`dp-dia-btn ${esHoy ? 'seleccionado' : ''}`}
                  onClick={() => handleElegirDia(num)}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}