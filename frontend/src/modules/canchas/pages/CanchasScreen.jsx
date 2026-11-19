import React, { useState, useEffect } from 'react';
import { useSede } from '../../../shared/context/SedeContext';
import { CanchasFiltros } from '../components/CanchasFiltros';
import { CanchaCard } from '../components/CanchaCard';
import { CanchaDrawer } from '../components/CanchaDrawer';
import { ModalCheckoutReserva } from '../components/ModalCheckoutReserva';
import { MensajeFlotante } from '../../../shared/components/MensajeFlotante';
import { procesarCheckoutReserva } from '../services/reservaCanchaService';
import { useCanchasDisponibilidad } from '../hooks/useCanchasDisponibilidad';
import { useCanchasFiltradas } from '../hooks/useCanchasFiltradas';
import './CanchasScreen.css';

export default function CanchasScreen() {
  const { sedeSeleccionada } = useSede();
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(null);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [procesandoReserva, setProcesandoReserva] = useState(false);
  const [mensajeFlotante, setMensajeFlotante] = useState(null);

  const { canchas, cargando, recargar } = useCanchasDisponibilidad(
    sedeSeleccionada?.id,
    fecha
  );

  const {
    filtroTipo,
    paginaActual,
    totalPaginas,
    canchasFiltradas,
    canchasPaginadas,
    setPaginaActual,
    handleCambiarFiltro,
  } = useCanchasFiltradas(canchas, 3);

  // Sincronizar la cancha abierta en el Drawer si la lista cambia
  useEffect(() => {
    if (canchaSeleccionada) {
      const actualizada = canchas.find((c) => c.id === canchaSeleccionada.id);
      setCanchaSeleccionada(actualizada || null);
    }
  }, [canchas]);

  const handleAbrirCheckout = (slot) => {
    setSlotSeleccionado(slot);
  };

  const handleConfirmarReserva = async ({ metodoPago, monto }) => {
    if (!canchaSeleccionada || !slotSeleccionado) return;

    try {
      setProcesandoReserva(true);

      const fechaInicio = `${fecha}T${slotSeleccionado.inicio}:00`;
      const fechaFin = `${fecha}T${slotSeleccionado.fin}:00`;

      await procesarCheckoutReserva({
        idCancha: canchaSeleccionada.id,
        fechaInicio,
        fechaFin,
        monto,
        metodoPago,
      });

      setSlotSeleccionado(null);
      setCanchaSeleccionada(null);

      setMensajeFlotante({
        tipo: 'exito',
        mensaje: '¡Turno reservado y pago registrado correctamente!',
      });

      await recargar({ forzarRecarga: true });
    } catch (error) {
      console.error('Fallo en la reserva:', error);
      setMensajeFlotante({
        tipo: 'error',
        mensaje: error.message || 'Error al procesar la reserva.',
      });
    } finally {
      setProcesandoReserva(false);
    }
  };

  return (
    <div className="canchas-container">
      <div className="canchas-header-simple">
        <h2>Canchas</h2>
        <p>Seleccioná una cancha para consultar horarios disponibles y tarifas.</p>
      </div>

      <CanchasFiltros
        canchas={canchas}
        filtroTipo={filtroTipo}
        onSelectFiltro={handleCambiarFiltro}
        fecha={fecha}
        onChangeFecha={setFecha}
      />

      {cargando ? (
        <div className="canchas-empty">Cargando catálogo de canchas...</div>
      ) : canchasFiltradas.length === 0 ? (
        <div className="canchas-empty">
          No hay canchas disponibles para los filtros seleccionados.
        </div>
      ) : (
        <>
          <div className="catalogo-canchas-grid">
            {canchasPaginadas.map((cancha) => (
              <CanchaCard
                key={cancha.id}
                cancha={cancha}
                alSeleccionar={(c) => setCanchaSeleccionada(c)}
              />
            ))}
          </div>

          {/* Barra de Paginación */}
          {totalPaginas > 1 && (
            <div className="canchas-paginacion">
              <button
                type="button"
                className="btn-paginacion"
                disabled={paginaActual === 1}
                onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
              >
                ← Anterior
              </button>

              <div className="paginacion-indicadores">
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`btn-pagina-numero ${paginaActual === num ? 'activo' : ''}`}
                    onClick={() => setPaginaActual(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn-paginacion"
                disabled={paginaActual === totalPaginas}
                onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      <CanchaDrawer
        cancha={canchaSeleccionada}
        fecha={fecha}
        alCerrar={() => setCanchaSeleccionada(null)}
        alReservarSlot={handleAbrirCheckout}
      />

      {slotSeleccionado && (
        <ModalCheckoutReserva
          cancha={canchaSeleccionada}
          slot={slotSeleccionado}
          fecha={fecha}
          cargando={procesandoReserva}
          alCerrar={() => setSlotSeleccionado(null)}
          alConfirmar={handleConfirmarReserva}
        />
      )}

      {mensajeFlotante && (
        <MensajeFlotante
          tipo={mensajeFlotante.tipo}
          mensaje={mensajeFlotante.mensaje}
          alCerrar={() => setMensajeFlotante(null)}
        />
      )}
    </div>
  );
}