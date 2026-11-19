export default function ClaseForm({
  formData,
  setFormData,
  onSubmit,
  isEditing,
  fechaInicioOriginal = '',
  sedes = [],
  guardando = false,
  onCancel
}) {
  const now = new Date();
  const nowTimestamp = now.getTime();
  const siguienteMinuto = new Date();
  siguienteMinuto.setSeconds(0, 0);
  siguienteMinuto.setMinutes(siguienteMinuto.getMinutes() + 1);
  const fechaInicioMinima = isEditing
    && fechaInicioOriginal
    && new Date(fechaInicioOriginal).getTime() <= nowTimestamp
    ? fechaInicioOriginal
    : new Date(
        siguienteMinuto.getTime()
          - siguienteMinuto.getTimezoneOffset() * 60000
      ).toISOString().slice(0, 16);
  const inicioTimestamp = formData.fechaInicio
    ? new Date(formData.fechaInicio).getTime()
    : NaN;
  const inicioSinCambios = isEditing
    && formData.fechaInicio === fechaInicioOriginal;
  const fechaInicioError = formData.fechaInicio
    && (!Number.isFinite(inicioTimestamp)
      || (inicioTimestamp <= nowTimestamp && !inicioSinCambios))
    ? 'La fecha de inicio debe ser futura.'
    : '';
  const finTimestamp = formData.fechaFin
    ? new Date(formData.fechaFin).getTime()
    : NaN;
  const fechaFinError = formData.fechaInicio
    && formData.fechaFin
    && (!Number.isFinite(inicioTimestamp)
      || !Number.isFinite(finTimestamp)
      || finTimestamp <= inicioTimestamp)
    ? 'La fecha de finalización debe ser posterior a la de inicio.'
    : '';
  const cupoValido = formData.cupo !== ''
    && Number.isInteger(Number(formData.cupo))
    && Number(formData.cupo) > 0;
  const cupoError = formData.cupo !== '' && !cupoValido
    ? 'El cupo debe ser un entero positivo.'
    : '';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const inicioActual = formData.fechaInicio
      ? new Date(formData.fechaInicio).getTime()
      : NaN;
    const finActual = formData.fechaFin
      ? new Date(formData.fechaFin).getTime()
      : NaN;
    const inicioFuturo = inicioActual > Date.now()
      || (isEditing && formData.fechaInicio === fechaInicioOriginal);

    if (
      !cupoValido
      || !Number.isFinite(inicioActual)
      || !Number.isFinite(finActual)
      || !inicioFuturo
      || finActual <= inicioActual
    ) {
      return;
    }

    onSubmit(event);
  };

  return (
    <form className="clase-form" onSubmit={handleSubmit}>
      <h3>{isEditing ? 'Editar clase' : 'Programar clase'}</h3>

      <div className="clase-form-field">
        <label htmlFor="clase-sede">Sede</label>
        <select id="clase-sede" name="idSede" value={formData.idSede} onChange={handleChange} required>
          <option value="">Elegí una sede</option>
          {sedes.map((sede) => (
            <option key={sede.id} value={sede.id}>
              {sede.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="clase-form-field">
        <label htmlFor="clase-nombre">Disciplina / nombre</label>
        <input
          id="clase-nombre"
          type="text"
          name="nombre"
          value={formData.nombre}
          placeholder="Spinning, Yoga, Funcional..."
          minLength="3"
          maxLength="100"
          onChange={handleChange}
          required
        />
      </div>

      <div className="clase-form-field">
        <label htmlFor="clase-profesor">Instructor</label>
        <input
          id="clase-profesor"
          type="text"
          name="profesor"
          value={formData.profesor}
          placeholder="Nombre del profesor"
          minLength="3"
          maxLength="150"
          onChange={handleChange}
          required
        />
      </div>

      <div className="clase-form-field">
        <label htmlFor="clase-cupo">Cupo máximo</label>
        <input
          id="clase-cupo"
          type="number"
          name="cupo"
          min="1"
          step="1"
          value={formData.cupo}
          placeholder="20"
          onChange={handleChange}
          required
          aria-invalid={Boolean(cupoError)}
          aria-describedby={cupoError ? 'clase-cupo-error' : undefined}
        />
        {cupoError && <span className="clase-form-error" id="clase-cupo-error" role="alert">{cupoError}</span>}
      </div>

      <div className="clase-form-field">
        <label htmlFor="clase-fecha-inicio">Inicio</label>
        <input
          id="clase-fecha-inicio"
          type="datetime-local"
          name="fechaInicio"
          value={formData.fechaInicio}
          min={fechaInicioMinima}
          onChange={handleChange}
          required
          aria-invalid={Boolean(fechaInicioError)}
          aria-describedby={fechaInicioError ? 'clase-fecha-inicio-error' : undefined}
        />
        {fechaInicioError && <span className="clase-form-error" id="clase-fecha-inicio-error" role="alert">{fechaInicioError}</span>}
      </div>

      <div className="clase-form-field">
        <label htmlFor="clase-fecha-fin">Fin</label>
        <input
          id="clase-fecha-fin"
          type="datetime-local"
          name="fechaFin"
          value={formData.fechaFin}
          min={formData.fechaInicio || undefined}
          onChange={handleChange}
          required
          aria-invalid={Boolean(fechaFinError)}
          aria-describedby={fechaFinError ? 'clase-fecha-fin-error' : undefined}
        />
        {fechaFinError && <span className="clase-form-error" id="clase-fecha-fin-error" role="alert">{fechaFinError}</span>}
      </div>

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
