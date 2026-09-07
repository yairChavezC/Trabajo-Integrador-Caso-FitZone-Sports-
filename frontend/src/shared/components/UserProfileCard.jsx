import React from 'react';

export function UserProfileCard({ onLogout }) {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const nombreMostrar = usuario.nombre || 'Usuario';
  const rolMostrar = usuario.rol === 1 ? 'Administrador' : 'Operador';
  const inicial = nombreMostrar.charAt(0).toUpperCase();

  return (
    <div className="topbar-user-section">
      <div className="user-card">
        <div className="user-avatar">{inicial}</div>
        <div className="user-meta">
          <span className="user-name">{nombreMostrar}</span>
          <span className="user-role">{rolMostrar}</span>
        </div>
      </div>

      <button onClick={onLogout} className="btn-logout" title="Cerrar sesión">
        ✕
      </button>
    </div>
  );
}