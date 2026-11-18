
import React, { useState, useEffect, useCallback } from 'react';
import { useAcceso } from '../hooks/useAcceso.js';
import { AforoCard } from '../components/AforoCard.jsx';
import { LectorQRForm } from '../components/LectorQRForm.jsx';
import { HistorialAccesosTable } from '../components/HistorialAccesosTable.jsx';
import { IngresoExternoModal } from '../components/IngresoExternoModal.jsx';
import { Snackbar } from '../components/Snackbar.jsx';
import { useSede } from '../../../shared/context/SedeContext.jsx';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { accesoService } from '../services/accesoService.js';
import { SocioDashboard } from './SocioDashboard.jsx';
import './AccesoScreen.css';

const mapearMovimientoPuerta = (m) => {
    const esSalida = m.fecha_salida !== null && m.fecha_salida !== undefined;
    const fechaRef = esSalida ? new Date(m.fecha_salida) : new Date(m.fecha_entrada);
    const nombreUsuario = m.nombre ? m.nombre : `Socio #${m.id_usuario || 'ID'}`;

    return {
        id: m.id || Math.random(),
        hora: !isNaN(fechaRef)
            ? fechaRef.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
            : '--:--',
        evento: esSalida ? `Salida (${nombreUsuario})` : `Ingreso (${nombreUsuario})`,
        estado: esSalida ? 'Finalizado' : 'Autorizado'
    };
};

export const AccesoScreen = () => {
    const { usuario } = useAuth();
    const rolNumerico = Number(usuario?.rol) || Number(usuario?.id_rol) || 3;

    const { loading, registrarIngresoUI } = useAcceso();
    const { sedeSeleccionada } = useSede();
    const sedeIdActual = sedeSeleccionada?.id || 1;

    const [aforoActual, setAforoActual] = useState(0);
    const [aforoMaximo, setAforoMaximo] = useState(100);
    const [historial, setHistorial] = useState([]);
    const [showModalExterno, setShowModalExterno] = useState(false);
    const [loadingExterno, setLoadingExterno] = useState(false);

    // Estado del Snackbar
    const [aviso, setAviso] = useState({
        open: false,
        type: 'info',
        message: ''
    });

    const mostrarAviso = (type, message) => {
        setAviso({
            open: true,
            type,
            message
        });
    };

    const cerrarAviso = useCallback(() => {
        setAviso(prev => ({
            ...prev,
            open: false
        }));
    }, []);

    const sincronizarEstadoBD = async (sedeId) => {
        try {
            const payload = await accesoService.obtenerEstadoSede(sedeId);
            if (!payload) return;

            const aforoServidor = payload.aforoActual ?? payload.aforo;

            if (typeof aforoServidor === 'number') {
                setAforoActual(aforoServidor);
            }

            if (typeof payload.aforoMaximo === 'number') {
                setAforoMaximo(payload.aforoMaximo);
            }

            const movimientosRaw = payload.ultimosMovimientos || payload.movimientos || [];

            setHistorial(
                Array.isArray(movimientosRaw)
                    ? movimientosRaw.map(mapearMovimientoPuerta)
                    : []
            );

        } catch (err) {
            console.error('Error al sincronizar con la base de datos:', err);
        }
    };

    useEffect(() => {
        if (sedeSeleccionada?.cupo) {
            setAforoMaximo(Number(sedeSeleccionada.cupo));
        }

        if (sedeIdActual && rolNumerico !== 3) {
            sincronizarEstadoBD(sedeIdActual);
        }
    }, [sedeIdActual, sedeSeleccionada, rolNumerico]);

    // Registro de ingreso o salida mediante QR
    const handleEscanearQR = async (qrCode) => {
        try {
            const res = await registrarIngresoUI(qrCode, sedeIdActual);

            if (typeof res?.aforoActual === 'number') {
                setAforoActual(res.aforoActual);
            }

            await sincronizarEstadoBD(sedeIdActual);

            if (res?.autorizado === false) {
                mostrarAviso(
                    'error',
                    res?.mensaje || 'Acceso denegado.'
                );
                return;
            }

            const mensaje = res?.mensaje || (
                res?.tipoAccion === 'salida'
                    ? 'Salida registrada correctamente.'
                    : 'Ingreso autorizado correctamente.'
            );

            mostrarAviso(
                'success',
                mensaje
            );

        } catch (err) {
            const nuevoRegistroError = {
                id: Date.now(),
                hora: new Date().toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                evento: 'Escaneo Rechazado / Denegado',
                estado: 'Rechazado'
            };

            setHistorial(prev => [nuevoRegistroError, ...prev].slice(0, 5));

            mostrarAviso(
                'error',
                err?.message || 'No se pudo registrar el acceso.'
            );
        }
    };

    // Registro de ingreso de cliente externo
    const handleIngresoExterno = async (datos) => {
        setLoadingExterno(true);

        try {
            const res = await accesoService.registrarIngresoExterno(
                datos,
                sedeIdActual
            );

            const payload = res?.data || res;

            setShowModalExterno(false);

            await sincronizarEstadoBD(sedeIdActual);

            mostrarAviso(
                'success',
                payload?.mensaje || 'El cliente externo fue registrado correctamente.'
            );

        } catch (err) {
            mostrarAviso(
                'error',
                err?.message || 'No se pudo registrar el cliente externo.'
            );

        } finally {
            setLoadingExterno(false);
        }
    };

    if (rolNumerico === 3) {
        return <SocioDashboard />;
    }

    return (
        <div className="acceso-screen-container">

            <header className="acceso-header">
                <div>
                    <h2 className="acceso-title">Panel de Recepción</h2>

                    <p className="acceso-subtitle">
                        Control de accesos de{' '}
                        <strong>
                            {sedeSeleccionada
                                ? `${sedeSeleccionada.nombre} (${sedeSeleccionada.ciudad})`
                                : 'Cargando...'}
                        </strong>
                    </p>
                </div>

                <button
                    onClick={() => setShowModalExterno(true)}
                    className="acceso-btn-externo"
                >
                    + Ingreso Externo
                </button>
            </header>

            <div className="acceso-grid">

                <div className="acceso-col-scanner">
                    <LectorQRForm
                        onEscanear={handleEscanearQR}
                        loading={loading}
                    />
                </div>

                <div className="acceso-col-aforo">
                    <AforoCard
                        aforoActual={aforoActual}
                        aforoMaximo={aforoMaximo}
                    />
                </div>

            </div>

            <HistorialAccesosTable historial={historial} />

            {showModalExterno && (
                <IngresoExternoModal
                    onClose={() => setShowModalExterno(false)}
                    onGuardar={handleIngresoExterno}
                    loading={loadingExterno}
                />
            )}

            {/* Avisos de ingreso, salida y errores */}
            <Snackbar
                open={aviso.open}
                type={aviso.type}
                message={aviso.message}
                onClose={cerrarAviso}
            />

        </div>
    );
};
