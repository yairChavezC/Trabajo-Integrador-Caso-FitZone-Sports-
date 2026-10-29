import { ROLES } from './constants';

// Lee el rol del token guardado en el navegador.
// Sirve solo para mostrar u ocultar botones: la seguridad real la aplica el backend.
export function getRolActual() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const rol = JSON.parse(json).rol;

    return rol == null ? null : Number(rol);
  } catch {
    return null;
  }
}

export function esGerente() {
  return getRolActual() === ROLES.GERENTE;
}