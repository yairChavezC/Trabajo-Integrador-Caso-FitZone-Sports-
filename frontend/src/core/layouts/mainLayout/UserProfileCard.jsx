import React from 'react';

export function UserProfileCard({ onLogout }) {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const nombreMostrar = usuario.nombre || 'Lucas Rossi';
  const rolMostrar = usuario.rol === 1 ? 'Administrador' : 'Socio Activo';
  const inicial = nombreMostrar.charAt(0).toUpperCase();

  return (
    <div className="topbar-user-section">
      {/* Botón Acción Destacada */}
      <button type="button" className="btn-pase-qr">
        <span className="qr-icon">▦</span>
        <span className="qr-text">Mi Pase QR'('Proximamente')'</span>
      </button>

      {/* Notificaciones */}
      <div className="btn-notificaciones-badge">
        <span className="notif-bell">🔔</span>
        <span className="notif-count">1</span>
      </div>

      {/* Perfil */}
      <div className="user-profile-card">
        <div className="user-avatar-img">
          <span>{inicial}</span>
        </div>
        <div className="user-details">
          <span className="user-name">{nombreMostrar}</span>
          <span className="user-status-pill">{rolMostrar}</span>
        </div>
      </div>

      {/* Salir */}
      {onLogout && (
        <button 
          type="button" 
          onClick={onLogout} 
          className="btn-logout" 
          title="Cerrar sesión"
        >
          ✕
        </button>
      )}
    </div>
  );
}