import { useEffect, useState } from 'react';

export default function ConfirmDialog({
  open = false,
  title = 'Confirmar acción',
  message = '¿Querés continuar?',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel
}) {
  const [presionado, setPresionado] = useState(false);

  useEffect(() => {
    if (!open) {
      setPresionado(false);
    }
  }, [open]);

  const handleConfirm = (event) => {
    event.preventDefault();
    setPresionado(true);
    onConfirm?.();
  };

  const handleCancel = (event) => {
    event.preventDefault();
    onCancel?.();
  };

  if (!open) return null;

  return (
    <div
      className="confirm-overlay"
      role="presentation"
      onClick={handleCancel}
    >
      <div
        className="confirm-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="confirm-title">{title}</h2>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button
            type="button"
            className="btn-secondary confirm-cancel"
            onClick={handleCancel}
            disabled={presionado}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`confirm-confirm${presionado ? ' confirm-procesando' : ''}`}
            onClick={handleConfirm}
            disabled={presionado}
          >
            {presionado ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}