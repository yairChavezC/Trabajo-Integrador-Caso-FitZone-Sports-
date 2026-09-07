import React from 'react';

export const LoginForm = ({ 
  credenciales, 
  onChange, 
  onSubmit, 
  error, 
  cargando 
}) => {
  return (
    <form onSubmit={onSubmit} className="login-form">
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="nombre_usuario">USUARIO / DNI</label>
        <div className="input-wrapper">
          <input
            id="nombre_usuario"
            type="text"
            name="nombre_usuario"
            value={credenciales.nombre_usuario}
            onChange={onChange}
            placeholder="Ej: 38120450 o usuario"
            disabled={cargando}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="contrasenia">CONTRASEÑA</label>
        <div className="input-wrapper">
          <input
            id="contrasenia"
            type="password"
            name="contrasenia"
            value={credenciales.contrasenia}
            onChange={onChange}
            placeholder="••••••••••••"
            disabled={cargando}
            required
          />
          <span className="input-icon">🔒</span>
        </div>
      </div>

      <button type="submit" className="btn-login" disabled={cargando}>
        {cargando ? 'Ingresando...' : 'Ingresar al Sistema'}
      </button>
    </form>
  );
};