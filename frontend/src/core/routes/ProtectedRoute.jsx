import React from 'react';
import { Navigate } from 'react-router-dom';

// Componente para proteger rutas privadas
export const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};