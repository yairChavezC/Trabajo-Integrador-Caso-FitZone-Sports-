import { useEffect, useState } from 'react';
import './NavTabs.css';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getRolClases } from '../../../modules/clases/services/claseService';

export function NavTabs() {
  const { usuario: usuarioContext } = useAuth();
  const usuario = usuarioContext || JSON.parse(localStorage.getItem('usuario') || '{}');
  const rol = Number(usuario.rol) || Number(usuario.id_rol);
  const esExterno = rol === 2;
  const esSocio = rol === 3;

  const [rolClases, setRolClases] = useState(null);

  useEffect(() => {
    if (esExterno) return undefined;
    let activo = true;
    getRolClases()
      .then(({ tipo }) => { if (activo) setRolClases(tipo); })
      .catch(() => { if (activo) setRolClases('sin-acceso'); });
    return () => { activo = false; };
  }, [esExterno]);

  const puedeVerClases = ['socio', 'recepcionista', 'administrador', 'gerente'].includes(rolClases);

  const rutas = esExterno
    ? [{ path: '/canchas', etiqueta: 'Canchas' }]
    : [
        { path: '/acceso', etiqueta: 'Acceso' },
        { path: '/canchas', etiqueta: 'Canchas' },
        { path: '/clases', etiqueta: 'Clases' },
        esSocio
          ? { path: `/socios/${usuario.id}`, etiqueta: 'Mi membresía' }
          : { path: '/socios', etiqueta: 'Socios' },
      ];

  return (
    <nav className="topbar-nav">
      {rutas.map((item) => (
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