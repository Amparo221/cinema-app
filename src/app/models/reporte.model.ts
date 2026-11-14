/**
 * Tipos del panel de reportes (/admin/reporte).
 * Los nombres de las columnas son los que devuelven las RPC
 * `reporte_facturacion`, `reporte_peliculas`, `reporte_candy`
 * y `reporte_compras` (ver supabase/migrations/20261114120000_reportes_admin.sql).
 */

export interface RangoFechas {
  /** Fecha local en formato YYYY-MM-DD. */
  desde: string;
  /** Fecha local en formato YYYY-MM-DD. */
  hasta: string;
}

export type Agrupacion = 'semana' | 'mes';

/** Una fila por día: el día en que se cobró la compra. */
export interface FilaFacturacion {
  dia: string;
  compras: number;
  entradas: number;
  entradas_usadas: number;
  dinero_butacas: number;
  dinero_candy: number;
  total_cobrado: number;
  puntos_usados: number;
  creditos_usados: number;
  canceladas: number;
  monto_cancelado: number;
}

/** Suma de todas las filas del rango, sin el día. */
export interface TotalesFacturacion extends Omit<FilaFacturacion, 'dia'> {}

export interface PeliculaMasVista {
  /** 'YYYY-MM' si la agrupación es mensual, 'YYYY-MM-DD' (lunes) si es semanal. */
  periodo: string;
  periodo_inicio: string;
  pelicula_id: number;
  pelicula: string;
  entradas: number;
  ingresos: number;
}

export interface ProductoCandyVendido {
  producto_id: number | null;
  producto: string;
  cantidad: number;
  ingresos: number;
  /** Unidades que entraron como parte de un combo. */
  combos: number;
  /** Unidades compradas y pagadas con dinero. */
  extras: number;
}

/** Fila del detalle de compras (hoja "Detalle" del Excel). */
export interface CompraReporte {
  compra_id: string;
  creada: string;
  fecha: string | null;
  hora: string | null;
  pelicula: string | null;
  sala: string | null;
  butacas: number;
  metodo_pago: string;
  precio_butacas: number;
  precio_candy: number;
  puntos_usados: number;
  creditos_usados: number;
  total: number;
  estado: string;
  combo: string | null;
}

/** Punto de un gráfico de barras. */
export interface PuntoGrafico {
  etiqueta: string;
  valor: number;
  detalle?: string;
}

/** Todo lo que necesita el exportador de PDF y de Excel. */
export interface DatosReporte {
  rango: RangoFechas;
  agrupacion: Agrupacion;
  totales: TotalesFacturacion;
  facturacion: FilaFacturacion[];
  peliculas: PeliculaMasVista[];
  candy: ProductoCandyVendido[];
  compras: CompraReporte[];
  /** Texto ya formateado para el encabezado del archivo. */
  generadoEl: string;
}
