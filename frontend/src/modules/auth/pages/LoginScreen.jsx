import React from 'react';
import { LoginForm } from '../components/LoginForm';
import { useLogin } from '../hooks/useLogin';
import './LoginScreen.css';

const Login = () => {
  const { credenciales, error, cargando, handleChange, handleSubmit } = useLogin();

  return (
    <div className="login-container">
      {/* 1. Header de marca */}
      <div className="login-brand">
        <div className="brand-badge">FZ</div>
        <div className="brand-text">
          <span className="brand-title">FITZONE</span>
          <span className="brand-subtitle">SPORTS</span>
        </div>
      </div>

      {/* 2. Tarjeta principal */}
      <div className="login-card">
        <div className="login-card-header">
          <h2>Acceso al Sistema</h2>
          <p>Ingresá tus credenciales para acceder a tus reservas y gestión.</p>
        </div>

        <LoginForm
          credenciales={credenciales}
          onChange={handleChange}
          onSubmit={handleSubmit}
          error={error}
          cargando={cargando}
        />
      </div>
    </div>
  );
};

export default Login;