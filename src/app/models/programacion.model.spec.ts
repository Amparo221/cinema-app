import { describe, expect, it } from 'vitest';
import {
  FuncionOcupada,
  FuncionProgramada,
  ResultadoCancelacionFuncion,
  combinarFuncionesManuales,
  combinarTipos,
  detectarConflictos,
  etiquetaIdioma,
  etiquetaTipo,
  fechasEnRango,
  horaCorta,
  horariosDelDia,
  puedeCancelarFuncion,
  resumenCancelacion,
  resumenGeneracion,
  sumarDias,
} from './programacion.model';

function propuesta(
  fecha: string,
  hora: string,
  formato: '2D' | '3D' = '2D'
): FuncionProgramada {
  return { fecha, hora, formato, idioma: 'castellano' };
}

function ocupada(datos: Partial<FuncionOcupada> = {}): FuncionOcupada {
  return {
    id: 1,
    fecha: '2026-11-20',
    hora: '14:00:00',
    sala_id: 1,
    salas: { nombre: 'Sala 1' },
    peliculas: { nombre: 'Otra película', duracion: 90 },
    ...datos,
  };
}

function resultado(
  datos: Partial<ResultadoCancelacionFuncion> = {}
): ResultadoCancelacionFuncion {
  return {
    compras: 1,
    entradas: 2,
    usuarios: 1,
    anonimas: 0,
    credito: 9000,
    puntos_devueltos: 0,
    puntos_ganados: 0,
    ...datos,
  };
}

