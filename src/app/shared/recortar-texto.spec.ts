import { describe, expect, it } from 'vitest';
import { RecortarTexto } from './recortar-texto';

describe('RecortarTexto', () => {
  const pipe = new RecortarTexto();

  it('deja intacto un texto corto', () => {
    expect(pipe.transform('Heidi', 10)).toBe('Heidi');
  });

  it('no recorta cuando el texto mide justo el límite', () => {
    expect(pipe.transform('12345', 5)).toBe('12345');
  });

  it('recorta y agrega puntos suspensivos', () => {
    expect(pipe.transform('Una película muy larga', 10)).toBe('Una pelícu...');
  });

  it('no deja un espacio antes de los puntos', () => {
    expect(pipe.transform('Heidi en los Alpes', 6)).toBe('Heidi...');
  });

  it('devuelve vacío para null o undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('usa 40 caracteres por defecto', () => {
    expect(pipe.transform('a'.repeat(45))).toBe(`${'a'.repeat(40)}...`);
  });

  it('nunca usa un límite menor a 1', () => {
    expect(pipe.transform('abc', 0)).toBe('a...');
  });
});
