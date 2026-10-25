import { useState } from 'react';
import { useClases } from '../hooks/useClases';
import { useSede } from '../../../shared/context/SedeContext';
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
  const { sedeSeleccionada, cargando } = useSede();

  if (cargando) return <p className="clases-empty">Cargando sede...</p>;

  return <ClasesScreenContent key={sedeSeleccionada?.id ?? 'sin-sede'} />;
}

function ClasesScreenContent() {
  const { sedes, sedeSeleccionada } = useSede();
  const {
    clases,
    loading,
    error,
    actionError,
    addClase,
    editClase,
    removeClase
  } = useClases();
  const sedesAgenda = sedeSeleccionada ? [sedeSeleccionada] : sedes;
  const [formData, setFormData] = useState({
    ...initialForm,
    idSede: sedeSeleccionada?.id ? String(sedeSeleccionada.id) : ''
  });
  const [editingId, setEditingId] = useState(null);
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
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Querés eliminar esta clase de la agenda?')) {
      await removeClase(id);
    }
  };

  if (loading) return <p className="clases-empty">Cargando clases...</p>;
  if (error) return <p className="clases-alert">Error: {error}</p>;

  return (
    <div className="clases-container">
      <div className="clases-header">
        <h2>Clases grupales</h2>
        <p>Programá las clases de la sede seleccionada y actualizá sus horarios y capacidad.</p>
      </div>

      {actionError && <div className="clases-alert" role="alert">{actionError}</div>}

      <section aria-labelledby="gestion-agenda-title">
        <div className="clases-section-heading">
          <div>
            <h3 id="gestion-agenda-title">Administrar agenda</h3>
            <p>Creá clases con disciplina, instructor, horario, sede y capacidad máxima.</p>
          </div>
        </div>
        <ClaseForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isEditing={!!editingId}
          sedes={sedesAgenda}
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
    </div>
  );
}
