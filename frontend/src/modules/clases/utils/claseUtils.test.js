import { describe, expect, it } from 'vitest';
import { formatoFecha, formatoFechaHora, formatoHora, estadoLabel } from './claseUtils';

describe('claseUtils', () => {
  it('muestra fechas y horas según la zona horaria argentina', () => {
    const fechaUtc = '2026-11-13T19:00:00.000Z';

    expect(formatoFecha(fechaUtc)).toContain('16:00');
    expect(formatoHora(fechaUtc)).toContain('16:00');
    expect(formatoFechaHora(fechaUtc)).toContain('16:00');
  });

  describe('estadoLabel', () => {
    it('devuelve null si no hay inscripción', () => {
      expect(estadoLabel(null)).toBeNull();
      expect(estadoLabel(undefined)).toBeNull();
    });

    it('devuelve la etiqueta correcta para estado confirmado', () => {
      expect(estadoLabel({ estado: 'confirmado' })).toBe('Reserva confirmada');
      expect(estadoLabel({ estado: 'confirmado', fechaExpiracionOferta: '2026-11-13T19:00:00.000Z' })).toBe(
        'Cupo confirmado desde la lista de espera'
      );
    });

    it('devuelve la etiqueta correcta para estado en espera', () => {
      expect(estadoLabel({ estado: 'en espera' })).toBe('En lista de espera');
    });

    it('devuelve la etiqueta correcta para estado notificado', () => {
      const label = estadoLabel({ estado: 'notificado', fechaExpiracionOferta: '2026-11-13T19:00:00.000Z' });
      expect(label).toContain('Tenés un lugar ofrecido hasta');
    });

    it('devuelve el estado tal cual si es desconocido', () => {
      expect(estadoLabel({ estado: 'desconocido' })).toBe('desconocido');
    });
  });
});

