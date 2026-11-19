import { useState } from 'react';
import { useClases } from '../hooks/useClases';
import { useSede } from '../../../shared/context/SedeContext';
import ClaseForm from '../components/ClaseForm';
import ClaseTable from '../components/ClaseTable';
import ConfirmDialog from '../components/ConfirmDialog';
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
  const { sedeSeleccionada, cargando } = useSede();

  if (cargando) return <p className="clases-empty">Cargando sede...</p>;

  return <ClasesScreenContent key={sedeSeleccionada?.id ?? 'sin-sede'} />;
}

function ClasesScreenContent() {
  const { sedes, sedeSeleccionada } = useSede();
  const [incluirPasadas, setIncluirPasadas] = useState(false);
  const {
    clases,
    loading,
    hasLoaded,
    error,
    actionError,
    addClase,
    editClase,
    removeClase,
    isActionPending,
    inscriptosPorClase,
    cargandoInscriptosPorClase,
    errorInscriptosPorClase,
    cargarInscriptos
  } = useClases({ incluirPasadas });
  const sedesAgenda = sedeSeleccionada ? [sedeSeleccionada] : sedes;
  const [formData, setFormData] = useState({
    ...initialForm,
    idSede: sedeSeleccionada?.id ? String(sedeSeleccionada.id) : ''
  });
  const [editingId, setEditingId] = useState(null);
  const [fechaInicioOriginal, setFechaInicioOriginal] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmandoEliminacion, setConfirmandoEliminacion] = useState(false);
  const [idAEliminar, setIdAEliminar] = useState(null);

  const resetForm = () => {
    setFormData({
      ...initialForm,
      idSede: sedeSeleccionada?.id ? String(sedeSeleccionada.id) : ''
    });
    setEditingId(null);
    setFechaInicioOriginal('');
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
    const fechaInicio = formatForInput(clase.fechaInicio);
    setEditingId(clase.id);
    setFechaInicioOriginal(fechaInicio);
    setFormData({
      idSede: String(clase.idSede),
      nombre: clase.nombre,
      profesor: clase.profesor,
      cupo: String(clase.cupo),
      fechaInicio,
      fechaFin: formatForInput(clase.fechaFin)
    });
  };

  const solicitarEliminacion = (id) => {
    setIdAEliminar(id);
    setConfirmandoEliminacion(true);
  };

  const confirmarEliminacion = async () => {
    if (idAEliminar != null) {
      await removeClase(idAEliminar);
    }
    setIdAEliminar(null);
    setConfirmandoEliminacion(false);
  };

  const agendaCargada = hasLoaded || clases.length > 0;
  if (loading && !agendaCargada) return <p className="clases-empty">Cargando clases...</p>;
  if (error && !agendaCargada) {
    return <p className="clases-alert" role="alert">No se pudo cargar la agenda de clases: {error}</p>;
  }

  return (
    <div className="clases-container">
      <div className="clases-header">
        <h2>Clases grupales</h2>
        <p>Programá las clases de la sede seleccionada y actualizá sus horarios y capacidad.</p>
      </div>

      {error && (
        <div className="clases-alert" role="alert">
          No se pudo actualizar la agenda de clases. Se conserva el estado cargado: {error}
        </div>
      )}
      {actionError && <div className="clases-alert" role="alert">{actionError}</div>}

      <section aria-labelledby="gestion-agenda-title" className="gestion-agenda-section">
        <div className="clases-section-heading">
          <div>
            <h3 id="gestion-agenda-title">Administrar agenda</h3>
            <p>Creá clases con disciplina, instructor, horario, sede y capacidad máxima.</p>
          </div>
          <label className="clases-filtro-pasadas">
            <input
              type="checkbox"
              checked={incluirPasadas}
              onChange={(event) => setIncluirPasadas(event.target.checked)}
            />
            Incluir clases pasadas
          </label>
        </div>

        <div className="gestion-form-wrapper">
          <ClaseForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            isEditing={!!editingId}
            fechaInicioOriginal={fechaInicioOriginal}
            sedes={sedesAgenda}
            guardando={guardando}
            onCancel={resetForm}
          />
        </div>

        <div className="gestion-lista-wrapper">
          <div className="clases-section-heading">
            <div>
              <h3>Clases registradas</h3>
              <p>Listado de clases programadas en la sede seleccionada.</p>
            </div>
          </div>
          <ClaseTable
            clases={clases}
            modoAdministracion
            onDelete={solicitarEliminacion}
            onEdit={handleEdit}
            isActionPending={isActionPending}
            inscriptosPorClase={inscriptosPorClase}
            cargandoInscriptosPorClase={cargandoInscriptosPorClase}
            errorInscriptosPorClase={errorInscriptosPorClase}
            onLoadInscriptos={cargarInscriptos}
          />
        </div>

        <ConfirmDialog
          open={confirmandoEliminacion}
          title="Eliminar clase"
          message="¿Querés eliminar esta clase de la agenda?"
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmarEliminacion}
          onCancel={() => {
            setIdAEliminar(null);
            setConfirmandoEliminacion(false);
          }}
        />
      </section>
    </div>
  );
}
