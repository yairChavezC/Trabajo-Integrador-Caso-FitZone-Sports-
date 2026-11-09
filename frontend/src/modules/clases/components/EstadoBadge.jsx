const labels = {
  confirmado: 'Confirmado',
  'en espera': 'En espera',
  notificado: 'Oferta disponible',
  cancelado: 'Cancelado',
  expirado: 'Oferta vencida',
  no_elegible: 'No elegible'
};

export default function EstadoBadge({ estado }) {
  return (
    <span className={`clase-estado-badge estado-${estado.replaceAll(' ', '-')}`}>
      {labels[estado] || estado}
    </span>
  );
}
