export class ComprobanteBuilder {
  constructor() {
    this.datos = {
      empresa: 'FitZone Sports',
      numeroComprobante: 'FZ-000000',
      fecha: new Date().toISOString(),
      socioId: '-',
      concepto: 'Servicio Deportivo',
      reservaId: null,
      medioPago: 'TARJETA',
      transaccionId: 'N/A',
      estado: 'APROBADO',
      moneda: 'ARS',
      monto: 0
    };
  }

  conNumero(id) {
    this.datos.numeroComprobante = `FZ-${String(id || 0).padStart(6, '0')}`;
    return this;
  }

  conFecha(fecha) {
    if (fecha) this.datos.fecha = new Date(fecha).toISOString();
    return this;
  }

  conSocio(userId) {
    this.datos.socioId = String(userId ?? '-');
    return this;
  }

  conDetalleOperacion({ concepto, reservaId }) {
    if (concepto) this.datos.concepto = concepto;
    this.datos.reservaId = reservaId ?? null;
    return this;
  }

  conPago({ medioPago, transaccionId, estado, monto, moneda = 'ARS' }) {
    if (medioPago) this.datos.medioPago = medioPago;
    if (transaccionId) this.datos.transaccionId = transaccionId;
    if (estado) this.datos.estado = estado;
    if (monto !== undefined) this.datos.monto = Number(monto);
    this.datos.moneda = moneda;
    return this;
  }

  build() {
    const snapshot = Object.freeze({ ...this.datos });
    const lineas = [
      `${snapshot.empresa} - COMPROBANTE DE PAGO`,
      `Comprobante Nro: ${snapshot.numeroComprobante}`,
      `Fecha: ${snapshot.fecha}`,
      `Socio ID: ${snapshot.socioId}`,
      `Concepto: ${snapshot.concepto}`,
      snapshot.reservaId ? `Reserva Cancha ID: #${snapshot.reservaId}` : 'Tipo: Membresia / Abono',
      `Medio de Pago: ${snapshot.medioPago}`,
      `Transaccion Pasarela: ${snapshot.transaccionId}`,
      `Estado: ${snapshot.estado}`,
      `Total Abonado: ${snapshot.moneda} $${snapshot.monto.toFixed(2)}`
    ];

    return {
      metadata: snapshot,
      buffer: renderMinimalPdf(lineas)
    };
  }
}

const escapePdfText = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const renderMinimalPdf = (lines) => {
  const textCommands = lines
    .map((line, idx) => {
      const y = 760 - idx * 24;
      const fontSize = idx === 0 ? 15 : 11;
      return `BT /F1 ${fontSize} Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
    })
    .join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${Buffer.byteLength(textCommands, 'utf8')} >> stream\n${textCommands}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
};

export const generarComprobantePdf = (paymentRecord) => {
  return new ComprobanteBuilder()
    .conNumero(paymentRecord.id)
    .conFecha(paymentRecord.fecha_pago)
    .conSocio(paymentRecord.id_usuario)
    .conDetalleOperacion({
      concepto: paymentRecord.concepto,
      reservaId: paymentRecord.id_reserva_cancha
    })
    .conPago({
      medioPago: paymentRecord.medio_pago,
      transaccionId: paymentRecord.transaccion_externa_id,
      estado: paymentRecord.estado,
      monto: paymentRecord.monto,
      moneda: paymentRecord.moneda || 'ARS'
    })
    .build();
};