import React from 'react';
import { NavLink } from 'react-router-dom';

const RUTAS_NAVEGACION = [
  { path: '/canchas', etiqueta: 'Canchas' },
  { path: '/acceso', etiqueta: 'Acceso' },
  { path: '/clases', etiqueta: 'Clases' },
  { path: '/pagos', etiqueta: 'Pagos' },
  { path: '/socios', etiqueta: 'Socios' }
];

export function NavTabs() {
  return (
    <nav className="topbar-nav">
      {RUTAS_NAVEGACION.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        >
          <span className="tab-name">{item.etiqueta}</span>
        </NavLink>
      ))}
    </nav>
  );
}