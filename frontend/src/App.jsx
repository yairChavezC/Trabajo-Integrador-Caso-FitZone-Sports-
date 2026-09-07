import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
// Rutas modulares
import { authRoutes } from './modules/auth/routes';
import { canchasRoutes } from './modules/canchas/routes';
import { accesoRoutes } from './modules/acceso/routes';
import { clasesRoutes } from './modules/clases/routes';
import { pagosRoutes } from './modules/pagos/routes';
import { sociosRoutes } from './modules/socios/routes';
import { SedeProvider } from './core/context/SedeContext';

import { Layout } from './shared/components/MainLayout';
import {ProtectedRoute} from './shared/components/ProtectedRute'

export default function App() {
  return (
    <Router>
      <Routes>
        {authRoutes}
        <Route path="/" element={<ProtectedRoute><SedeProvider><Layout /></SedeProvider></ProtectedRoute>}>
          {/* Redirección inicial al entrar a "/" */}
          <Route index element={<Navigate to="/canchas" replace />} />
          {/* Rutas de cada módulo */}
          {canchasRoutes}
          {accesoRoutes}
          {clasesRoutes}
          {pagosRoutes}
          {sociosRoutes}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}