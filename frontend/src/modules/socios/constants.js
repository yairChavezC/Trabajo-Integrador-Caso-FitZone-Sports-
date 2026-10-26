// ids de la tabla "rol" en Supabase
export const ROLES = {
  RECEPCIONISTA: 1,
  CLIENTE_EXTERNO: 2,
  SOCIO: 3,
  GERENTE: 4,
};

// Rol que usa la pantalla de Socios
export const ROL_SOCIO = ROLES.SOCIO;

// Perfiles que se pueden elegir al dar de alta
export const PERFILES_ALTA = [
  { id: ROLES.SOCIO, etiqueta: 'Socio' },
  { id: ROLES.CLIENTE_EXTERNO, etiqueta: 'Cliente externo' },
];

// Perfiles que muestra el listado
export const PERFILES_LISTADO = [ROLES.SOCIO, ROLES.CLIENTE_EXTERNO];

// Texto que se muestra para cada perfil
export const ETIQUETA_PERFIL = {
  [ROLES.SOCIO]: 'Socio',
  [ROLES.CLIENTE_EXTERNO]: 'Cliente externo',
};