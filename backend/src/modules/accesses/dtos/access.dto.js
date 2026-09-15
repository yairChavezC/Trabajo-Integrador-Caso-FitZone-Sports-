export class ValidateAccessDTO {
    constructor(data) {
        this.qrCode = data.qrCode;
        this.sedeId = data.sedeId;
    }

    validate() {
        const errors = [];

        if (!this.qrCode || typeof this.qrCode !== 'string') {
            errors.push('El código QR es obligatorio y debe ser un texto.');
        }

        if (!this.sedeId) {
            errors.push('El ID de la sede es obligatorio para registrar el acceso.');
        }

        return errors;
    }
}