describe('programacion.model', () => {
  describe('horariosDelDia', () => {
    it('reparte las funciones dentro de la ventana', () => {
      expect(
        horariosDelDia({
          duracion: 90,
          porDia: 3,
          horaInicio: '12:00',
          horaFin: '23:30',
        })
      ).toEqual(['12:00', '17:00', '22:00']);
    });

    it('redondea el paso a 5 minutos', () => {
      expect(
        horariosDelDia({
          duracion: 90,
          porDia: 4,
          horaInicio: '12:00',
          horaFin: '23:30',
        })
      ).toEqual(['12:00', '15:20', '18:40', '22:00']);
    });

    it('con una sola función usa la primera hora', () => {
      expect(
        horariosDelDia({ duracion: 90, porDia: 1, horaInicio: '20:30', horaFin: '23:30' })
      ).toEqual(['20:30']);
    });

    it('devuelve vacío si la ventana no alcanza', () => {
      expect(
        horariosDelDia({ duracion: 180, porDia: 4, horaInicio: '12:00', horaFin: '23:30' })
      ).toEqual([]);
      expect(
        horariosDelDia({ duracion: 120, porDia: 2, horaInicio: '12:00', horaFin: '14:00' })
      ).toEqual([]);
    });

    it('ignora horas inválidas o cantidades fuera de rango', () => {
      expect(
        horariosDelDia({ duracion: 90, porDia: 3, horaInicio: '25:00', horaFin: '23:30' })
      ).toEqual([]);
      expect(
        horariosDelDia({ duracion: 90, porDia: 0, horaInicio: '12:00', horaFin: '23:30' })
      ).toEqual([]);
    });
  });

  describe('fechasEnRango', () => {
    it('filtra por días de la semana', () => {
      expect(fechasEnRango('2026-11-20', '2026-11-29', [5, 6, 0])).toEqual([
        '2026-11-20',
        '2026-11-21',
        '2026-11-22',
        '2026-11-27',
        '2026-11-28',
        '2026-11-29',
      ]);
    });

    it('devuelve vacío con un rango invertido o inválido', () => {
      expect(fechasEnRango('2026-11-29', '2026-11-20', [5])).toEqual([]);
      expect(fechasEnRango('no-es-fecha', '2026-11-20', [5])).toEqual([]);
    });
  });

  describe('sumarDias', () => {
    it('cruza el cambio de mes', () => {
      expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
      expect(sumarDias('2026-12-01', -1)).toBe('2026-11-30');
    });
  });

  describe('combinarTipos', () => {
    it('hace el producto de idiomas y formatos', () => {
      expect(combinarTipos(['castellano', 'subtitulada'], ['2D', '3D'])).toEqual([
        { idioma: 'castellano', formato: '2D' },
        { idioma: 'castellano', formato: '3D' },
        { idioma: 'subtitulada', formato: '2D' },
        { idioma: 'subtitulada', formato: '3D' },
      ]);
    });

    it('devuelve vacío si no hay nada elegido', () => {
      expect(combinarTipos([], ['2D'])).toEqual([]);
      expect(combinarTipos(['castellano'], [])).toEqual([]);
    });
  });

  describe('combinarFuncionesManuales', () => {
    it('combina fechas y horarios repartiendo los tipos', () => {
      const funciones = combinarFuncionesManuales(
        ['2026-11-22', '2026-11-21'],
        ['20:00', '18:00'],
        [
          { idioma: 'castellano', formato: '2D' },
          { idioma: 'subtitulada', formato: '3D' },
        ]
      );

      expect(funciones).toEqual([
        { fecha: '2026-11-21', hora: '18:00', formato: '2D', idioma: 'castellano' },
        { fecha: '2026-11-21', hora: '20:00', formato: '3D', idioma: 'subtitulada' },
        { fecha: '2026-11-22', hora: '18:00', formato: '2D', idioma: 'castellano' },
        { fecha: '2026-11-22', hora: '20:00', formato: '3D', idioma: 'subtitulada' },
      ]);
    });

    it('no crea nada sin tipos', () => {
      expect(combinarFuncionesManuales(['2026-11-21'], ['18:00'], [])).toEqual([]);
    });
  });

  describe('detectarConflictos', () => {
    it('marca 29 minutos de separación como choque', () => {
      const conflictos = detectarConflictos(
        [propuesta('2026-11-20', '15:29')],
        [ocupada()],
        90
      );

      expect(conflictos).toHaveLength(1);
      expect(conflictos[0]?.mensaje).toContain('Sala 1');
      expect(conflictos[0]?.mensaje).toContain('30 minutos');
    });

    it('permite exactamente 30 minutos de separación', () => {
      expect(detectarConflictos([propuesta('2026-11-20', '16:00')], [ocupada()], 90)).toEqual([]);
    });

    it('no marca una función de otro día', () => {
      expect(detectarConflictos([propuesta('2026-11-21', '14:00')], [ocupada()], 90)).toEqual([]);
    });

    it('marca el solapamiento aunque empiece antes', () => {
      expect(detectarConflictos([propuesta('2026-11-20', '13:30')], [ocupada()], 90)).toHaveLength(
        1
      );
    });
  });

  describe('etiquetas y resumen', () => {
    it('etiqueta idiomas y tipos', () => {
      expect(etiquetaIdioma('castellano')).toBe('Doblada');
      expect(etiquetaIdioma('subtitulada')).toBe('Subtitulada');
      expect(etiquetaIdioma(null)).toBe('—');
      expect(etiquetaTipo({ idioma: 'castellano', formato: '3D' })).toBe('Doblada 3D');
      expect(horaCorta('20:30:00')).toBe('20:30');
    });

    it('resume las funciones creadas y omitidas', () => {
      const creada = {
        id: 1,
        fecha: '2026-11-20',
        hora: '20:30',
        sala: 'Sala 1',
        formato: '2D',
        idioma: 'castellano',
      };
      const omitida = { fecha: '2026-11-21', hora: '20:30', motivo: 'SIN_SALA' };

      expect(resumenGeneracion({ creadas: [creada], omitidas: [] })).toBe('Se creó 1 función.');
      expect(resumenGeneracion({ creadas: [creada, creada], omitidas: [] })).toBe(
        'Se crearon 2 funciones.'
      );
      expect(resumenGeneracion({ creadas: [creada, creada], omitidas: [omitida] })).toBe(
        'Se crearon 2 funciones. 1 quedó sin sala libre.'
      );
      expect(resumenGeneracion({ creadas: [], omitidas: [omitida] })).toContain('sin sala libre');
    });
  });

  describe('puedeCancelarFuncion', () => {
    const ahora = new Date('2026-11-20T12:00:00');

    it('permite cancelar una función que todavía no empezó', () => {
      expect(puedeCancelarFuncion({ fecha: '2026-11-20', hora: '18:30:00' }, ahora)).toBe(true);
    });

    it('rechaza una función en curso o pasada', () => {
      expect(puedeCancelarFuncion({ fecha: '2026-11-20', hora: '11:00:00' }, ahora)).toBe(false);
      expect(puedeCancelarFuncion({ fecha: '2026-11-20', hora: '12:00:00' }, ahora)).toBe(false);
    });

    it('rechaza una fecha inválida', () => {
      expect(puedeCancelarFuncion({ fecha: 'no-es-fecha', hora: '18:30' }, ahora)).toBe(false);
    });
  });

  describe('resumenCancelacion', () => {
    it('avisa cuando no había compras', () => {
      expect(resumenCancelacion(resultado({ compras: 0, entradas: 0, usuarios: 0 }))).toBe(
        'Función cancelada. No había compras para esa función.'
      );
    });

    it('cuenta el crédito y las butacas', () => {
      const texto = resumenCancelacion(
        resultado({ compras: 2, entradas: 3, usuarios: 2, credito: 15000 })
      );

      expect(texto).toContain('15.000');
      expect(texto).toContain('2 cuentas');
      expect(texto).toContain('3 butacas');
    });

    it('menciona los puntos devueltos y los descontados', () => {
      const texto = resumenCancelacion(
        resultado({
          compras: 1,
          entradas: 1,
          usuarios: 1,
          credito: 9000,
          puntos_devueltos: 18000,
          puntos_ganados: 500,
        })
      );

      expect(texto).toContain('18.000 puntos de combos');
      expect(texto).toContain('Se descontaron 500 puntos');
    });

    it('avisa si las compras eran anónimas', () => {
      const texto = resumenCancelacion(
        resultado({ compras: 1, entradas: 2, usuarios: 0, anonimas: 1 })
      );

      expect(texto).toContain('no hay cuenta para acreditar');
    });
  });
});
