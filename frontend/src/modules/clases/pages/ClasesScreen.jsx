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
  const { sedes, sedeSeleccionada } = useSede();
  const {
    clases,
    loading,
    error,
    actionError,
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

    const payload = {
      idSede: Number(formData.idSede),
      nombre: formData.nombre.trim(),
      profesor: formData.profesor.trim(),
      cupo: Number(formData.cupo),
      fechaInicio: new Date(formData.fechaInicio).toISOString(),
      fechaFin: new Date(formData.fechaFin).toISOString()
    };

    if (editingId) {
      await editClase(editingId, payload);
    } else {
      await addClase(payload);
    }

    resetForm();
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

  if (loading) return <p className="clases-empty">Cargando clases...</p>;
  if (error) return <p className="clases-alert">Error: {error}</p>;

  return (
    <div className="clases-container">
      <div className="clases-header">
        <h2>Clases grupales</h2>
        <p>
          Programá la agenda de la sede y reservá cupo. La reserva pide 48 h de anticipación
          y la cancelación se habilita hasta 2 h antes. Si la clase está llena, entra lista de espera.
        </p>
      </div>

      {actionError && <div className="clases-alert">{actionError}</div>}

      <ClaseForm
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isEditing={!!editingId}
        sedes={sedes}
      />

      <ClaseTable
        clases={clases}
        onDelete={removeClase}
        onEdit={handleEdit}
        onReservar={reservar}
        onCancelar={cancelar}
        onListaEspera={listaEspera}
      />
    </div>
  );
}
