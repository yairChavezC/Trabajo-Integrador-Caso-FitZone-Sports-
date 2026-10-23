import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import './UserProfileCard.css';

export function UserProfileCard({ onLogout }) {
  const navigate = useNavigate();
  const { usuario: usuarioContext } = useAuth();
  const [errorImagen, setErrorImagen] = useState(false);

  // Leemos del contexto o directamente de localStorage como fallback
  const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || '{}');
  const usuario = usuarioContext || usuarioLocal;

  const nombreMostrar = usuario.nombre || 'Luis Advíncula';
  const rolMostrar = Number(usuario.rol) === 1 || Number(usuario.id_rol) === 1 ? 'Administrador' : 'Socio Activo';
  const fotoUrl = usuario.foto || usuario.foto_url;
  const inicial = nombreMostrar.charAt(0).toUpperCase();

  return (
    <div className="topbar-user-section">
      {/* Botón Mi Pase QR */}
      <button 
        type="button" 
        className="btn-pase-qr"
        onClick={() => navigate('/mi-credencial')}
      >
        <span className="qr-icon">▦</span>
        <span className="qr-text">Mi Pase QR</span>
      </button>

      {/* Notificaciones */}
      <div className="btn-notificaciones-badge">
        <span className="notif-bell">🔔</span>
        <span className="notif-count">1</span>
      </div>

      {/* Tarjeta del perfil */}
      <div className="user-profile-card">
        <div className="user-avatar-container">
          {fotoUrl && !errorImagen ? (
            <img 
              src={fotoUrl} 
              alt={nombreMostrar}
              className="user-avatar-photo"
              onError={(e) => {
                console.warn('⚠️ La imagen falló al cargar desde la URL:', fotoUrl);
                setErrorImagen(true);
              }}
              onLoad={() => {
                console.log(' Imagen de perfil cargada con éxito:', fotoUrl);
              }}
            />
          ) : (
            <div className="user-avatar-img">
              <span>{inicial}</span>
            </div>
          )}
        </div>

        <div className="user-details">
          <span className="user-name">{nombreMostrar}</span>
          <span className="user-status-pill">{rolMostrar}</span>
        </div>
      </div>

      {/* Logout */}
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