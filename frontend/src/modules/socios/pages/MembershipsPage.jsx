import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  BadgeCheck,
  Clock3,
  Search,
  UsersRound,
  Plus,
} from 'lucide-react';
import { useMembers } from '../hooks/useMembers';
import MemberCard from '../components/MemberCard';
import NuevoSocioModal from '../components/NuevoSocioModal';
import './MembershipsPage.css';

const PAGE_SIZE = 10;

function getEstado(member) {
  if (!member.activo) return 'Suspendido';
  return member.enMora ? 'Vencido' : 'Activo';
}

export default function MembershipsPage() {
  const { members, loading, error, reload } = useMembers();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);

  const socios = useMemo(
    () => members.map((m) => ({ ...m, estado: getEstado(m) })),
    [members]
  );

  const total = socios.length;
  const activos = socios.filter((s) => s.estado === 'Activo').length;
  const vencidos = socios.filter((s) => s.estado === 'Vencido').length;

  const metrics = [
    { label: 'Socios registrados', context: 'En total', value: total, Icon: Users, color: 'indigo' },
    { label: 'Membresías activas', context: 'Con acceso habilitado', value: activos, Icon: BadgeCheck, color: 'green' },
    { label: 'Membresías vencidas', context: 'Pendientes de renovación', value: vencidos, Icon: Clock3, color: 'red' },
  ];

  const filtered = socios.filter((s) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query || s.nombre.toLowerCase().includes(query) || String(s.dni).includes(query);
    const matchesStatus = statusFilter === 'all' || s.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  function handleSearch(e) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleStatusFilter(e) {
    setStatusFilter(e.target.value);
    setPage(1);
  }

  function handleNuevoSocio() {
    setShowForm(true);
  }

  return (
    <main className="socios-page">
      <section className="page-heading">
        <div className="breadcrumb">
          <span>Administración</span>
          <ChevronRight size={12} />
          <span className="breadcrumb-current">Socios</span>
        </div>

        <div className="title-row">
          <div>
            <h1>Socios</h1>
            <p className="page-description">
              Administrá los socios y sus membresías en un solo lugar.
            </p>
          </div>
          <button className="primary-button" type="button" onClick={handleNuevoSocio}>
            + Nuevo socio
          </button>
        </div>
      </section>

      <section className="metrics" aria-label="Resumen de membresías">
        {metrics.map(({ label, context, value, Icon, color }) => (
          <article className="metric" key={label}>
            <span className={`metric-icon ${color}`}>
              <Icon size={21} strokeWidth={1.8} />
            </span>
            <div className="metric-information">
              <p className="metric-label">{label}</p>
              <div className="metric-value-row">
                <span className="metric-value">{value}</span>
                <span className="metric-context">{context}</span>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="directory">
        <div className="list-toolbar">
          <div className="list-title-row">
            <div className="list-title">
              <h2>Socios registrados</h2>
              <span className="count-badge">{total}</span>
            </div>
          </div>

          <div className="search-filter-row">
            <label className="search-field">
              <Search size={18} />
              <input
                type="search"
                aria-label="Buscar socios por nombre o DNI"
                placeholder="Buscar por nombre o DNI"
                value={search}
                onChange={handleSearch}
              />
            </label>

            <div className="membership-filter">
              <label htmlFor="membership-status">Membresía</label>
              <div className="select-wrapper">
                <select
                  id="membership-status"
                  value={statusFilter}
                  onChange={handleStatusFilter}
                >
                  <option value="all">Todos los estados</option>
                  <option value="Activo">Activo</option>
                  <option value="Vencido">Vencido</option>
                </select>
                <ChevronDown size={15} />
              </div>
            </div>
          </div>
        </div>

        {loading && <p className="state-message">Cargando socios...</p>}
        {error && (
          <p className="state-message state-error">
            ⚠ No se pudo conectar con el servidor. Probá iniciar sesión de nuevo.
          </p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-illustration" aria-hidden="true">
              <UsersRound size={38} strokeWidth={1.5} />
              <span className="add-symbol">
                <Plus size={13} />
              </span>
            </div>
            <div className="empty-message">
              <h3>{total === 0 ? 'No hay socios registrados' : 'Sin resultados'}</h3>
              <p>
                {total === 0
                  ? 'Agregá tu primer socio para comenzar a gestionar sus datos, membresías y acceso al gimnasio.'
                  : 'Probá con otro nombre, DNI o estado de membresía.'}
              </p>
            </div>
            {total === 0 && (
              <button className="primary-button" type="button" onClick={handleNuevoSocio}>
                + Nuevo socio
              </button>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="member-list">
            {pageItems.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        )}

        <div className="results-footer">
          <span>
            {filtered.length === 0
              ? '0 socios'
              : `Mostrando ${startIndex + 1}–${startIndex + pageItems.length} de ${filtered.length} socios`}
          </span>

          {totalPages > 1 && (
            <div className="pager">
              <button
                type="button"
                className="pager-btn"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="pager-info">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                className="pager-btn"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Página siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <NuevoSocioModal onClose={() => setShowForm(false)} onCreated={reload} />
      )}
    </main>
  );
}