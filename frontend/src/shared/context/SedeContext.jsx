import React, { createContext, useContext, useState, useEffect } from 'react';
import { obtenerSedesApi } from '../services/sedeService';

const SedeContext = createContext();

export function SedeProvider({ children }) {
  const [sedes, setSedes] = useState([]);
  const [sedeSeleccionada, setSedeSeleccionadaState] = useState(null);
  const [cargando, setCargando] = useState(true);

  // 1. Centraliza la sincronización con localStorage
  const cambiarSede = (sede) => {
    setSedeSeleccionadaState(sede);
    if (sede?.id) {
      localStorage.setItem('sedeId', String(sede.id));
    } else {
      localStorage.removeItem('sedeId');
    }
  };

  useEffect(() => {
    const cargarSedes = async () => {
      try {
        const data = await obtenerSedesApi();
        setSedes(data);

        if (data.length > 0) {
          const guardadaId = localStorage.getItem('sedeId');
          const encontrada = data.find((s) => String(s.id) === guardadaId);
          const inicial = encontrada || data[0];

          setSedeSeleccionadaState(inicial);

          // 2. Si cayó en fallback por ser primer inicio, dejamos el storage seteado
          if (inicial?.id) {
            localStorage.setItem('sedeId', String(inicial.id));
          }
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
    <SedeContext.Provider
      value={{
        sedes,
        sedeSeleccionada,
        setSedeSeleccionada: cambiarSede, // Expones la función que sincroniza
        cargando,
      }}
    >
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