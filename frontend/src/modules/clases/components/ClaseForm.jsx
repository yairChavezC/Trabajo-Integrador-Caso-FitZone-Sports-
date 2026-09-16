export default function ClaseForm({ formData, setFormData, onSubmit, isEditing }) {
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'grid',
        gap: '12px',
        maxWidth: '500px',
        marginBottom: '2rem'
      }}
    >
      <input
        type="number"
        name="idSede"
        value={formData.idSede}
        placeholder="ID de sede"
        onChange={handleChange}
      />

      <input
        type="text"
        name="nombre"
        value={formData.nombre}
        placeholder="Nombre de la clase"
        onChange={handleChange}
      />

      <input
        type="text"
        name="profesor"
        value={formData.profesor}
        placeholder="Profesor"
        onChange={handleChange}
      />

      <input
        type="number"
        name="cupo"
        value={formData.cupo}
        placeholder="Cupo"
        onChange={handleChange}
      />

      <input
        type="datetime-local"
        name="fechaInicio"
        value={formData.fechaInicio}
        onChange={handleChange}
      />

      <input
        type="datetime-local"
        name="fechaFin"
        value={formData.fechaFin}
        onChange={handleChange}
      />

      <button type="submit">
        {isEditing ? 'Guardar cambios' : 'Crear clase'}
      </button>
    </form>
  );
}