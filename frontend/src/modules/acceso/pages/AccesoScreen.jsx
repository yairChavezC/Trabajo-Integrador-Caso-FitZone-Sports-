// 1. Importamos el Hook (T07) y los Componentes (T08)
import { useAcceso } from '../hooks/useAcceso.js';
import { AforoCard } from '../components/AforoCard.jsx';
import { LectorQRForm } from '../components/LectorQRForm.jsx';

export const AccesoScreen = () => {
    // 2. Traemos los estados y la función de nuestro Hook
    const { loading, error, resultado, registrarIngresoUI } = useAcceso();

    // 3. Función puente: conecta el formulario visual con la petición al backend
    const handleEscanearQR = (qrCode) => {
        // En una app real, el ID de la sede lo sacarías del contexto del recepcionista logueado.
        // Por ahora lo hardcodeamos en 1 para poder probarlo.
        const sedeIdActual = 1; 
        
        // Llamamos a la función del Hook
        registrarIngresoUI(qrCode, sedeIdActual);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '2rem' }}>
                Panel de Recepción: Control de Acceso
            </h2>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                
                {/* Columna Izquierda: Lector QR y Mensajes de Feedback */}
                <div style={{ flex: '1 1 400px' }}>
                    <LectorQRForm 
                        onEscanear={handleEscanearQR} 
                        loading={loading} 
                    />
                    
                    {/* Alertas dinámicas basadas en los estados del Hook */}
                    {error && (
                        <div style={{ 
                            marginTop: '1rem', padding: '1rem', 
                            backgroundColor: '#ffebee', color: '#c62828', 
                            borderRadius: '4px', borderLeft: '4px solid #c62828' 
                        }}>
                            <strong>Acceso Denegado: </strong> 
                            {typeof error === 'string' ? error : error.message}
                        </div>
                    )}

                    {resultado && !error && (
                        <div style={{ 
                            marginTop: '1rem', padding: '1rem', 
                            backgroundColor: '#e8f5e9', color: '#2e7d32', 
                            borderRadius: '4px', borderLeft: '4px solid #2e7d32'
                        }}>
                            <strong>¡Acceso Autorizado! </strong> 
                            El socio ingresó correctamente.
                        </div>
                    )}
                </div>

                {/* Columna Derecha: Tarjeta de Aforo en tiempo real */}
                <div style={{ flex: '1 1 300px' }}>
                    <AforoCard 
                        // Si ya escaneamos a alguien, mostramos el aforo actualizado del backend. 
                        // Si no, arranca en 0 (o lo que decidan inicializar).
                        aforoActual={resultado?.aforoActual || 0} 
                        aforoMaximo={100} 
                    />
                </div>

            </div>
        </div>
    );
};