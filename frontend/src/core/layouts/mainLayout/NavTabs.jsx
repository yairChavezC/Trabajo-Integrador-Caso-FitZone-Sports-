import { useEffect, useState } from 'react';
import './NavTabs.css';
import { NavLink } from 'react-router-dom';
import { getRolClases } from '../../../modules/clases/services/claseService';

const RUTAS_NAVEGACION = [
  { path: '/canchas', etiqueta: 'Canchas' },
  { path: '/acceso', etiqueta: 'Acceso' },
  { path: '/clases', etiqueta: 'Clases' },
  { path: '/pagos', etiqueta: 'Pagos' },
  { path: '/socios', etiqueta: 'Socios' }
];

export function NavTabs() {
  const [rolClases, setRolClases] = useState(null);

  useEffect(() => {
    let activo = true;
    getRolClases()
      .then(({ tipo }) => {
        if (activo) setRolClases(tipo);
      })
      .catch(() => {
        if (activo) setRolClases('sin-acceso');
      });

    return () => {
      activo = false;
    };
  }, []);

  const puedeVerClases = ['socio', 'recepcionista', 'administrador', 'gerente'].includes(rolClases);

  return (
    <nav className="topbar-nav">
      {RUTAS_NAVEGACION.map((item) => (
        (item.path !== '/clases' || puedeVerClases) && (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        >
          <span className="tab-name">{item.etiqueta}</span>
        </NavLink>
        )
      ))}
    </nav>
  );
}