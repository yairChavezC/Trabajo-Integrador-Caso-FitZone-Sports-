import { useState } from 'react';

export const LectorQRForm = ({ onEscanear, loading }) => {
    const [qrCode, setQrCode] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Evitamos enviar si el input está vacío
        if (qrCode.trim() === '') return;
        
        // Ejecutamos la función que nos pasan por "prop" (que luego conectaremos al Hook)
        onEscanear(qrCode);
        
        // Vaciamos el input simulando que el molinete ya está listo para el siguiente socio
        setQrCode(''); 
    };

    return (
        <div style={{ 
            padding: '1.5rem', 
            border: '2px dashed #ccc', 
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
        }}>
            <h3 style={{ marginTop: 0 }}>Simulador de Molinete (RF-04)</h3>
            <p style={{ fontSize: '0.9rem', color: '#555' }}>
                Ingrese el código QR del socio para autorizar el ingreso.
            </p>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
                <input 
                    type="text" 
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    placeholder="Ej: qr-dinamico-xyz123"
                    disabled={loading}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ 
                        padding: '0.5rem 1rem', 
                        backgroundColor: '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Validando...' : 'Escanear QR'}
                </button>
            </form>
        </div>
    );
};