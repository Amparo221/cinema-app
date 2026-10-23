import { describe, expect, it } from 'vitest';
import {
  FilaEstadoButaca,
  esButacaVip,
  mapearOcupacion,
  tipoButacaPorFila,
} from './butaca.model';

describe('tipoButacaPorFila', () => {
  it('identifica accesibles, VIP y normales', () => {
    expect(tipoButacaPorFila('J')).toBe('accesible');
    expect(tipoButacaPorFila('k')).toBe('accesible');
    expect(tipoButacaPorFila('R')).toBe('vip');
    expect(tipoButacaPorFila(' t ')).toBe('vip');
    expect(tipoButacaPorFila('A')).toBe('normal');
  });

  it('detecta si un codigo pertenece a una fila VIP', () => {
    expect(esButacaVip('R12')).toBe(true);
    expect(esButacaVip('S1')).toBe(true);
    expect(esButacaVip('T30')).toBe(true);
    expect(esButacaVip('J11')).toBe(false);
    expect(esButacaVip('A1')).toBe(false);
    expect(esButacaVip('')).toBe(false);
  });
});

describe('mapearOcupacion', () => {
  const ahora = new Date('2026-10-22T12:00:00.000Z').getTime();
  const enUnaHora = new Date(ahora + 60 * 60 * 1000).toISOString();
  const haceUnaHora = new Date(ahora - 60 * 60 * 1000).toISOString();

  it('separa vendidas, reservadas por otros y reservas propias', () => {
    const filas: FilaEstadoButaca[] = [
      { codigo_butaca: 'A1', estado: 'vendida', propia: false, expira_at: null },
      { codigo_butaca: 'A2', estado: 'bloqueada', propia: false, expira_at: enUnaHora },
      { codigo_butaca: 'A3', estado: 'bloqueada', propia: true, expira_at: enUnaHora },
    ];

    expect(mapearOcupacion(filas, ahora)).toEqual({
      vendidas: ['A1'],
      reservadas: ['A2'],
      propias: ['A3'],
    });
  });

  it('ignora bloqueos vencidos aunque la fila siga existiendo', () => {
    const filas: FilaEstadoButaca[] = [
      { codigo_butaca: 'B1', estado: 'bloqueada', propia: false, expira_at: haceUnaHora },
      { codigo_butaca: 'B2', estado: 'bloqueada', propia: true, expira_at: haceUnaHora },
      { codigo_butaca: 'B3', estado: 'bloqueada', propia: false, expira_at: enUnaHora },
    ];

    expect(mapearOcupacion(filas, ahora)).toEqual({
      vendidas: [],
      reservadas: ['B3'],
      propias: [],
    });
  });

  it('considera vendida una butaca sin importar su expira_at', () => {
    const filas: FilaEstadoButaca[] = [
      { codigo_butaca: 'C1', estado: 'vendida', propia: true, expira_at: haceUnaHora },
    ];

    expect(mapearOcupacion(filas, ahora)).toEqual({
      vendidas: ['C1'],
      reservadas: [],
      propias: [],
    });
  });

  it('devuelve listas vacias cuando no hay filas', () => {
    expect(mapearOcupacion([], ahora)).toEqual({
      vendidas: [],
      reservadas: [],
      propias: [],
    });
  });
});
