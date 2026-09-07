import React from 'react';
import { Route } from 'react-router-dom';
import Login from './pages/LoginScreen';

export const authRoutes = (
  <Route path="/login" element={<Login />} />
);