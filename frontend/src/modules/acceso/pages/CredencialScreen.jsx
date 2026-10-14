import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const CredencialScreen = () => {
    const [qrCodeData, setQrCodeData] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    /**
     * Genera un nuevo código QR dinámico basado en el ID del usuario y la marca de tiempo.
     */
    const generarNuevoCodigo = () => {
        const nuevoCodigo = `FITZONE-${usuario.id || 'DEMO'}-${Date.now()}`;
        setQrCodeData(nuevoCodigo);
        setTimeLeft(60);
    };

    // Efecto para gestionar el temporizador y la regeneración automática del código
    useEffect(() => {
        generarNuevoCodigo(); 

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    generarNuevoCodigo(); 
                    return 60;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    /**
     * Copia el código QR actual al portapapeles para facilitar las pruebas en el simulador.
     */
    const handleCopy = () => {
        navigator.clipboard.writeText(qrCodeData);
        alert('¡Código copiado al portapapeles! Listo para pegar en el Lector QR.');
    };

    return (
        <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ color: '#2c3e50' }}>Mi Pase QR</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>Apoye este código en el lector para ingresar a las instalaciones.</p>
            
            {/* Contenedor del código QR visual */}
            <div style={{ 
                padding: '2rem', 
                backgroundColor: 'white', 
                borderRadius: '16px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                marginBottom: '1rem',
                display: 'inline-block'
            }}>
                {qrCodeData ? (
                    <QRCodeSVG value={qrCodeData} size={250} level="H" />
                ) : (
                    <p>Generando código...</p>
                )}
            </div>

            <h3 style={{ color: timeLeft < 10 ? '#d32f2f' : '#2e7d32' }}>
                Se renueva en: {timeLeft}s
            </h3>

            {/* Sección de apoyo para pruebas de desarrollo */}
            <div style={{ 
                marginTop: '2rem', 
                padding: '1.5rem', 
                backgroundColor: '#f8f9fa', 
                border: '2px dashed #ced4da',
                borderRadius: '12px',
                textAlign: 'left'
            }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🛠️</span> HERRAMIENTA DE PRUEBA
                </h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#6c757d' }}>
                    Copie este texto y péguelo en el simulador de molinete de la recepción.
                </p>
                
                <code style={{ 
                    display: 'block', 
                    padding: '10px', 
                    backgroundColor: '#e9ecef', 
                    color: '#212529',
                    borderRadius: '6px',
                    wordBreak: 'break-all',
                    marginBottom: '15px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                }}>
                    {qrCodeData}
                </code>
                
                <button 
                    type="button"
                    onClick={handleCopy}
                    style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#4361ee',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#3a0ca3'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#4361ee'}
                >
                    📋 Copiar Código al Portapapeles
                </button>
            </div>
        </div>
    );
};