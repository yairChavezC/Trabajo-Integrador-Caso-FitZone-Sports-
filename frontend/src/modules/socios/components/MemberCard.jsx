import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ESTADO_CLASS = {
  Activo: 'is-active',
  Vencido: 'is-expired',
  Suspendido: 'is-suspended',
};

export default function MemberCard({ member }) {
  return (
    <Link to={`/socios/${member.id}`} className="member-card">
      <div className="member-info">
        <strong>{member.nombre}</strong>
        <span>
          DNI: {member.dni} · {member.contacto}
        </span>
      </div>
      <div className="member-card-end">
        <span className={`member-status ${ESTADO_CLASS[member.estado] || 'is-suspended'}`}>
          {member.estado}
        </span>
        <ChevronRight size={16} />
      </div>
    </Link>
  );
}