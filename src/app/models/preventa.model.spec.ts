import { describe, expect, it } from 'vitest';
import { Pelicula } from './pelicula.model';
import {
  DIAS_PREVENTA,
  esProximamente,
  estaEnPreventa,
  fechaInicioPreventa,
  precioButacaBase,
  precioButacaConPreventa,
} from './preventa.model';

function pelicula(datos: Partial<Pelicula> = {}): Pelicula {
  return {
    id: 1,
    nombre: 'Estreno',
    imagen: null,
    sinopsis: null,
    duracion: 100,
    generos: [],
    restriccion_edad: null,
    precio_preventa: 40000,
    puntuacion_promedio: 0,
    proximamente: true,
    fecha_estreno: '2026-11-20',
    ...datos,
  };
}

const CONFIG = {
  precio_butaca_normal: 10000,
  precio_butaca_vip: 15000,
  precio_butaca_accesible: 12000,
};

describe('preventa.model', () => {
  describe('fechaInicioPreventa', () => {
    it('arranca 7 días antes del estreno', () => {
      expect(DIAS_PREVENTA).toBe(7);
      expect(fechaInicioPreventa('2026-11-20')).toBe('2026-11-13');
    });

    it('cruza el cambio de mes', () => {
      expect(fechaInicioPreventa('2026-11-03')).toBe('2026-10-27');
    });

    it('devuelve null sin fecha o con formato inválido', () => {
      expect(fechaInicioPreventa(null)).toBeNull();
      expect(fechaInicioPreventa(undefined)).toBeNull();
      expect(fechaInicioPreventa('')).toBeNull();
      expect(fechaInicioPreventa('no-es-fecha')).toBeNull();
    });
  });

  describe('estaEnPreventa', () => {
    const estreno = '2026-11-20';

    it('no está abierta antes de los 7 días', () => {
      expect(estaEnPreventa(pelicula(), '2026-11-12')).toBe(false);
    });

    it('abre el primer día de la ventana', () => {
      expect(estaEnPreventa(pelicula(), '2026-11-13')).toBe(true);
    });

    it('sigue abierta el día anterior al estreno', () => {
      expect(estaEnPreventa(pelicula(), '2026-11-19')).toBe(true);
    });

    it('termina el día del estreno', () => {
      expect(estaEnPreventa(pelicula(), estreno)).toBe(false);
    });

    it('no aplica sin fecha de estreno', () => {
      expect(estaEnPreventa(pelicula({ fecha_estreno: null }), '2026-11-19')).toBe(false);
    });

    it('no aplica si el estreno ya pasó', () => {
      expect(estaEnPreventa(pelicula(), '2026-12-01')).toBe(false);
    });
  });

  describe('esProximamente', () => {
    it('usa la fecha de estreno cuando existe', () => {
      expect(esProximamente(pelicula(), '2026-11-19')).toBe(true);
      expect(esProximamente(pelicula(), '2026-11-20')).toBe(false);
      expect(esProximamente(pelicula(), '2026-11-21')).toBe(false);
    });

    it('cae al flag cuando no hay fecha', () => {
      expect(esProximamente(pelicula({ fecha_estreno: null }), '2026-11-19')).toBe(true);
      expect(
        esProximamente(pelicula({ fecha_estreno: null, proximamente: false }), '2026-11-19')
      ).toBe(false);
    });
  });

  describe('precioButacaBase', () => {
    it('devuelve el precio según la fila', () => {
      expect(precioButacaBase('A1', CONFIG)).toBe(10000);
      expect(precioButacaBase('J1', CONFIG)).toBe(12000);
      expect(precioButacaBase('r1', CONFIG)).toBe(15000);
    });

    it('usa los valores por defecto sin configuración', () => {
      expect(precioButacaBase('A1')).toBe(10000);
      expect(precioButacaBase('R1')).toBe(15000);
    });
  });

  describe('precioButacaConPreventa', () => {
    it('cobra el precio de preventa en butacas normales', () => {
      expect(precioButacaConPreventa('A1', CONFIG, 40000)).toBe(40000);
    });

    it('mantiene la diferencia de las VIP', () => {
      expect(precioButacaConPreventa('R1', CONFIG, 40000)).toBe(45000);
    });

    it('mantiene la diferencia de las accesibles', () => {
      expect(precioButacaConPreventa('J1', CONFIG, 40000)).toBe(42000);
    });

    it('no descuenta si la butaca vale menos que la normal', () => {
      const config = { ...CONFIG, precio_butaca_accesible: 8000 };
      expect(precioButacaConPreventa('J1', config, 40000)).toBe(40000);
    });

    it('vuelve al precio de cartelera sin precio de preventa', () => {
      expect(precioButacaConPreventa('A1', CONFIG, null)).toBe(10000);
      expect(precioButacaConPreventa('R1', CONFIG, 0)).toBe(15000);
    });
  });
});
