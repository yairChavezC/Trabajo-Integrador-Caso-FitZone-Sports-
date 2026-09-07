import React, { createContext, useContext, useState, useEffect } from 'react';
import { obtenerSedesApi } from '../api/sedeService';

const SedeContext = createContext();

export function SedeProvider({ children }) {
  const [sedes, setSedes] = useState([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarSedes = async () => {
      try {
        const data = await obtenerSedesApi();
        setSedes(data);

        if (data.length > 0) {
          const guardadaId = localStorage.getItem('sedeId');
          const encontrada = data.find((s) => String(s.id) === guardadaId);
          setSedeSeleccionada(encontrada || data[0]);
        }
      } catch (err) {
        console.error('Fallo al inicializar sedes:', err);
      } finally {
        setCargando(false);
      }
    };

    cargarSedes();
  }, []);

  return (
    <SedeContext.Provider value={{ sedes, sedeSeleccionada, setSedeSeleccionada, cargando }}>
      {children}
    </SedeContext.Provider>
  );
}

export const useSede = () => {
  const context = useContext(SedeContext);
  if (!context) {
    throw new Error('useSede debe usarse dentro de un SedeProvider');
  }
  return context;
};