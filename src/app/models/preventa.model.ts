import { tipoButacaPorFila } from './butaca.model';
import { Pelicula } from './pelicula.model';

/** Días que dura la venta anticipada antes del estreno. */
export const DIAS_PREVENTA = 7;

export const PRECIO_BUTACA_NORMAL_DEFAULT = 10000;
export const PRECIO_BUTACA_VIP_DEFAULT = 15000;
export const PRECIO_BUTACA_ACCESIBLE_DEFAULT = 10000;

/** Precios de referencia que llegan de la tabla `configuracion`. */
export type ConfiguracionPrecios = Record<string, number>;

/** Fecha de hoy en formato yyyy-mm-dd, en hora local del navegador. */
export function fechaHoy(ahora: Date = new Date()): string {
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Fecha (yyyy-mm-dd) en la que arranca la preventa, 7 días antes del estreno. */
export function fechaInicioPreventa(fechaEstreno: string | null | undefined): string | null {
  if (!fechaEstreno) return null;

  const [anio, mes, dia] = fechaEstreno.split('-').map(Number);
  if (!anio || !mes || !dia) return null;

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (Number.isNaN(fecha.getTime())) return null;

  fecha.setUTCDate(fecha.getUTCDate() - DIAS_PREVENTA);
  return fecha.toISOString().slice(0, 10);
}

/**
 * true si hoy cae dentro de la ventana de preventa: [estreno - 7 días, estreno).
 * El día del estreno la preventa ya terminó y vuelven los precios normales.
 */
export function estaEnPreventa(pelicula: Pelicula, hoy: string = fechaHoy()): boolean {
  const estreno = pelicula.fecha_estreno ?? null;
  const inicio = fechaInicioPreventa(estreno);
  if (!estreno || !inicio) return false;
  return hoy >= inicio && hoy < estreno;
}

/**
 * true si la película todavía no se estrenó.
 * Si tiene fecha de estreno manda la fecha; si no, el flag `proximamente`.
 */
export function esProximamente(pelicula: Pelicula, hoy: string = fechaHoy()): boolean {
  const estreno = pelicula.fecha_estreno ?? null;
  if (estreno) return estreno > hoy;
  return pelicula.proximamente === true;
}

/** Acepta la letra de la fila ('J') o el código completo de la butaca ('J11'). */
function letraDeFila(valor: string): string {
  return (valor ?? '').trim().charAt(0);
}

/** Precio de una butaca sin preventa, según su fila. */
export function precioButacaBase(
  fila: string,
  config: ConfiguracionPrecios = {}
): number {
  const tipo = tipoButacaPorFila(letraDeFila(fila));

  if (tipo === 'vip') {
    return config['precio_butaca_vip'] ?? PRECIO_BUTACA_VIP_DEFAULT;
  }

  if (tipo === 'accesible') {
    return config['precio_butaca_accesible'] ?? PRECIO_BUTACA_ACCESIBLE_DEFAULT;
  }

  return config['precio_butaca_normal'] ?? PRECIO_BUTACA_NORMAL_DEFAULT;
}

/**
 * Precio de una butaca durante la preventa.
 * La butaca normal vale `precio_preventa` y las VIP/accesibles mantienen
 * la diferencia que tienen contra la normal en cartelera.
 * Sin `precio_preventa` válido se usa el precio de cartelera.
 */
export function precioButacaConPreventa(
  fila: string,
  config: ConfiguracionPrecios = {},
  precioPreventa: number | null | undefined
): number {
  const base = precioButacaBase(fila, config);
  if (!precioPreventa || precioPreventa <= 0) return base;

  const normal = config['precio_butaca_normal'] ?? PRECIO_BUTACA_NORMAL_DEFAULT;
  const diferencia = Math.max(0, base - normal);

  return precioPreventa + diferencia;
}
