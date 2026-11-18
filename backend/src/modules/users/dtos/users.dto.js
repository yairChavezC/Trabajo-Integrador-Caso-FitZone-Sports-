export function toCreateUserDTO(body) {
  return {
    dni: String(body.dni ?? '').trim(),
    nombre: String(body.nombre ?? '').trim(),
    contacto: String(body.contacto ?? '').trim(),
    foto: body.foto ? String(body.foto).trim() : null,
    idRol: Number(body.idRol ?? 3), // Por defecto Socio (3)
  };
}

export function toUserResponseDTO(user) {
  return {
    id: user.id,
    dni: user.dni,
    nombre: user.nombre,
    contacto: user.contacto,
    foto: user.foto,
    idRol: user.id_rol,
    activo: user.activo,
    creadoAt: user.creado_at,
  };
}