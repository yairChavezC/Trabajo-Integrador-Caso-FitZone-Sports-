import React, { useState, useEffect } from 'react';
import { useSede } from '../../../shared/context/SedeContext';
import { CanchasFiltros } from '../components/CanchasFiltros';
import { CanchaCard } from '../components/CanchaCard';
import { CanchaDrawer } from '../components/CanchaDrawer';
import './CanchasScreen.css';

export default function CanchasScreen() {
  const { sedeSeleccionada } = useSede();
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [canchas, setCanchas] = useState([]);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('TODAS');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!sedeSeleccionada) return;

    const cargarGrilla = async () => {
      setCargando(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `http://localhost:3000/api/canchas/grilla?idSede=${sedeSeleccionada.id}&fecha=${fecha}`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (json.success) {
          setCanchas(json.data);
          if (canchaSeleccionada) {
            const actualizada = json.data.find(c => c.id === canchaSeleccionada.id);
            setCanchaSeleccionada(actualizada || null);
          }
        }
      } catch (err) {
        console.error('Error cargando canchas:', err);
      } finally {
        setCargando(false);
      }
    };

    cargarGrilla();
  }, [sedeSeleccionada, fecha]);

  const canchasFiltradas = canchas.filter((c) => {
    if (filtroTipo === 'TODAS') return true;
    return c.tipo.toUpperCase() === filtroTipo.toUpperCase();
  });

  return (
    <div className="canchas-container">
      {/* Encabezado simple */}
      <div className="canchas-header-simple">
        <h2>Canchas</h2>
        <p>Seleccioná una cancha para consultar horarios disponibles y tarifas.</p>
      </div>

      {/* Barra de Filtros */}
      <CanchasFiltros
        filtroTipo={filtroTipo}
        onSelectFiltro={(tipo) => setFiltroTipo(tipo)}
        totalCanchas={canchas.length}
        fecha={fecha}
        onChangeFecha={setFecha}
      />

      {/* Catálogo de Canchas */}
      {cargando ? (
        <div className="canchas-empty">Cargando catálogo de canchas...</div>
      ) : canchasFiltradas.length === 0 ? (
        <div className="canchas-empty">No hay canchas disponibles para los filtros seleccionados.</div>
      ) : (
        <div className="catalogo-canchas-grid">
          {canchasFiltradas.map((cancha) => (
            <CanchaCard 
              key={cancha.id} 
              cancha={cancha} 
              alSeleccionar={(c) => setCanchaSeleccionada(c)} 
            />
          ))}
        </div>
      )}

      {/* Drawer Lateral Deslizante */}
      <CanchaDrawer
        cancha={canchaSeleccionada}
        fecha={fecha}
        alCerrar={() => setCanchaSeleccionada(null)}
        alReservarSlot={(slot) => console.log('Slot seleccionado:', slot)}
      />
    </div>
  );
}