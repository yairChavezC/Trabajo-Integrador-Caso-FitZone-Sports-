import React, { useState, useEffect } from 'react';
import { useAcceso } from '../hooks/useAcceso.js';
import { AforoCard } from '../components/AforoCard.jsx';
import { LectorQRForm } from '../components/LectorQRForm.jsx';
import { httpClient } from '../../../core/api/httpClient.js';

export const AccesoScreen = () => {
    const { loading, error, resultado, registrarIngresoUI } = useAcceso();
    
    const [sedeIdActual, setSedeIdActual] = useState(1);
    const [aforoActual, setAforoActual] = useState(0);
    const [historial, setHistorial] = useState([]);

    /**
     * Sincroniza el aforo y el historial de movimientos de la sucursal desde PostgreSQL.
     */
    const sincronizarEstadoBD = async (sedeId) => {
        try {
            const response = await httpClient.get(`/accesses/estado/${sedeId}`);
            
            // Extracción blindada del payload de respuesta
            const payload = response?.data?.data || response?.data || response;

            if (payload) {
                // Sincronizar Aforo actual
                const aforoServidor = payload.aforoActual ?? payload.aforo;
                if (typeof aforoServidor === 'number') {
                    setAforoActual(aforoServidor);
                }
                
                // Sincronizar Últimos Movimientos
                const movimientosRaw = payload.ultimosMovimientos || payload.movimientos || [];
                if (Array.isArray(movimientosRaw) && movimientosRaw.length > 0) {
                    const movimientosMapeados = movimientosRaw.map(m => {
                        const esSalida = m.fecha_salida !== null && m.fecha_salida !== undefined;
                        const fechaRef = esSalida ? new Date(m.fecha_salida) : new Date(m.fecha_entrada);
                        
                        const nombreUsuario = m.nombre ? m.nombre : `Socio #${m.id_usuario || 'ID'}`;
                        
                        return {
                            id: m.id || Math.random(),
                            hora: !isNaN(fechaRef) ? fechaRef.toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit', second:'2-digit' }) : '--:--',
                            evento: esSalida ? `Salida (${nombreUsuario})` : `Ingreso (${nombreUsuario})`,
                            estado: esSalida ? 'Finalizado' : 'Autorizado'
                        };
                    });
                    setHistorial(movimientosMapeados);
                } else {
                    setHistorial([]);
                }
            }
        } catch (err) {
            console.error("Error al sincronizar con la base de datos:", err);
        }
    };

    // Sincronización automática al cargar el componente o cambiar de sucursal
    useEffect(() => {
        sincronizarEstadoBD(sedeIdActual);
    }, [sedeIdActual]);

    /**
     * Maneja el escaneo del código QR a través del lector.
     */
    const handleEscanearQR = async (qrCode) => {
        try {
            await registrarIngresoUI(qrCode, sedeIdActual);
            await sincronizarEstadoBD(sedeIdActual);
        } catch (err) {
            const nuevoRegistroError = {
                id: Date.now(),
                hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit', second:'2-digit' }),
                evento: 'Escaneo Rechazado / Denegado',
                estado: 'Rechazado'
            };
            setHistorial(prev => [nuevoRegistroError, ...prev].slice(0, 5));
        }
    };

    /**
     * Maneja el ajuste manual del aforo y simula el registro en la vista.
     */
    const handleAjusteManual = (tipo) => {
        if (tipo === 'ingreso') {
            setAforoActual(prev => prev + 1);
            setHistorial(prev => [{
                id: Date.now(),
                hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit', second:'2-digit' }),
                evento: 'Ingreso Manual (Sin QR)',
                estado: 'Autorizado'
            }, ...prev].slice(0, 5));
        } else if (tipo === 'salida') {
            setAforoActual(prev => Math.max(0, prev - 1));
            setHistorial(prev => [{
                id: Date.now(),
                hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit', second:'2-digit' }),
                evento: 'Salida Manual',
                estado: 'Finalizado'
            }, ...prev].slice(0, 5));
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* Encabezado con selector de sucursales */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0, color: '#2c3e50' }}>Panel de Recepción</h2>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#666' }}>Sucursal Actual:</span>
                    <select 
                        value={sedeIdActual} 
                        onChange={(e) => setSedeIdActual(Number(e.target.value))}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', outline: 'none' }}
                    >
                        <option value={1}>Sede Centro (Concordia)</option>
                        <option value={2}>Sede Costanera</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
                
                {/* Columna Izquierda: Lector QR y Alertas */}
                <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column' }}>
                    <LectorQRForm 
                        onEscanear={handleEscanearQR} 
                        loading={loading} 
                    />
                    
                    {/* Alertas dinámicas de estado */}
                    <div style={{ minHeight: '80px', marginTop: '1rem' }}>
                        {error && (
                            <div style={{ 
                                padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', 
                                borderRadius: '8px', borderLeft: '4px solid #c62828', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                <strong>Acceso Denegado: </strong> 
                                {typeof error === 'string' ? error : error.message}
                            </div>
                        )}

                        {resultado && resultado.autorizado && (
                            <div style={{ 
                                padding: '1rem', 
                                backgroundColor: resultado.tipoAccion === 'ingreso' ? '#e8f5e9' : '#e3f2fd', 
                                color: resultado.tipoAccion === 'ingreso' ? '#2e7d32' : '#0d47a1', 
                                borderRadius: '8px', 
                                borderLeft: `5px solid ${resultado.tipoAccion === 'ingreso' ? '#2e7d32' : '#1976d2'}`, 
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                                <strong style={{ fontSize: '1.05rem' }}>
                                    {resultado.tipoAccion === 'ingreso' ? '✅ ¡Ingreso Autorizado! ' : '👋 ¡Salida Registrada! '}
                                </strong> 
                                <br/>
                                {resultado.tipoAccion === 'ingreso' 
                                    ? 'El socio ingresó correctamente a las instalaciones. El aforo ha sumado +1.' 
                                    : 'El socio se ha retirado de la sucursal. El aforo se ha liberado en -1.'
                                }
                            </div>
                        )}
                    </div>
                </div>

                {/* Columna Derecha: Tarjeta de Aforo */}
                <div style={{ flex: '1 1 350px' }}>
                    <AforoCard 
                        aforoActual={aforoActual} 
                        aforoMaximo={100} 
                        onAjusteManual={handleAjusteManual}
                    />
                </div>
            </div>

            {/* Historial en vivo sincronizado con la base de datos */}
            <div style={{ marginTop: '2rem', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#495057' }}>Últimos Movimientos en Puerta (Sincronizado con BD)</h3>
                </div>
                
                {historial.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#adb5bd' }}>
                        No hay ingresos recientes registrados en esta sucursal.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#fdfdfd', color: '#6c757d', fontSize: '0.9rem' }}>
                                <th style={{ padding: '12px 1rem', borderBottom: '2px solid #eee' }}>Hora</th>
                                <th style={{ padding: '12px 1rem', borderBottom: '2px solid #eee' }}>Evento</th>
                                <th style={{ padding: '12px 1rem', borderBottom: '2px solid #eee' }}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historial.map((mov) => (
                                <tr key={mov.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px 1rem', fontWeight: '500', color: '#495057' }}>{mov.hora}</td>
                                    <td style={{ padding: '12px 1rem', color: '#212529' }}>{mov.evento}</td>
                                    <td style={{ padding: '12px 1rem' }}>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold',
                                            backgroundColor: mov.estado === 'Autorizado' ? '#e8f5e9' : '#e3f2fd',
                                            color: mov.estado === 'Autorizado' ? '#2e7d32' : '#0d47a1'
                                        }}>
                                            {mov.estado}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};