import React from 'react';
import { LoginForm } from '../components/LoginForm';
import { useLogin } from '../hooks/useLogin';
import './LoginScreen.css';

const Login = () => {
  const { credenciales, error, cargando, handleChange, handleSubmit } = useLogin();

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Sistema de Gestión</h2>
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