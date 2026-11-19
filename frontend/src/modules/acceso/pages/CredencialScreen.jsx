
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../../core/auth/AuthContext';
import { accesoService } from '../services/accesoService';
import { Snackbar } from '../components/Snackbar.jsx';
import './AccesoScreen.css';

export const CredencialScreen = () => {
    const [qrCodeData, setQrCodeData] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);

    const [aviso, setAviso] = useState({
        open: false,
        type: 'info',
        message: ''
    });

    const { usuario: usuarioContext } = useAuth();
    const usuario = usuarioContext || accesoService.obtenerUsuarioActual();

    const mostrarAviso = (type, message) => {
        setAviso({
            open: true,
            type,
            message
        });
    };

    const cerrarAviso = () => {
        setAviso(prev => ({
            ...prev,
            open: false
        }));
    };

    const generarNuevoCodigo = () => {
        const nuevoCodigo = `FITZONE-${usuario?.id || 'DEMO'}-${Date.now()}`;
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

    // Copiar código QR al portapapeles
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(qrCodeData);

            mostrarAviso(
                'success',
                '¡Código copiado! Ya podés pegarlo en el lector QR.'
            );

        } catch (error) {
            console.error('Error al copiar el código:', error);

            mostrarAviso(
                'error',
                'No se pudo copiar el código al portapapeles.'
            );
        }
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

                <code className="credencial-dev-code">
                    {qrCodeData}
                </code>

                <button
                    type="button"
                    onClick={handleCopy}
                    className="credencial-copy-btn"
                    disabled={!qrCodeData}
                >
                    📋 Copiar Código al Portapapeles
                </button>

            </div>

            <Snackbar
                open={aviso.open}
                type={aviso.type}
                message={aviso.message}
                onClose={cerrarAviso}
            />

        </div>
    );
};
