import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './AccesoScreen.css';

export const CredencialScreen = () => {
    const [qrCodeData, setQrCodeData] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    const generarNuevoCodigo = () => {
        const nuevoCodigo = `FITZONE-${usuario.id || 'DEMO'}-${Date.now()}`;
        setQrCodeData(nuevoCodigo);
        setTimeLeft(60);
    };

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

    const handleCopy = () => {
        navigator.clipboard.writeText(qrCodeData);
        alert('¡Código copiado al portapapeles! Listo para pegar en el Lector QR.');
    };

    return (
        <div className="credencial-container">
            <h2 className="credencial-title">Mi Pase QR</h2>
            <p className="credencial-subtitle">
                Apoye este código en el lector para ingresar a las instalaciones.
            </p>

            <div className="credencial-qr-box">
                {qrCodeData ? (
                    <QRCodeSVG value={qrCodeData} size={250} level="H" />
                ) : (
                    <p>Generando código...</p>
                )}
            </div>

            <h3 className={`credencial-timer ${timeLeft < 10 ? 'credencial-timer--expiring' : ''}`}>
                Se renueva en: {timeLeft}s
            </h3>

            <div className="credencial-dev-box">
                <h4 className="credencial-dev-title">
                    <span>🛠️</span> HERRAMIENTA DE PRUEBA
                </h4>
                <p className="credencial-dev-desc">
                    Copie este texto y péguelo en el simulador de molinete de la recepción.
                </p>

                <code className="credencial-dev-code">{qrCodeData}</code>

                <button
                    type="button"
                    onClick={handleCopy}
                    className="credencial-copy-btn"
                >
                    📋 Copiar Código al Portapapeles
                </button>
            </div>
        </div>
    );
};