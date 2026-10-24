import React, { useState } from 'react';

export const IngresoExternoModal = ({ onClose, onGuardar, loading }) => {
  const [formData, setFormData] = useState({ nombre: '', dni: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onGuardar(formData);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px', fontFamily: 'system-ui, sans-serif' }}>
        <h3 style={{ marginTop: 0, color: '#1f2937' }}>Registro de Cliente Externo</h3>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.5rem' }}>
          El cliente externo se registrará en la base de datos pero no sumará al contador de aforo de la sucursal.
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Nombre Completo</label>
            <input 
              type="text" 
              required
              placeholder="Ej: Juan Pérez"
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              value={formData.nombre} 
              onChange={e => setFormData({...formData, nombre: e.target.value})} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>DNI</label>
            <input 
              type="number" 
              required
              placeholder="Sin puntos ni espacios"
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              value={formData.dni} 
              onChange={e => setFormData({...formData, dni: e.target.value})} 
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ padding: '0.6rem 1.2rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              style={{ padding: '0.6rem 1.2rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
            >
              {loading ? 'Registrando...' : 'Registrar Ingreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};