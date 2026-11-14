import {
  Agrupacion,
  CompraReporte,
  DatosReporte,
  FilaFacturacion,
  PeliculaMasVista,
  ProductoCandyVendido,
  PuntoGrafico,
  RangoFechas,
  TotalesFacturacion,
} from '../../../models/reporte.model';
import { formatearMoneda, formatearNumero, numero } from '../../../shared/numeros';

export { formatearMoneda, formatearNumero, numero };

/**
 * Funciones puras de /admin/reporte: rangos de fechas, totales, series
 * para los gráficos y las hojas del Excel. No tocan Supabase ni el DOM,
 * así se pueden testear sin mocks.
 */

/** Misma zona horaria que usan las RPC de reportes. */
export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

/** Rango máximo que se puede pedir de una vez. */
export const DIAS_MAXIMOS = 366;

const formatoFechaHora = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA_HORARIA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const formatoIso = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Postgres puede devolver `numeric` como string: todo pasa por acá. */
function partes(fecha: string): [number, number, number] {
  const [anio, mes, dia] = String(fecha).slice(0, 10).split('-').map(Number);
  return [anio, mes, dia];
}

/** Hoy (o la fecha recibida) en la zona del cine, en formato YYYY-MM-DD. */
export function fechaLocal(fecha: Date = new Date()): string {
  return formatoIso.format(fecha);
}

export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = partes(fecha);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Días del rango, contando los dos extremos. */
export function diasDelRango(rango: RangoFechas): number {
  const [anioDesde, mesDesde, diaDesde] = partes(rango.desde);
  const [anioHasta, mesHasta, diaHasta] = partes(rango.hasta);
  const desde = Date.UTC(anioDesde, mesDesde - 1, diaDesde);
  const hasta = Date.UTC(anioHasta, mesHasta - 1, diaHasta);
  return Math.round((hasta - desde) / 86_400_000) + 1;
}

export function rangoUltimosDias(dias: number, hoy: Date = new Date()): RangoFechas {
  const hasta = fechaLocal(hoy);
  const cantidad = Math.max(1, Math.round(dias));
  return { desde: sumarDias(hasta, -(cantidad - 1)), hasta };
}

/** De lunes a hoy: las semanas de la RPC también arrancan el lunes. */
export function rangoSemanaActual(hoy: Date = new Date()): RangoFechas {
  const hasta = fechaLocal(hoy);
  const [anio, mes, dia] = partes(hasta);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  const desde = sumarDias(hasta, -((diaSemana + 6) % 7));
  return { desde, hasta };
}

export function rangoMesActual(hoy: Date = new Date()): RangoFechas {
  const hasta = fechaLocal(hoy);
  return { desde: `${hasta.slice(0, 7)}-01`, hasta };
}

/** Mensaje de error del rango elegido, o `null` si está bien. */
export function errorDeRango(rango: RangoFechas): string | null {
  if (!rango.desde || !rango.hasta) return 'Elegí la fecha desde y la fecha hasta.';
  if (rango.desde > rango.hasta) return 'La fecha hasta no puede ser anterior a la fecha desde.';
  const dias = diasDelRango(rango);
  if (dias <= 0) return 'El rango de fechas no es válido.';
  if (dias > DIAS_MAXIMOS) return `El rango no puede superar los ${DIAS_MAXIMOS} días.`;
  return null;
}

export function filaVacia(dia: string): FilaFacturacion {
  return {
    dia,
    compras: 0,
    entradas: 0,
    entradas_usadas: 0,
    dinero_butacas: 0,
    dinero_candy: 0,
    total_cobrado: 0,
    puntos_usados: 0,
    creditos_usados: 0,
    canceladas: 0,
    monto_cancelado: 0,
  };
}

/** Agrega los días sin ventas para que la tabla y el PDF no tengan huecos. */
export function completarDias(filas: FilaFacturacion[], rango: RangoFechas): FilaFacturacion[] {
  const porDia = new Map<string, FilaFacturacion>();
  for (const fila of filas) {
    porDia.set(String(fila.dia).slice(0, 10), fila);
  }

  const dias = Math.max(diasDelRango(rango), 0);
  const resultado: FilaFacturacion[] = [];
  for (let i = 0; i < dias; i++) {
    const dia = sumarDias(rango.desde, i);
    resultado.push(porDia.get(dia) ?? filaVacia(dia));
  }
  return resultado;
}

