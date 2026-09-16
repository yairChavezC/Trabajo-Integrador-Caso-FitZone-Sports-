import { useState } from 'react';
import { useClases } from '../hooks/useClases';
import ClaseForm from '../components/ClaseForm';
import ClaseTable from '../components/ClaseTable';

const initialForm = {
  idSede: '',
  nombre: '',
  profesor: '',
  cupo: '',
  fechaInicio: '',
  fechaFin: ''
};

export default function ClasesScreen() {
  const { clases, loading, error, addClase, editClase, removeClase } = useClases();
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const formatForInput = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().slice(0, 16);
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

  if (loading) return <p>Cargando clases...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Clases grupales</h2>

      <ClaseForm
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isEditing={!!editingId}
      />

      <ClaseTable
        clases={clases}
        onDelete={removeClase}
        onEdit={handleEdit}
      />
    </div>
  );
}