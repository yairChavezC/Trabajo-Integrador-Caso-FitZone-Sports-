import React from 'react';
import { useNavigate } from 'react-router-dom';

export function UserProfileCard({ onLogout }) {
    const navigate = useNavigate(); 

    // Obtenemos los datos del usuario almacenados localmente
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nombreMostrar = usuario.nombre || 'Lucas Rossi';
    const rolMostrar = usuario.rol === 1 ? 'Administrador' : 'Socio Activo';
    const inicial = nombreMostrar.charAt(0).toUpperCase();

    return (
        <div className="topbar-user-section">
            
            {/* Botón de acceso directo al Pase QR */}
            <button 
                type="button" 
                className="btn-pase-qr"
                onClick={() => navigate('/mi-credencial')} 
            >
                <span className="qr-icon">▦</span>
                <span className="qr-text">Mi Pase QR</span>
            </button>

            {/* Sección de notificaciones */}
            <div className="btn-notificaciones-badge">
                <span className="notif-bell">🔔</span>
                <span className="notif-count">1</span>
            </div>

            {/* Tarjeta con los datos del perfil */}
            <div className="user-profile-card">
                <div className="user-avatar-img">
                    <span>{inicial}</span>
                </div>
                <div className="user-details">
                    <span className="user-name">{nombreMostrar}</span>
                    <span className="user-status-pill">{rolMostrar}</span>
                </div>
            </div>

            {/* Botón de cierre de sesión */}
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