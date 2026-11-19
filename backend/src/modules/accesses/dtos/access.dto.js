export class ValidateAccessDTO {
    constructor(data = {}) {
        this.qrCode = typeof data.qrCode === 'string' ? data.qrCode.trim() : '';
        this.sedeId = data.sedeId ? Number(data.sedeId) : null;
    }

    validate() {
        const errors = [];
        if (!this.qrCode) {
            errors.push('El código QR es obligatorio y debe ser un texto válido.');
        }
        if (!this.sedeId || isNaN(this.sedeId) || this.sedeId <= 0) {
            errors.push('El ID de la sede es obligatorio y debe ser un número válido.');
        }
        return errors;
    }
}

export class CreateExternalAccessDTO {
    constructor(data = {}) {
        this.nombre = typeof data.nombre === 'string' ? data.nombre.trim().replace(/\s+/g, ' ') : '';
        this.dni = data.dni !== undefined && data.dni !== null ? String(data.dni).trim() : '';
        this.sedeId = data.sedeId ? Number(data.sedeId) : null;
    }

    validate() {
        const errors = [];
        if (!this.nombre || this.nombre.length < 3 || this.nombre.length > 80) {
            errors.push('El nombre completo es obligatorio y debe tener entre 3 y 80 caracteres.');
        }
        if (!/^\d{7,9}$/.test(this.dni)) {
            errors.push('El DNI es obligatorio y debe contener entre 7 y 9 dígitos numéricos sin puntos ni espacios.');
        }
        if (!this.sedeId || isNaN(this.sedeId) || this.sedeId <= 0) {
            errors.push('El ID de la sede es obligatorio y debe ser un número válido.');
        }
        return errors;
    }
}