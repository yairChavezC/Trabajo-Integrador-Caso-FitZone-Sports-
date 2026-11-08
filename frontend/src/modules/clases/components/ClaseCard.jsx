import { useState } from 'react';
import { getInscripcionesClase } from '../services/claseService';
import { estadoLabel, formatoFecha, formatoHora } from '../utils/claseUtils';
import InscriptosList from './InscriptosList';

export default function ClaseCard({
  clase,
  modoAdministracion,
  soloLectura,
  onReservar,
  onCancelar,
  onListaEspera,
  onAceptarOferta,
  onDelete,
  onEdit,
  isActionPending
}) {
  const [inscriptos, setInscriptos] = useState(null);
  const [cargandoInscriptos, setCargandoInscriptos] = useState(false);
  const [errorInscriptos, setErrorInscriptos] = useState(null);
  const mia = clase.miInscripcion;
  const llena = Number(clase.cupoDisponible) <= 0;
  const puedeMostrarAcciones = !modoAdministracion && !soloLectura;
  const estaPendiente = (accion) => isActionPending?.(accion, clase.id) ?? false;

  const toggleInscriptos = async () => {
    if (inscriptos) {
      setInscriptos(null);
      return;
    }

    try {
      setCargandoInscriptos(true);
      setErrorInscriptos(null);
      const resultado = await getInscripcionesClase(clase.id);
      setInscriptos(Array.isArray(resultado) ? resultado : resultado?.data ?? []);
    } catch (error) {
      setErrorInscriptos(error.message);
    } finally {
      setCargandoInscriptos(false);
    }
  };

  const confirmarCancelacion = () => {
    const mensaje = mia.estado === 'confirmado'
      ? '¿Querés cancelar esta reserva?'
      : mia.estado === 'notificado'
        ? '¿Querés rechazar el lugar ofrecido?'
        : '¿Querés salir de la lista de espera?';
    if (window.confirm(mensaje)) onCancelar(clase.id);
  };

  return (
    <article className="clase-card">
      <h3>{clase.nombre}</h3>
      <p><strong>Instructor:</strong> {clase.profesor}</p>
      <p>
        <strong>Horario:</strong> {formatoFecha(clase.fechaInicio)} — {formatoHora(clase.fechaFin)}
      </p>
      <p><strong>Lugares:</strong> {clase.cupoDisponible ?? clase.cupo} disponibles de {clase.cupo}</p>
      <p><strong>Sede:</strong> {clase.sede || `Sede ${clase.idSede}`}</p>
      {!modoAdministracion && mia && (
        <p className="clase-estado">{estadoLabel(mia)}</p>
      )}

      <div className="clase-actions">
        {puedeMostrarAcciones && !mia && !llena && (
          <button
            type="button"
            disabled={!clase.puedeReservar || estaPendiente('reservar')}
            onClick={() => onReservar(clase.id)}
          >
            {estaPendiente('reservar') ? 'Reservando...' : 'Reservar lugar'}
          </button>
        )}
        {puedeMostrarAcciones && !mia && llena && (
          <button
            type="button"
            disabled={!clase.puedeAnotarseListaEspera || estaPendiente('lista-espera')}
            onClick={() => onListaEspera(clase.id)}
          >
            {estaPendiente('lista-espera') ? 'Anotando...' : 'Sumarme a la lista de espera'}
          </button>
        )}
        {puedeMostrarAcciones && mia?.estado === 'notificado' && (
          <button
            type="button"
            disabled={!clase.puedeAceptarOferta || estaPendiente('aceptar-oferta')}
            onClick={() => onAceptarOferta(clase.id)}
          >
            {estaPendiente('aceptar-oferta') ? 'Aceptando...' : 'Aceptar lugar ofrecido'}
          </button>
        )}
        {puedeMostrarAcciones && mia && (
          <button
            type="button"
            className="btn-secondary"
            disabled={!clase.puedeCancelar || estaPendiente('cancelar')}
            onClick={confirmarCancelacion}
          >
            {estaPendiente('cancelar')
              ? 'Cancelando...'
              : mia.estado === 'notificado'
                ? 'Rechazar lugar ofrecido'
                : mia.estado === 'en espera'
                  ? 'Salir de la lista de espera'
                  : 'Cancelar reserva'}
          </button>
        )}
        {modoAdministracion && (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={toggleInscriptos}
              disabled={cargandoInscriptos}
            >
              {cargandoInscriptos
                ? 'Cargando...'
                : inscriptos
                  ? 'Ocultar inscriptos'
                  : 'Ver inscriptos'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => onEdit(clase)}>
              Editar
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => onDelete(clase.id)}
              disabled={estaPendiente('eliminar')}
            >
              {estaPendiente('eliminar') ? 'Eliminando...' : 'Eliminar'}
            </button>
          </>
        )}
      </div>

      {errorInscriptos && <p className="clases-alert" role="alert">{errorInscriptos}</p>}
      {modoAdministracion && inscriptos && <InscriptosList inscriptos={inscriptos} />}
    </article>
  );
}
