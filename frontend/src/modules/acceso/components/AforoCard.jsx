export const AforoCard = ({ aforoActual = 0, aforoMaximo = 100 }) => {
    // Calculamos el porcentaje para darle un feedback visual rápido a la recepcionista
    const porcentaje = (aforoActual / aforoMaximo) * 100;
    
    // Si está al 90% se pone rojo, al 70% naranja, sino verde
    let colorEstado = 'green';
    if (porcentaje >= 90) colorEstado = 'red';
    else if (porcentaje >= 70) colorEstado = 'orange';

    return (
        <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            padding: '1.5rem', 
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Aforo en Sede</h3>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: colorEstado }}>
                {aforoActual} <span style={{ fontSize: '1.5rem', color: '#666' }}>/ {aforoMaximo}</span>
            </div>
            <p style={{ margin: '1rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                Personas activas en este momento
            </p>
        </div>
    );
};