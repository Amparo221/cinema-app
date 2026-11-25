import { describe, expect, it } from 'vitest';
import {
  BUTACAS,
  FilaEstadoButaca,
  TOTAL_BUTACAS,
  butacasLibres,
  esButacaVip,
  generarButacas,
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

describe('layout de la sala', () => {
  it('genera 532 butacas con codigos unicos', () => {
    const butacas = generarButacas();

    expect(TOTAL_BUTACAS).toBe(532);
    expect(butacas).toHaveLength(532);
    expect(BUTACAS).toHaveLength(532);
    expect(new Set(butacas.map((butaca) => butaca.codigo)).size).toBe(532);
  });

  it('deja 14 butacas accesibles por fila en J y K', () => {
    const filaJ = BUTACAS.filter((butaca) => butaca.fila === 'J');

    expect(filaJ).toHaveLength(14);
    expect(filaJ.every((butaca) => butaca.tipo === 'accesible')).toBe(true);
    expect(filaJ.some((butaca) => butaca.codigo === 'J11')).toBe(true);
    expect(filaJ.some((butaca) => butaca.codigo === 'J15')).toBe(true);
    expect(filaJ.some((butaca) => butaca.codigo === 'J1')).toBe(false);
  });

  it('marca R, S y T como VIP', () => {
    expect(BUTACAS.filter((butaca) => butaca.tipo === 'vip')).toHaveLength(84);
    expect(BUTACAS.filter((butaca) => butaca.tipo === 'normal')).toHaveLength(420);
  });
});

describe('butacasLibres', () => {
  it('descuenta las vendidas y las reservadas por otros', () => {
    const libres = butacasLibres(['A1'], ['A2']);

    expect(libres).toHaveLength(TOTAL_BUTACAS - 2);
    expect(libres).not.toContain('A1');
    expect(libres).not.toContain('A2');
    expect(libres).toContain('A3');
  });

  it('devuelve todas cuando no hay butacas ocupadas', () => {
    expect(butacasLibres([])).toHaveLength(TOTAL_BUTACAS);
  });

  it('ignora codigos que no existen en el layout', () => {
    expect(butacasLibres(['ZZ99'])).toHaveLength(TOTAL_BUTACAS);
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
