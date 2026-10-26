// Limpia lo que llega del cliente antes de pasarlo al service
export function toCreateUserDTO(body) {
  return {
    nombre: String(body.nombre ?? '').trim(),
    dni: String(body.dni ?? '').trim(),
    contacto: String(body.contacto ?? '').trim(),
    password: String(body.password ?? '').trim(),
    idRol: body.idRol ?? null,
  };
}

// Define qué datos salen hacia el cliente (la contraseña nunca sale)
export function toUserResponseDTO(user) {
  return {
    id: user.id,
    nombre: user.nombre,
    dni: user.dni,
    contacto: user.contacto,
    idRol: user.id_rol == null ? null : Number(user.id_rol),
    activo: user.activo,
    enMora: user.enMora,
    estadoSuscripcion: user.estado_suscripcion ?? null,
    fechaProximoVencimiento: user.fecha_proximo_vencimiento ?? null,
    descuento: user.descuento ?? null,
    creadoAt: user.creado_at ?? null,
  };
}