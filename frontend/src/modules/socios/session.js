import { ROLES } from './constants';

function leerPayload() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getRolActual() {
  const rol = leerPayload()?.rol;
  return rol == null ? null : Number(rol);
}

export function getUsuarioIdActual() {
  const id = leerPayload()?.id;
  return id == null ? null : Number(id);
}

export function esGerente() {
  return getRolActual() === ROLES.GERENTE;
}

export function esSocioOExterno() {
  const rol = getRolActual();
  return rol === ROLES.SOCIO || rol === ROLES.CLIENTE_EXTERNO;
}