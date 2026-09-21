// frontend/src/modules/acceso/routes.jsx
import React from 'react';
import { Route } from 'react-router-dom';
import { AccesoScreen } from './pages/AccesoScreen.jsx';

export const accesoRoutes = (
    <Route path="acceso" element={<AccesoScreen />} />
);