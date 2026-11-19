export function toCreateUserDTO(body) {
  return {
    dni: String(body.dni ?? '').trim(),
    nombre: String(body.nombre ?? '').trim(),
    contacto: String(body.contacto ?? '').trim(),
    password: String(body.password ?? '').trim(),
    foto: body.foto ? String(body.foto).trim() : null,
    idRol: Number(body.idRol ?? 3),
  };
}

export function toUserResponseDTO(user) {
  return {
    id: user.id,
    dni: user.dni,
    nombre: user.nombre,
    contacto: user.contacto,
    foto: user.foto,
    idRol: user.id_rol == null ? null : Number(user.id_rol),
    activo: user.activo,
    creadoAt: user.creado_at,
    enMora: user.enMora,
    estadoSuscripcion: user.estado_suscripcion ?? null,
    fechaProximoVencimiento: user.fecha_proximo_vencimiento ?? null,
    descuento: user.descuento ?? null,
    idPlan: user.id_plan ?? null,
  };
}