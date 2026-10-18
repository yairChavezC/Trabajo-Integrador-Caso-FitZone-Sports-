import { useState } from 'react';
import { useClases } from '../hooks/useClases';
import { useSede } from '../../../shared/context/SedeContext';
import { useAuth } from '../../../core/auth/AuthContext';
import ClaseForm from '../components/ClaseForm';
import ClaseTable from '../components/ClaseTable';
import './ClasesScreen.css';

const initialForm = {
  idSede: '',
  nombre: '',
  profesor: '',
  cupo: '',
  fechaInicio: '',
  fechaFin: ''
};

export default function ClasesScreen() {
  const { sedes, sedeSeleccionada } = useSede();
  const { usuario } = useAuth();
  const esAdministrador = Number(usuario?.rol) === 1;
  const {
    clases,
    loading,
    error,
    actionError,
    notificaciones,
    notificationError,
    marcarNotificacionLeida,
    addClase,
    editClase,
    removeClase,
    reservar,
    cancelar,
    listaEspera
  } = useClases();
  const [formData, setFormData] = useState({
    ...initialForm,
    idSede: sedeSeleccionada?.id ? String(sedeSeleccionada.id) : ''
  });
  const [editingId, setEditingId] = useState(null);
  const [pestana, setPestana] = useState('agenda');
  const [guardando, setGuardando] = useState(false);

  const resetForm = () => {
    setFormData({
      ...initialForm,
      idSede: sedeSeleccionada?.id ? String(sedeSeleccionada.id) : ''
    });
    setEditingId(null);
  };

  const formatForInput = (date) => {
    if (!date) return '';
    const local = new Date(date);
    const offset = local.getTimezoneOffset();
    return new Date(local.getTime() - offset * 60000).toISOString().slice(0, 16);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setGuardando(true);
      const payload = {
        idSede: Number(formData.idSede),
        nombre: formData.nombre.trim(),
        profesor: formData.profesor.trim(),
        cupo: Number(formData.cupo),
        fechaInicio: new Date(formData.fechaInicio).toISOString(),
        fechaFin: new Date(formData.fechaFin).toISOString()
      };

      const resultado = editingId
        ? await editClase(editingId, payload)
        : await addClase(payload);

      if (resultado) resetForm();
    } finally {
      setGuardando(false);
    }
  };

  const handleEdit = (clase) => {
    setEditingId(clase.id);
    setFormData({
      idSede: String(clase.idSede),
      nombre: clase.nombre,
      profesor: clase.profesor,
      cupo: String(clase.cupo),
      fechaInicio: formatForInput(clase.fechaInicio),
      fechaFin: formatForInput(clase.fechaFin)
    });
    setPestana('gestion');
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Querés eliminar esta clase de la agenda?')) {
      await removeClase(id);
    }
  };

  const handleTabKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    const tabs = Array.from(event.currentTarget.querySelectorAll('[role="tab"]'));
    const indiceActual = tabs.indexOf(event.target);
    const avance = event.key === 'ArrowRight' ? 1 : -1;
    const indiceSiguiente = (indiceActual + avance + tabs.length) % tabs.length;
    const siguienteTab = tabs[indiceSiguiente];
    const siguiente = siguienteTab.id === 'tab-gestion' ? 'gestion' : 'agenda';

    event.preventDefault();
    setPestana(siguiente);
    siguienteTab.focus();
  };

  if (loading) return <p className="clases-empty">Cargando clases...</p>;
  if (error) return <p className="clases-alert">Error: {error}</p>;

  return (
    <div className="clases-container">
      <div className="clases-header">
        <p className="clases-eyebrow">FITZONE SPORTS · MÓDULO 3</p>
        <h2>Clases grupales</h2>
        <p>
          Encontrá una clase, revisá los lugares disponibles y gestioná tu inscripción.
        </p>
      </div>

      <div
        className="clases-tabs"
        role="tablist"
        aria-label="Secciones de clases grupales"
        onKeyDown={handleTabKeyDown}
      >
        <button
          id="tab-agenda"
          className={pestana === 'agenda' ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={pestana === 'agenda'}
          aria-controls="panel-agenda"
          onClick={() => setPestana('agenda')}
        >
          Agenda y reservas
        </button>
        {esAdministrador && (
          <button
            id="tab-gestion"
            className={pestana === 'gestion' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={pestana === 'gestion'}
            aria-controls="panel-gestion"
            onClick={() => setPestana('gestion')}
          >
            Administrar agenda
          </button>
        )}
      </div>

      {actionError && <div className="clases-alert" role="alert">{actionError}</div>}
      {notificationError && <div className="clases-alert" role="alert">{notificationError}</div>}
      {!!notificaciones.length && (
        <section className="clases-notifications" aria-label="Notificaciones de clases grupales">
          <h3>Notificaciones</h3>
          {notificaciones.map((notificacion) => (
            <article
              key={notificacion.id}
              className={`clases-notification ${notificacion.leidaAt ? '' : 'unread'}`}
            >
              <div>
                <p>{notificacion.mensaje}</p>
                <time dateTime={notificacion.creadaAt}>
                  {new Intl.DateTimeFormat('es-AR', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  }).format(new Date(notificacion.creadaAt))}
                </time>
              </div>
              {!notificacion.leidaAt && (
                <button
                  type="button"
                  onClick={() => marcarNotificacionLeida(notificacion.id)}
                >
                  Marcar como leída
                </button>
              )}
            </article>
          ))}
        </section>
      )}

      {pestana === 'agenda' && (
        <section id="panel-agenda" role="tabpanel" aria-labelledby="tab-agenda">
          <div className="clases-section-heading">
            <div>
              <h3>Próximas clases</h3>
              <p>Reservá con al menos 48 h de anticipación. Podés cancelar hasta 2 h antes.</p>
            </div>
          </div>
          <ClaseTable
            clases={clases}
            onReservar={reservar}
            onCancelar={cancelar}
            onListaEspera={listaEspera}
          />
        </section>
      )}

      {esAdministrador && pestana === 'gestion' && (
        <section id="panel-gestion" role="tabpanel" aria-labelledby="tab-gestion">
          <div className="clases-section-heading">
            <div>
              <h3>Administrar agenda</h3>
              <p>Creá clases con disciplina, instructor, horario, sede y capacidad máxima.</p>
            </div>
          </div>
          <ClaseForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            isEditing={!!editingId}
            sedes={sedes}
            guardando={guardando}
            onCancel={resetForm}
          />
          <ClaseTable
            clases={clases}
            modoAdministracion
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        </section>
      )}
    </div>
  );
}
