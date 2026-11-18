import crypto from 'node:crypto';
import { ESTADOS_PAGO } from '../domain/Pago.js';
import { UnsupportedGatewayError } from '../errors.js';

export class PasarelaPago {
  nombre() {
    throw new Error('Método nombre() debe ser implementado por el adaptador.');
  }

  async cobrar(_solicitud) {
    throw new Error('Método cobrar() debe ser implementado por el adaptador.');
  }
}

export class MercadoPagoAdapter extends PasarelaPago {
  nombre() {
    return 'MERCADOPAGO';
  }

  async cobrar({ monto, token }) {
    const raw = String(token || '').toLowerCase();
    const externalResponse = raw.includes('rechazad')
      ? { status: 'rejected', id: `mp_rej_${crypto.randomUUID().slice(0, 8)}`, detail: 'Fondos insuficientes en Mercado Pago.' }
      : raw.includes('pendient')
        ? { status: 'in_process', id: `mp_pen_${crypto.randomUUID().slice(0, 8)}`, detail: 'Pago en revisión por Mercado Pago.' }
        : { status: 'approved', id: `mp_ok_${crypto.randomUUID().slice(0, 8)}`, detail: `Acreditado $${monto} vía Mercado Pago.` };

    const mapEstado = {
      approved: ESTADOS_PAGO.APROBADO,
      rejected: ESTADOS_PAGO.RECHAZADO,
      in_process: ESTADOS_PAGO.PENDIENTE
    };

    return {
      proveedor: this.nombre(),
      estado: mapEstado[externalResponse.status],
      transaccionExternaId: externalResponse.id,
      mensaje: externalResponse.detail
    };
  }
}

export class ModoAdapter extends PasarelaPago {
  nombre() {
    return 'MODO';
  }

  async cobrar({ monto, token }) {
    const raw = String(token || '').toLowerCase();
    const externalResponse = raw.includes('rechazad')
      ? { result: 'DECLINED', txCode: `modo_dec_${crypto.randomUUID().slice(0, 8)}`, reason: 'Transferencia MODO rechazada por el banco.' }
      : raw.includes('pendient')
        ? { result: 'PENDING', txCode: `modo_pnd_${crypto.randomUUID().slice(0, 8)}`, reason: 'Aguardando confirmación bancaria MODO.' }
        : { result: 'ACCEPTED', txCode: `modo_acc_${crypto.randomUUID().slice(0, 8)}`, reason: `Pago MODO confirmado por $${monto}.` };

    const mapEstado = {
      ACCEPTED: ESTADOS_PAGO.APROBADO,
      DECLINED: ESTADOS_PAGO.RECHAZADO,
      PENDING: ESTADOS_PAGO.PENDIENTE
    };

    return {
      proveedor: this.nombre(),
      estado: mapEstado[externalResponse.result],
      transaccionExternaId: externalResponse.txCode,
      mensaje: externalResponse.reason
    };
  }
}

export class MockTestAdapter extends PasarelaPago {
  nombre() {
    return 'PASARELA_MOCK';
  }

  async cobrar({ token }) {
    const normalized = String(token || '').toLowerCase();
    const txId = `txn_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;

    if (normalized.includes('rechazad')) {
      return {
        proveedor: this.nombre(),
        estado: ESTADOS_PAGO.RECHAZADO,
        transaccionExternaId: txId,
        mensaje: 'El pago fue rechazado por la entidad emisora.'
      };
    }

    if (normalized.includes('pendient')) {
      return {
        proveedor: this.nombre(),
        estado: ESTADOS_PAGO.PENDIENTE,
        transaccionExternaId: txId,
        mensaje: 'La operación se encuentra a la espera de acreditación.'
      };
    }

    return {
      proveedor: this.nombre(),
      estado: ESTADOS_PAGO.APROBADO,
      transaccionExternaId: txId,
      mensaje: 'Operación exitosa.'
    };
  }
}

export class PasarelaFactory {
  constructor() {
    this.creadores = new Map();
  }

  static conPasarelasEstandar() {
    return new PasarelaFactory()
      .registrar('MERCADOPAGO', () => new MercadoPagoAdapter())
      .registrar('MP', () => new MercadoPagoAdapter())
      .registrar('MODO', () => new ModoAdapter())
      .registrar('TARJETA', () => new MockTestAdapter())
      .registrar('TARJETA_MOCK', () => new MockTestAdapter())
      .registrar('TARJETA_RECHAZADA', () => new MockTestAdapter())
      .registrar('TRANSFERENCIA', () => new MockTestAdapter())
      .registrar('TRANSFERENCIA_PENDIENTE', () => new MockTestAdapter())
      .registrar('EFECTIVO', () => new MockTestAdapter());
  }

  registrar(clave, creadorFn) {
    this.creadores.set(String(clave).trim().toUpperCase(), creadorFn);
    return this;
  }

  crear(metodoPago) {
    const raw = String(metodoPago || 'TARJETA').trim().toUpperCase();

    if (this.creadores.has(raw)) {
      return this.creadores.get(raw)();
    }
    if (raw.startsWith('MERCADOPAGO') || raw.startsWith('MP_')) {
      return this.creadores.get('MERCADOPAGO')();
    }
    if (raw.startsWith('MODO')) {
      return this.creadores.get('MODO')();
    }
    if (raw.startsWith('TARJETA') || raw.startsWith('TRANSFERENCIA') || raw.startsWith('TOK_')) {
      return this.creadores.get('TARJETA')();
    }

    throw new UnsupportedGatewayError(metodoPago);
  }
}