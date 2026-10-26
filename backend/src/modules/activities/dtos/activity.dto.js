export class CreateActivityDTO {
    constructor(data = {}) {
        this.idSede = data.idSede;
        this.nombre = typeof data.nombre === 'string' ? data.nombre.trim() : data.nombre;
        this.profesor = typeof data.profesor === 'string' ? data.profesor.trim() : data.profesor;
        this.cupo = Number(data.cupo);
        this.fechaInicio = data.fechaInicio;
        this.fechaFin = data.fechaFin;
    }

    validate() {
        const errors = [];

        const idSede = Number(this.idSede);
        if (!Number.isInteger(idSede) || idSede <= 0) {
            errors.push('El ID de la sede es obligatorio y debe ser un entero mayor a 0.');
        }

        if (!this.nombre || this.nombre.length < 3 || this.nombre.length > 100) {
            errors.push('El nombre de la clase debe tener entre 3 y 100 caracteres.');
        }

        if (!this.profesor || this.profesor.length < 3 || this.profesor.length > 150) {
            errors.push('El profesor debe tener entre 3 y 150 caracteres.');
        }

        if (!Number.isInteger(this.cupo) || this.cupo <= 0) {
            errors.push('El cupo debe ser un número entero mayor a 0.');
        }

        if (!this.fechaInicio) {
            errors.push('La fecha de inicio es obligatoria.');
        }

        if (!this.fechaFin) {
            errors.push('La fecha de fin es obligatoria.');
        }

        if (this.fechaInicio && this.fechaFin) {
            const inicio = new Date(this.fechaInicio);
            const fin = new Date(this.fechaFin);

            if (Number.isNaN(inicio.getTime())) {
                errors.push('La fecha de inicio no tiene un formato válido.');
            }

            if (Number.isNaN(fin.getTime())) {
                errors.push('La fecha de fin no tiene un formato válido.');
            }

            if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fin.getTime()) && fin <= inicio) {
                errors.push('La fecha de fin debe ser posterior a la fecha de inicio.');
            }
        }

        return errors;
    }
}

export class UpdateActivityDTO {
    constructor(data = {}) {
        this.idSede = Object.hasOwn(data, 'idSede') ? Number(data.idSede) : undefined;
        this.nombre = typeof data.nombre === 'string' ? data.nombre.trim() : data.nombre;
        this.profesor = typeof data.profesor === 'string' ? data.profesor.trim() : data.profesor;
        this.cupo = Object.hasOwn(data, 'cupo') ? Number(data.cupo) : undefined;
        this.fechaInicio = data.fechaInicio;
        this.fechaFin = data.fechaFin;
    }

    validate(current = null) {
        const errors = [];
        const campos = ['idSede', 'nombre', 'profesor', 'cupo', 'fechaInicio', 'fechaFin'];
        const enviados = campos.filter((campo) => this[campo] !== undefined);

        if (enviados.length === 0) {
            errors.push('Debe enviar al menos un campo válido para actualizar.');
            return errors;
        }

        const datos = current
            ? Object.fromEntries(campos.map((campo) => [
                campo,
                this[campo] !== undefined ? this[campo] : current[campo]
            ]))
            : Object.fromEntries(enviados.map((campo) => [campo, this[campo]]));

        if (datos.idSede !== undefined) {
            const idSede = Number(datos.idSede);
            if (!Number.isInteger(idSede) || idSede <= 0) {
                errors.push('El ID de la sede debe ser un entero mayor a 0.');
            }
        }

        if (datos.nombre !== undefined && (
            typeof datos.nombre !== 'string' ||
            datos.nombre.length < 3 ||
            datos.nombre.length > 100
        )) {
            errors.push('El nombre de la clase debe tener entre 3 y 100 caracteres.');
        }

        if (datos.profesor !== undefined && (
            typeof datos.profesor !== 'string' ||
            datos.profesor.length < 3 ||
            datos.profesor.length > 150
        )) {
            errors.push('El profesor debe tener entre 3 y 150 caracteres.');
        }

        if (datos.cupo !== undefined && (
            !Number.isInteger(Number(datos.cupo)) ||
            Number(datos.cupo) <= 0
        )) {
            errors.push('El cupo debe ser un número entero mayor a 0.');
        }

        for (const [campo, etiqueta] of [
            ['fechaInicio', 'inicio'],
            ['fechaFin', 'fin']
        ]) {
            if (datos[campo] !== undefined && Number.isNaN(new Date(datos[campo]).getTime())) {
                errors.push(`La fecha de ${etiqueta} no tiene un formato válido.`);
            }
        }

        if (
            datos.fechaInicio !== undefined &&
            datos.fechaFin !== undefined &&
            !Number.isNaN(new Date(datos.fechaInicio).getTime()) &&
            !Number.isNaN(new Date(datos.fechaFin).getTime()) &&
            new Date(datos.fechaFin) <= new Date(datos.fechaInicio)
        ) {
            errors.push('La fecha de fin debe ser posterior a la fecha de inicio.');
        }

        return errors;
    }
}

// compatibilidad temporal
export { CreateActivityDTO as CreateClassDTO };