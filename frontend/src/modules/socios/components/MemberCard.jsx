import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ETIQUETA_PERFIL } from '../constants';

const ESTADO_CLASS = {
  Activo: 'is-active',
  Vencido: 'is-expired',
  Suspendido: 'is-suspended',
  'Sin membresía': 'is-none',
};

export default function MemberCard({ member }) {
  const perfil = ETIQUETA_PERFIL[member.idRol];

  return (
    <Link to={`/socios/${member.id}`} className="member-card">
      <div className="member-info">
        <div className="member-name-row">
          <strong>{member.nombre}</strong>
          {perfil && <span className="member-profile">{perfil}</span>}
        </div>
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