import React from 'react';
import { Route } from 'react-router-dom';
import { AccesoScreen } from './pages/AccesoScreen.jsx';
import { CredencialScreen } from './pages/CredencialScreen.jsx';

export const accesoRoutes = (
    <>
        {/* Ruta para el panel de control del Recepcionista (A3) */}
        <Route path="acceso" element={<AccesoScreen />} />
        
        {/* Ruta para el pase digital dinámico del Socio (A1) */}
        <Route path="mi-credencial" element={<CredencialScreen />} />
    </>
);