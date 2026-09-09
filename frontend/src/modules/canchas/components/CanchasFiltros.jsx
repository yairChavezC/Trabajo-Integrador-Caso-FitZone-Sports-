import React from 'react';
import { CustomDatePicker } from './CustomDatePicker';

export function CanchasFiltros({ 
  filtroTipo, 
  onSelectFiltro, 
  totalCanchas, 
  fecha, 
  onChangeFecha 
}) {
  return (
    <div className="filtros-topbar">
      <div className="filtros-deporte">
        <button 
          type="button" 
          className={`btn-pill ${filtroTipo === 'TODAS' ? 'activo' : ''}`}
          onClick={() => onSelectFiltro('TODAS')}
        >
          Todas ({totalCanchas})
        </button>
        <button 
          type="button" 
          className={`btn-pill ${filtroTipo === 'PAD' ? 'activo' : ''}`}
          onClick={() => onSelectFiltro('PAD')}
        >
          Paddle
        </button>
        <button 
          type="button" 
          className={`btn-pill ${filtroTipo === 'FUT' ? 'activo' : ''}`}
          onClick={() => onSelectFiltro('FUT')}
        >
          Fútbol 5
        </button>
      </div>

      <div className="filtros-controles">
        <CustomDatePicker 
          fechaSeleccionada={fecha} 
          onChangeFecha={onChangeFecha} 
        />
      </div>
    </div>
  );
}