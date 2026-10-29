import { useState, useRef, useEffect } from 'react';

export const LectorQRForm = ({ onEscanear, loading }) => {
    const [qrCode, setQrCode] = useState('');
    const inputRef = useRef(null);

    // Mantiene el foco automático para la pistola lectora de QR
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
        <div style={{ 
            padding: '2rem', 
            border: '1px solid #e5e7eb', 
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
                <div style={{ 
                    width: '45px', 
                    height: '45px', 
                    backgroundColor: '#eef2ff', 
                    borderRadius: '10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '1.4rem'
                }}>
                    📷
                </div>
                <div>
                    <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.25rem', fontWeight: '600' }}>
                        Lector de Accesos
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>
                        Escaneá el código QR del socio para registrar automáticamente su entrada o salida.
                    </p>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <input 
                    ref={inputRef}
                    type="text" 
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    placeholder="Esperando lectura del escáner..."
                    disabled={loading}
                    autoComplete="off"
                    style={{ 
                        flex: 1, 
                        padding: '0.75rem 1rem', 
                        borderRadius: '8px', 
                        border: '2px solid #e5e7eb',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        color: '#1f2937'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ 
                        padding: '0.75rem 1.5rem', 
                        backgroundColor: '#4f46e5', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#4338ca')}
                    onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#4f46e5')}
                >
                    {loading ? 'Validando...' : 'Escanear'}
                </button>
            </form>
        </div>
    );
};