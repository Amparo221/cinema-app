import { describe, expect, it } from 'vitest';
import {
  CompraReporte,
  DatosReporte,
  FilaFacturacion,
  PeliculaMasVista,
  ProductoCandyVendido,
} from '../../../models/reporte.model';
import {
  completarDias,
  diasDelRango,
  errorDeRango,
  etiquetaDia,
  etiquetaPeriodo,
  filaVacia,
  hojasExcel,
  mejorProducto,
  nombreArchivoReporte,
  numero,
  rangoMesActual,
  rangoSemanaActual,
  rangoUltimosDias,
  serieCandy,
  seriePeliculas,
  sumarDias,
  totalesDe,
} from './reporte-datos';

const FILA: FilaFacturacion = {
  dia: '2026-11-10',
  compras: 3,
  entradas: 5,
  entradas_usadas: 2,
  dinero_butacas: 1000,
  dinero_candy: 250,
  total_cobrado: 1250,
  puntos_usados: 0,
  creditos_usados: 100,
  canceladas: 1,
  monto_cancelado: 500,
};

describe('reporte-datos', () => {
  describe('numero', () => {
    it('acepta los numeric que llegan como texto', () => {
      expect(numero('1250.50')).toBe(1250.5);
    });

    it('devuelve 0 para nulos o valores raros', () => {
      expect(numero(null)).toBe(0);
      expect(numero('abc')).toBe(0);
      expect(numero(Number.NaN)).toBe(0);
    });
  });

  describe('fechas', () => {
    it('suma días cruzando el fin de mes', () => {
      expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
      expect(sumarDias('2026-11-01', -1)).toBe('2026-10-31');
    });

    it('cuenta los dos extremos del rango', () => {
      expect(diasDelRango({ desde: '2026-11-01', hasta: '2026-11-14' })).toBe(14);
      expect(diasDelRango({ desde: '2026-11-14', hasta: '2026-11-14' })).toBe(1);
    });

    it('arma el rango de los últimos días con hoy incluido', () => {
      const hoy = new Date('2026-11-14T15:00:00Z');

      expect(rangoUltimosDias(7, hoy)).toEqual({ desde: '2026-11-08', hasta: '2026-11-14' });
    });

    it('arranca la semana el lunes', () => {
      const sabado = new Date('2026-11-14T15:00:00Z');

      expect(rangoSemanaActual(sabado)).toEqual({ desde: '2026-11-09', hasta: '2026-11-14' });
    });

    it('arma el mes en curso', () => {
      expect(rangoMesActual(new Date('2026-11-14T15:00:00Z'))).toEqual({
        desde: '2026-11-01',
        hasta: '2026-11-14',
      });
    });

    it('rechaza rangos invertidos o demasiado largos', () => {
      expect(errorDeRango({ desde: '2026-11-14', hasta: '2026-11-01' })).toContain(
        'no puede ser anterior',
      );
      expect(errorDeRango({ desde: '2025-01-01', hasta: '2026-11-14' })).toContain('366');
      expect(errorDeRango({ desde: '', hasta: '2026-11-14' })).toContain('Elegí');
      expect(errorDeRango({ desde: '2026-11-01', hasta: '2026-11-14' })).toBeNull();
    });
  });

  describe('etiquetas', () => {
    it('muestra el día como dd/mm', () => {
      expect(etiquetaDia('2026-11-14')).toBe('14/11');
    });

    it('nombra los períodos según la agrupación', () => {
      expect(etiquetaPeriodo('2026-11', 'mes')).toBe('noviembre 2026');
      expect(etiquetaPeriodo('2026-11-09', 'semana')).toBe('semana del 09/11');
    });
  });

  describe('totales', () => {
    it('completa con ceros los días sin ventas', () => {
      const rango = { desde: '2026-11-09', hasta: '2026-11-11' };

      const dias = completarDias([FILA], rango);

      expect(dias.map((dia) => dia.dia)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11']);
      expect(dias[0]).toEqual(filaVacia('2026-11-09'));
      expect(dias[1].total_cobrado).toBe(1250);
    });

    it('suma todas las columnas del rango', () => {
      const totales = totalesDe([FILA, FILA]);

      expect(totales.compras).toBe(6);
      expect(totales.entradas).toBe(10);
      expect(totales.dinero_candy).toBe(500);
      expect(totales.total_cobrado).toBe(2500);
      expect(totales.canceladas).toBe(2);
    });
  });

  describe('series para los gráficos', () => {
    const PELICULAS: PeliculaMasVista[] = [
      {
        periodo: '2026-11-09',
        periodo_inicio: '2026-11-09',
        pelicula_id: 1,
        pelicula: 'Duna',
        entradas: 10,
        ingresos: 1000,
      },
      {
        periodo: '2026-11-16',
        periodo_inicio: '2026-11-16',
        pelicula_id: 1,
        pelicula: 'Duna',
        entradas: 5,
        ingresos: 500,
      },
      {
        periodo: '2026-11-09',
        periodo_inicio: '2026-11-09',
        pelicula_id: 2,
        pelicula: 'Alien',
        entradas: 20,
        ingresos: 2000,
      },
    ];

    it('suma las entradas de todos los períodos y ordena de mayor a menor', () => {
      const serie = seriePeliculas(PELICULAS);

      expect(serie.map((punto) => punto.etiqueta)).toEqual(['Alien', 'Duna']);
      expect(serie[1].valor).toBe(15);
      expect(serie[1].detalle).toContain('1.500');
    });

    it('corta la serie según el límite', () => {
      expect(seriePeliculas(PELICULAS, 1)).toHaveLength(1);
    });

    const CANDY: ProductoCandyVendido[] = [
      { producto_id: 1, producto: 'Pochoclo', cantidad: 8, ingresos: 800, combos: 2, extras: 6 },
      { producto_id: 2, producto: 'Gaseosa', cantidad: 12, ingresos: 900, combos: 4, extras: 8 },
    ];

    it('ordena el candy por unidades vendidas', () => {
      const serie = serieCandy(CANDY);

      expect(serie[0].etiqueta).toBe('Gaseosa');
      expect(serie[0].valor).toBe(12);
    });

    it('elige el producto más vendido', () => {
      expect(mejorProducto(CANDY)?.producto).toBe('Gaseosa');
      expect(mejorProducto([])).toBeNull();
    });
  });

  describe('hojas del Excel', () => {
    const COMPRA: CompraReporte = {
      compra_id: 'compra-1',
      creada: '2026-11-10T23:30:00Z',
      fecha: '2026-11-11',
      hora: '20:30:00',
      pelicula: 'Duna',
      sala: 'Sala 1',
      butacas: 2,
      metodo_pago: 'tarjeta',
      precio_butacas: 1000,
      precio_candy: 250,
      puntos_usados: 0,
      creditos_usados: 100,
      total: 1150,
      estado: 'valida',
      combo: null,
    };

    const DATOS: DatosReporte = {
      rango: { desde: '2026-11-10', hasta: '2026-11-10' },
      agrupacion: 'semana',
      totales: totalesDe([FILA]),
      facturacion: [FILA],
      peliculas: [
        {
          periodo: '2026-11-09',
          periodo_inicio: '2026-11-09',
          pelicula_id: 1,
          pelicula: 'Duna',
          entradas: 10,
          ingresos: 1000,
        },
      ],
      candy: [
        { producto_id: 1, producto: 'Pochoclo', cantidad: 8, ingresos: 800, combos: 2, extras: 6 },
      ],
      compras: [COMPRA],
      generadoEl: '14/11/2026, 09:00',
    };

    it('arma una hoja por reporte más el detalle', () => {
      const hojas = hojasExcel(DATOS);

      expect(hojas.map((hoja) => hoja.nombre)).toEqual([
        'Facturación',
        'Películas',
        'Candy',
        'Detalle',
      ]);
    });

    it('incluye la fila TOTAL con números sumables', () => {
      const facturacion = hojasExcel(DATOS)[0];

      const total = facturacion.filas.at(-1);

      expect(total?.[0]).toBe('TOTAL');
      expect(total?.[6]).toBe(1250);
    });

    it('escribe el detalle de compras con su método de pago', () => {
      const detalle = hojasExcel(DATOS)[3];

      expect(detalle.filas[1][0]).toBe('compra-1');
      expect(detalle.filas[1][7]).toBe('tarjeta');
    });

    it('nombra el archivo con el rango', () => {
      expect(nombreArchivoReporte(DATOS.rango, 'xlsx')).toBe(
        'reporte-2026-11-10_a_2026-11-10.xlsx',
      );
      expect(nombreArchivoReporte(DATOS.rango, 'pdf')).toMatch(/\.pdf$/);
    });
  });
});
