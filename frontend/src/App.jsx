import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Context Providers globales
import { AuthProvider } from './core/auth/AuthContext';
import { SedeProvider } from './shared/context/SedeContext';

// Layouts y Guards
import { MainLayout } from './core/layouts/mainLayout/MainLayout';
import { ProtectedRoute } from './core/routes/ProtectedRoute';

// Rutas modulares
import { authRoutes } from './modules/auth/routes';
import { canchasRoutes } from './modules/canchas/routes';
import { accesoRoutes } from './modules/acceso/routes';
import { clasesRoutes } from './modules/clases/routes';
import { pagosRoutes } from './modules/pagos/routes';
import { sociosRoutes } from './modules/socios/routes';

export default function App() {
  return (
    <Router>
      <AuthProvider><Routes>{/* Rutas públicas (Login) */}
            {authRoutes}

            {/* Rutas privadas bajo layout general */}
            <Route path="/" element={<ProtectedRoute><SedeProvider><MainLayout /></SedeProvider></ProtectedRoute>}>
              {/* Redirección inicial al entrar a "/" */}
              <Route index element={<Navigate to="/canchas" replace />} />

              {/* Rutas de cada módulo */}
              {canchasRoutes}
              {accesoRoutes}
              {clasesRoutes}
              {pagosRoutes}
              {sociosRoutes}
            </Route>

            {/* Fallback general */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        
      </AuthProvider>
    </Router>
  );
}