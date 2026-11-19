import { Navigate, useParams } from 'react-router-dom';
import { ROLES } from './constants';
import { getRolActual, getUsuarioIdActual } from './session';

// Externo -> solo canchas. Socio -> solo su propia ficha. Personal -> pasa.
function redirigir(rol, idPropio) {
  if (rol === ROLES.CLIENTE_EXTERNO) return <Navigate to="/canchas" replace />;
  if (rol === ROLES.SOCIO) {
    return <Navigate to={idPropio ? `/socios/${idPropio}` : '/acceso'} replace />;
  }
  return null;
}

// Para la grilla de socios y la página de planes
export function SoloPersonal({ children }) {
  return redirigir(getRolActual(), getUsuarioIdActual()) || children;
}

// Para el detalle: el socio solo puede ver el suyo
export function SoloPropioOPersonal({ children }) {
  const { id } = useParams();
  const rol = getRolActual();
  const idPropio = getUsuarioIdActual();

  if (rol === ROLES.SOCIO && String(id) === String(idPropio)) return children;
  return redirigir(rol, idPropio) || children;
}