export function totalesDe(filas: FilaFacturacion[]): TotalesFacturacion {
  const totales: TotalesFacturacion = {
    compras: 0,
    entradas: 0,
    entradas_usadas: 0,
    dinero_butacas: 0,
    dinero_candy: 0,
    total_cobrado: 0,
    puntos_usados: 0,
    creditos_usados: 0,
    canceladas: 0,
    monto_cancelado: 0,
  };

  for (const fila of filas) {
    totales.compras += numero(fila.compras);
    totales.entradas += numero(fila.entradas);
    totales.entradas_usadas += numero(fila.entradas_usadas);
    totales.dinero_butacas += numero(fila.dinero_butacas);
    totales.dinero_candy += numero(fila.dinero_candy);
    totales.total_cobrado += numero(fila.total_cobrado);
    totales.puntos_usados += numero(fila.puntos_usados);
    totales.creditos_usados += numero(fila.creditos_usados);
    totales.canceladas += numero(fila.canceladas);
    totales.monto_cancelado += numero(fila.monto_cancelado);
  }

  return totales;
}

export function etiquetaDia(dia: string): string {
  const [anio, mes, d] = partes(dia);
  if (!Number.isFinite(anio) || !Number.isFinite(mes) || !Number.isFinite(d)) return String(dia);
  return `${String(d).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
}

export function etiquetaDiaLargo(dia: string): string {
  const [anio, mes, d] = partes(dia);
  if (!Number.isFinite(anio) || !Number.isFinite(mes) || !Number.isFinite(d)) return String(dia);
  return `${String(d).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;
}

export function fechaHoraLocal(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '' : formatoFechaHora.format(fecha);
}

/** 'noviembre 2026' para los meses y 'semana del 10/11' para las semanas. */
export function etiquetaPeriodo(periodo: string, agrupacion: Agrupacion): string {
  if (agrupacion === 'mes') {
    const [anio, mes] = String(periodo).split('-').map(Number);
    const nombre = MESES[mes - 1];
    return nombre ? `${nombre} ${anio}` : String(periodo);
  }
  return `semana del ${etiquetaDia(periodo)}`;
}

/**
 * Películas más vistas del rango: suma las entradas de todos los períodos
 * y deja las primeras `limite` para el gráfico.
 */
export function seriePeliculas(filas: PeliculaMasVista[], limite = 6): PuntoGrafico[] {
  const acumulado = new Map<string, { entradas: number; ingresos: number }>();

  for (const fila of filas) {
    const actual = acumulado.get(fila.pelicula) ?? { entradas: 0, ingresos: 0 };
    actual.entradas += numero(fila.entradas);
    actual.ingresos += numero(fila.ingresos);
    acumulado.set(fila.pelicula, actual);
  }

  return [...acumulado.entries()]
    .map(([etiqueta, datos]) => ({
      etiqueta,
      valor: datos.entradas,
      detalle: formatearMoneda(datos.ingresos),
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite);
}

/** Unidades vendidas por producto de candy, de mayor a menor. */
export function serieCandy(filas: ProductoCandyVendido[], limite = 6): PuntoGrafico[] {
  return filas
    .map((fila) => ({
      etiqueta: fila.producto,
      valor: numero(fila.cantidad),
      detalle: formatearMoneda(fila.ingresos),
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite);
}

/** El producto más vendido del rango, para el destacado de la página. */
export function mejorProducto(filas: ProductoCandyVendido[]): ProductoCandyVendido | null {
  let mejor: ProductoCandyVendido | null = null;

  for (const fila of filas) {
    if (mejor === null || numero(fila.cantidad) > numero(mejor.cantidad)) mejor = fila;
  }

  return mejor;
}

export type CeldaExcel = string | number | null;

export interface HojaExcel {
  nombre: string;
  filas: CeldaExcel[][];
  /** Ancho de cada columna, en caracteres. */
  anchos: number[];
}

function filaExcelFacturacion(fila: FilaFacturacion): CeldaExcel[] {
  return [
    fila.dia,
    numero(fila.compras),
    numero(fila.entradas),
    numero(fila.entradas_usadas),
    numero(fila.dinero_butacas),
    numero(fila.dinero_candy),
    numero(fila.total_cobrado),
    numero(fila.creditos_usados),
    numero(fila.puntos_usados),
    numero(fila.canceladas),
    numero(fila.monto_cancelado),
  ];
}

function filaExcelCompra(compra: CompraReporte): CeldaExcel[] {
  return [
    compra.compra_id,
    fechaHoraLocal(compra.creada),
    compra.fecha ?? '',
    compra.hora ? String(compra.hora).slice(0, 5) : '',
    compra.pelicula ?? '',
    compra.sala ?? '',
    numero(compra.butacas),
    compra.metodo_pago,
    numero(compra.precio_butacas),
    numero(compra.precio_candy),
    numero(compra.puntos_usados),
    numero(compra.creditos_usados),
    numero(compra.total),
    compra.estado,
    compra.combo ?? '',
  ];
}

/**
 * Arma las hojas del Excel con números (no texto formateado) para que
 * se puedan sumar y ordenar dentro de la planilla.
 */
export function hojasExcel(datos: DatosReporte): HojaExcel[] {
  const totales = datos.totales;

  const facturacion: CeldaExcel[][] = [
    [
      'Día',
      'Compras',
      'Entradas',
      'Entradas usadas',
      'Butacas $',
      'Candy $',
      'Total cobrado',
      'Créditos usados',
      'Puntos usados',
      'Canceladas',
      'Cancelado $',
    ],
    ...datos.facturacion.map(filaExcelFacturacion),
    [
      'TOTAL',
      numero(totales.compras),
      numero(totales.entradas),
      numero(totales.entradas_usadas),
      numero(totales.dinero_butacas),
      numero(totales.dinero_candy),
      numero(totales.total_cobrado),
      numero(totales.creditos_usados),
      numero(totales.puntos_usados),
      numero(totales.canceladas),
      numero(totales.monto_cancelado),
    ],
  ];

  const peliculas: CeldaExcel[][] = [
    ['Período', 'Película', 'Entradas', 'Ingresos'],
    ...datos.peliculas.map((fila) => [
      etiquetaPeriodo(fila.periodo, datos.agrupacion),
      fila.pelicula,
      numero(fila.entradas),
      numero(fila.ingresos),
    ]),
  ];

  const candy: CeldaExcel[][] = [
    ['Producto', 'Unidades', 'Ingresos', 'En combos', 'Comprados'],
    ...datos.candy.map((fila) => [
      fila.producto,
      numero(fila.cantidad),
      numero(fila.ingresos),
      numero(fila.combos),
      numero(fila.extras),
    ]),
  ];

  const detalle: CeldaExcel[][] = [
    [
      'Compra',
      'Cobrada',
      'Función',
      'Hora',
      'Película',
      'Sala',
      'Butacas',
      'Método de pago',
      'Butacas $',
      'Candy $',
      'Puntos',
      'Créditos $',
      'Total',
      'Estado',
      'Combo',
    ],
    ...datos.compras.map(filaExcelCompra),
  ];

  return [
    {
      nombre: 'Facturación',
      filas: facturacion,
      anchos: [12, 10, 10, 15, 14, 12, 15, 16, 14, 11, 13],
    },
    { nombre: 'Películas', filas: peliculas, anchos: [20, 34, 10, 12] },
    { nombre: 'Candy', filas: candy, anchos: [34, 10, 12, 11, 12] },
    {
      nombre: 'Detalle',
      filas: detalle,
      anchos: [38, 18, 12, 7, 30, 10, 9, 16, 12, 10, 8, 11, 11, 11, 22],
    },
  ];
}

export function nombreArchivoReporte(rango: RangoFechas, extension: 'pdf' | 'xlsx'): string {
  return `reporte-${rango.desde}_a_${rango.hasta}.${extension}`;
}
