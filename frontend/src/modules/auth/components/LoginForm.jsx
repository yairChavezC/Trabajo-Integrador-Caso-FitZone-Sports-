import React from 'react';

export const LoginForm = ({ 
  credenciales, 
  onChange, 
  onSubmit, 
  error, 
  cargando 
}) => {
  return (
    <form onSubmit={onSubmit}>
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="nombre_usuario">Usuario</label>
        <input
          id="nombre_usuario"
          type="text"
          name="nombre_usuario"
          value={credenciales.nombre_usuario}
          onChange={onChange}
          placeholder="Ingresá tu usuario"
          disabled={cargando}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="contrasenia">Contraseña</label>
        <input
          id="contrasenia"
          type="password"
          name="contrasenia"
          value={credenciales.contrasenia}
          onChange={onChange}
          placeholder="Ingresá tu contraseña"
          disabled={cargando}
          required
        />
      </div>

      <button type="submit" className="btn-login" disabled={cargando}>
        {cargando ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  );
};