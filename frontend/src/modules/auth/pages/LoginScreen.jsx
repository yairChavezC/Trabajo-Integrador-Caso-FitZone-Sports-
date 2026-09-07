import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { useLogin } from '../hooks/useLogin';
import './LoginScreen.css';

const Login = () => {
  const { credenciales, error, cargando, handleChange, handleSubmit } = useLogin();
  const navigate = useNavigate();

  const handleEntrarSinRegistrarse = () => {
    // Redirige directamente al módulo público/canchas como invitado
    navigate('/canchas');
  };

  const handleIrARegistro = () => {
    // O redirigir a '/registro' si ya tenés esa ruta
    navigate('/registro');
  };

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

      {/* 2. Barra de tabs de navegación */}
      <div className="login-tabs-container">
        <button 
          type="button" 
          className="login-tab-btn" 
          onClick={handleEntrarSinRegistrarse}
        >
          Entrar sin registrarse
        </button>

        <button 
          type="button" 
          className="login-tab-btn activo"
        >
          Iniciar Sesión
        </button>

        <button 
          type="button" 
          className="login-tab-btn" 
          onClick={handleIrARegistro}
        >
          Registrarse
        </button>
      </div>

      {/* 3. Tarjeta principal */}
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