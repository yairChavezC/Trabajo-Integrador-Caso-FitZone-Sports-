import React, { useState, useEffect } from 'react';
import { useAcceso } from '../hooks/useAcceso.js';
import { AforoCard } from '../components/AforoCard.jsx';
import { LectorQRForm } from '../components/LectorQRForm.jsx';
import { IngresoExternoModal } from '../components/IngresoExternoModal.jsx';
import { httpClient } from '../../../core/api/httpClient.js';
import { useSede } from '../../../shared/context/SedeContext.jsx';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { accesoService } from '../services/accesoService.js';
import { SocioDashboard } from './SocioDashboard.jsx';

export const AccesoScreen = () => {
    const { usuario } = useAuth();
    const rolNumerico = Number(usuario?.rol) || Number(usuario?.id_rol) || 3;

    const { loading, error, resultado, registrarIngresoUI } = useAcceso();
    const { sedeSeleccionada } = useSede();
    const sedeIdActual = sedeSeleccionada?.id || 1;

    const [aforoActual, setAforoActual] = useState(0);
    const [historial, setHistorial] = useState([]);
    const [showModalExterno, setShowModalExterno] = useState(false);
    const [loadingExterno, setLoadingExterno] = useState(false);

    const sincronizarEstadoBD = async (sedeId) => {
        try {
            const response = await httpClient.get(`/accesses/estado/${sedeId}`);
            const payload = response?.data?.data || response?.data || response;

            if (payload) {
                const aforoServidor = payload.aforoActual ?? payload.aforo;
                if (typeof aforoServidor === 'number') {
                    setAforoActual(aforoServidor);
                }
                
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

    useEffect(() => {
        if (sedeIdActual && rolNumerico !== 3) {
            sincronizarEstadoBD(sedeIdActual);
        }
    }, [sedeIdActual, rolNumerico]);

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

    const handleIngresoExterno = async (datos) => {
        setLoadingExterno(true);
        try {
            await accesoService.registrarIngresoExterno(datos, sedeIdActual);
            setHistorial(prev => [{ 
                id: Date.now(), 
                hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit', second:'2-digit' }), 
                evento: `Ingreso Externo (${datos.nombre})`, 
                estado: 'Autorizado' 
            }, ...prev].slice(0, 5));
            setShowModalExterno(false);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoadingExterno(false);
        }
    };

    if (rolNumerico === 3) {
        return <SocioDashboard />;
    }

    return (
        <div style={{ padding: '2rem 3rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f3f4f6', paddingBottom: '1rem', marginBottom: '2.5rem' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#111827', fontSize: '1.8rem', fontWeight: '700' }}>Panel de Recepción</h2>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.95rem' }}>
                        Control de accesos de <strong>{sedeSeleccionada ? `${sedeSeleccionada.nombre} (${sedeSeleccionada.ciudad})` : 'Cargando...'}</strong>
                    </p>
                </div>
                <button 
                    onClick={() => setShowModalExterno(true)} 
                    style={{ padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
                >
                    + Ingreso Externo
                </button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
                <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column' }}>
                    <LectorQRForm 
                        onEscanear={handleEscanearQR} 
                        loading={loading} 
                    />
                    
                    <div style={{ minHeight: '80px', marginTop: '1.5rem' }}>
                        {error && (
                            <div style={{ padding: '1.25rem', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '12px', borderLeft: '4px solid #ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <strong style={{ fontSize: '1.05rem' }}>❌ Acceso Denegado: </strong> 
                                {typeof error === 'string' ? error : error.message}
                            </div>
                        )}

                        {resultado && resultado.autorizado && (
                            <div style={{ padding: '1.25rem', backgroundColor: resultado.tipoAccion === 'ingreso' ? '#f0fdf4' : '#eff6ff', color: resultado.tipoAccion === 'ingreso' ? '#166534' : '#1e40af', borderRadius: '12px', borderLeft: `5px solid ${resultado.tipoAccion === 'ingreso' ? '#22c55e' : '#3b82f6'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <strong style={{ fontSize: '1.1rem' }}>
                                    {resultado.tipoAccion === 'ingreso' ? '✅ ¡Ingreso Autorizado! ' : '👋 ¡Salida Registrada! '}
                                </strong> 
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
                                    {resultado.tipoAccion === 'ingreso' 
                                        ? 'El socio ingresó correctamente a las instalaciones. El aforo ha sumado +1.' 
                                        : 'El socio se ha retirado de la sucursal. El aforo se ha liberado en -1.'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: '1 1 350px' }}>
                    <AforoCard 
                        aforoActual={aforoActual} 
                        aforoMaximo={100} 
                    />
                </div>
            </div>

            <div style={{ marginTop: '2.5rem', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '1.25rem', borderBottom: '1px solid #e5e7eb' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1f2937', fontWeight: '600' }}>Últimos Movimientos en Puerta</h3>
                </div>
                
                {historial.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '1rem' }}>
                        No hay ingresos recientes registrados en esta sucursal.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb', color: '#6b7280', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>Hora</th>
                                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>Evento</th>
                                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historial.map((mov) => (
                                <tr key={mov.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }}>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#374151' }}>{mov.hora}</td>
                                    <td style={{ padding: '1rem 1.5rem', color: '#4b5563' }}>{mov.evento}</td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '700',
                                            backgroundColor: mov.estado === 'Autorizado' ? '#dcfce7' : mov.estado === 'Finalizado' ? '#e0e7ff' : '#fee2e2',
                                            color: mov.estado === 'Autorizado' ? '#166534' : mov.estado === 'Finalizado' ? '#3730a3' : '#b91c1c'
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

            {showModalExterno && (
                <IngresoExternoModal 
                    onClose={() => setShowModalExterno(false)} 
                    onGuardar={handleIngresoExterno} 
                    loading={loadingExterno} 
                />
            )}
        </div>
    );
};