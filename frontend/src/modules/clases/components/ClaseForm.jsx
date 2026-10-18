export default function ClaseForm({
  formData,
  setFormData,
  onSubmit,
  isEditing,
  sedes = [],
  guardando = false,
  onCancel
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form className="clase-form" onSubmit={onSubmit}>
      <h3>{isEditing ? 'Editar clase' : 'Programar clase'}</h3>

      <label>
        Sede
        <select name="idSede" value={formData.idSede} onChange={handleChange} required>
          <option value="">Elegí una sede</option>
          {sedes.map((sede) => (
            <option key={sede.id} value={sede.id}>
              {sede.nombre}
            </option>
          ))}
        </select>
      </label>

      <label>
        Disciplina / nombre
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          placeholder="Spinning, Yoga, Funcional..."
          minLength="3"
          maxLength="100"
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Instructor
        <input
          type="text"
          name="profesor"
          value={formData.profesor}
          placeholder="Nombre del profesor"
          minLength="3"
          maxLength="150"
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Cupo máximo
        <input
          type="number"
          name="cupo"
          min="1"
          step="1"
          value={formData.cupo}
          placeholder="20"
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Inicio
        <input
          type="datetime-local"
          name="fechaInicio"
          value={formData.fechaInicio}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Fin
        <input
          type="datetime-local"
          name="fechaFin"
          value={formData.fechaFin}
          onChange={handleChange}
          required
        />
      </label>

      <div className="clase-form-actions">
        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear clase'}
        </button>
        {isEditing && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Dejar de editar
          </button>
        )}
      </div>
    </form>
  );
}
