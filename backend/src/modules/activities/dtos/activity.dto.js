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

        if (!this.idSede || Number.isNaN(Number(this.idSede))) {
            errors.push('El ID de la sede es obligatorio y debe ser numérico.');
        }

        if (!this.nombre || this.nombre.length < 3) {
            errors.push('El nombre de la clase es obligatorio y debe tener al menos 3 caracteres.');
        }

        if (!this.profesor || this.profesor.length < 3) {
            errors.push('El profesor es obligatorio y debe tener al menos 3 caracteres.');
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


export class ClassReservationDTO {
    constructor(data = {}) {
        this.idClase = data.idClase;
    }

    validate() {
        const errors = [];

        if (!this.idClase) {
            errors.push('El ID de la clase es obligatorio.');
        }

        return errors;
    }
}


export class CancelClassReservationDTO {
    constructor(data = {}) {
        this.idClase = data.idClase;
    }

    validate() {
        const errors = [];

        if (!this.idClase) {
            errors.push('El ID de la clase es obligatorio.');
        }

        return errors;
    }
}


export class WaitlistRegistrationDTO {
    constructor(data = {}) {
        this.idClase = data.idClase;
    }

    validate() {
        const errors = [];

        if (!this.idClase) {
            errors.push('El ID de la clase es obligatorio.');
        }

        return errors;
    }
}

// compatibilidad temporal
export { CreateActivityDTO as CreateClassDTO };