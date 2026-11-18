
import { useEffect } from 'react';

const iconos = {
    success: '✓',
    error: '×',
    warning: '!',
    info: 'i'
};

export const Snackbar = ({
    open,
    type = 'info',
    message,
    onClose,
    duration = 4000
}) => {
    useEffect(() => {
        if (!open) return undefined;

        const timeout = window.setTimeout(onClose, duration);

        return () => window.clearTimeout(timeout);
    }, [open, duration, onClose]);

    if (!open || !message) return null;

    return (
        <div
            className={`acceso-snackbar acceso-snackbar--${type}`}
            role={type === 'error' ? 'alert' : 'status'}
            aria-live={type === 'error' ? 'assertive' : 'polite'}
        >
            <span className="acceso-snackbar-icon" aria-hidden="true">
                {iconos[type] || iconos.info}
            </span>

            <span className="acceso-snackbar-message">
                {message}
            </span>

            <button
                type="button"
                className="acceso-snackbar-close"
                onClick={onClose}
                aria-label="Cerrar aviso"
            >
                ×
            </button>
        </div>
    );
};
