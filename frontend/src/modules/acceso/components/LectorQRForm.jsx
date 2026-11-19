import { useState, useRef, useEffect } from 'react';

export const LectorQRForm = ({ onEscanear, loading }) => {
    const [qrCode, setQrCode] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (qrCode.trim() === '') return;

        onEscanear(qrCode);
        setQrCode('');

        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <div className="lector-qr-card">
            <div className="lector-qr-header">
                <div className="lector-qr-icon">📷</div>
                <div>
                    <h3 className="lector-qr-title">Lector de Accesos</h3>
                    <p className="lector-qr-desc">
                        Escaneá el código QR del socio para registrar automáticamente su entrada o salida.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="lector-qr-form">
                <input
                    ref={inputRef}
                    type="text"
                    className="lector-qr-input"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    placeholder="Esperando lectura del escáner..."
                    disabled={loading}
                    autoComplete="off"
                />
                <button
                    type="submit"
                    className="lector-qr-btn"
                    disabled={loading}
                >
                    {loading ? 'Validando...' : 'Escanear'}
                </button>
            </form>
        </div>
    );
};