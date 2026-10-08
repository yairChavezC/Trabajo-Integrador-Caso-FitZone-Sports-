const ESTADO_CLASS = {
  Activo: 'is-active',
  Vencido: 'is-expired',
  Suspendido: 'is-suspended',
};

export default function MemberCard({ member }) {
  return (
    <div className="member-card">
      <div className="member-info">
        <strong>{member.nombre}</strong>
        <span>
          DNI: {member.dni} · {member.contacto}
        </span>
      </div>
      <span className={`member-status ${ESTADO_CLASS[member.estado] || 'is-suspended'}`}>
        {member.estado}
      </span>
    </div>
  );
}