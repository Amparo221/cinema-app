import { describe, expect, it } from 'vitest';
import {
  diasDelMes,
  enmascararFecha,
  fechaAIso,
  fechaCompleta,
  fechaReal,
  isoAFecha,
  posicionDelCursor,
  soloDigitos,
} from './fecha-mascara';

describe('soloDigitos', () => {
  it('deja únicamente números y corta en 8', () => {
    expect(soloDigitos('02/11/2006')).toBe('02112006');
    expect(soloDigitos('a0b2c1d1e2f0g0h6')).toBe('02112006');
    expect(soloDigitos('0211200699')).toBe('02112006');
    expect(soloDigitos('')).toBe('');
  });

  it('tolera nulos', () => {
    expect(soloDigitos(null)).toBe('');
    expect(soloDigitos(undefined)).toBe('');
  });
});

describe('enmascararFecha', () => {
  it('inserta las barras a medida que se escribe', () => {
    expect(enmascararFecha('')).toBe('');
    expect(enmascararFecha('0')).toBe('0');
    expect(enmascararFecha('02')).toBe('02');
    expect(enmascararFecha('021')).toBe('02/1');
    expect(enmascararFecha('0211')).toBe('02/11');
    expect(enmascararFecha('02112')).toBe('02/11/2');
    expect(enmascararFecha('02112006')).toBe('02/11/2006');
  });

  it('es idempotente con un texto ya enmascarado', () => {
    expect(enmascararFecha('02/11/2006')).toBe('02/11/2006');
  });

  it('se comporta bien al borrar con Backspace', () => {
    // Cada paso simula borrar el último carácter del texto visible.
    const pasos = [
      '02/11/2006',
      '02/11/200',
      '02/11/20',
      '02/11/2',
      '02/11',
      '02/1',
      '02',
      '0',
      '',
    ];

    for (let i = 1; i < pasos.length; i++) {
      expect(enmascararFecha(pasos[i])).toBe(pasos[i]);
    }
  });
});

describe('fechaCompleta', () => {
  it('pide los 8 dígitos', () => {
    expect(fechaCompleta('02/11/200')).toBe(false);
    expect(fechaCompleta('02/11/2006')).toBe(true);
  });
});

describe('diasDelMes', () => {
  it('sabe cuántos días tiene cada mes', () => {
    expect(diasDelMes(1, 2026)).toBe(31);
    expect(diasDelMes(2, 2026)).toBe(28);
    expect(diasDelMes(2, 2024)).toBe(29);
    expect(diasDelMes(2, 1900)).toBe(28);
    expect(diasDelMes(2, 2000)).toBe(29);
    expect(diasDelMes(4, 2026)).toBe(30);
    expect(diasDelMes(13, 2026)).toBe(0);
  });
});

describe('fechaReal', () => {
  it('acepta fechas que existen', () => {
    expect(fechaReal('02/11/2006')).toBe(true);
    expect(fechaReal('29/02/2024')).toBe(true);
    expect(fechaReal('31/12/1999')).toBe(true);
  });

  it('rechaza fechas imposibles', () => {
    expect(fechaReal('31/02/2006')).toBe(false);
    expect(fechaReal('29/02/2026')).toBe(false);
    expect(fechaReal('00/00/0000')).toBe(false);
    expect(fechaReal('02/13/2006')).toBe(false);
    expect(fechaReal('02/11/1899')).toBe(false);
    expect(fechaReal('02/11/200')).toBe(false);
  });
});

describe('fechaAIso', () => {
  it('convierte a ISO cuando la fecha es válida', () => {
    expect(fechaAIso('02/11/2006')).toBe('2006-11-02');
    expect(fechaAIso('05052026')).toBe('2026-05-05');
  });

  it('devuelve vacío cuando la fecha está incompleta o no existe', () => {
    expect(fechaAIso('02/11')).toBe('');
    expect(fechaAIso('31/02/2006')).toBe('');
    expect(fechaAIso('')).toBe('');
  });
});

describe('isoAFecha', () => {
  it('convierte el ISO al formato visible', () => {
    expect(isoAFecha('2006-11-02')).toBe('02/11/2006');
  });

  it('devuelve vacío con otros formatos', () => {
    expect(isoAFecha('')).toBe('');
    expect(isoAFecha(null)).toBe('');
    expect(isoAFecha('02/11/2006')).toBe('');
    expect(isoAFecha('2006-11-2')).toBe('');
  });

  it('hace ida y vuelta con `fechaAIso`', () => {
    expect(fechaAIso(isoAFecha('2026-05-05'))).toBe('2026-05-05');
  });
});

describe('posicionDelCursor', () => {
  it('cuenta los caracteres hasta el dígito indicado', () => {
    expect(posicionDelCursor('02/11/2006', 0)).toBe(0);
    expect(posicionDelCursor('02/11/2006', 2)).toBe(2);
    expect(posicionDelCursor('02/11/2006', 3)).toBe(4);
    expect(posicionDelCursor('02/11/2006', 8)).toBe(10);
    expect(posicionDelCursor('02/11/2006', 99)).toBe(10);
  });
});
