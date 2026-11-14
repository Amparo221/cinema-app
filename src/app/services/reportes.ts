import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';
import {
  Agrupacion,
  CompraReporte,
  FilaFacturacion,
  PeliculaMasVista,
  ProductoCandyVendido,
  RangoFechas,
} from '../models/reporte.model';

export interface ResultadoReporte<T> {
  filas: T[];
  /** Mensaje crudo de Postgres; la página lo traduce con `mensajeErrorReporte`. */
  error: string | null;
}

/**
 * Consultas de /admin/reporte.
 *
 * Todas pasan por RPC security definer: no hacen falta policies nuevas
 * sobre `compras` y el rol se valida en la base (`NO_AUTORIZADO`).
 * Los importes son los que pagó el cliente; las compras canceladas no
 * suman facturación y se informan en columnas aparte.
 */
@Service()
export class ReportesService {
  private supabase = inject(SupabaseService);

  /** Totales por día de cobro (hora de Buenos Aires). */
  facturacion(rango: RangoFechas): Promise<ResultadoReporte<FilaFacturacion>> {
    return this.consultar<FilaFacturacion>('reporte_facturacion', {
      p_desde: rango.desde,
      p_hasta: rango.hasta,
    });
  }

  /** Entradas vendidas por película, agrupadas por semana o por mes. */
  peliculas(
    rango: RangoFechas,
    agrupacion: Agrupacion,
  ): Promise<ResultadoReporte<PeliculaMasVista>> {
    return this.consultar<PeliculaMasVista>('reporte_peliculas', {
      p_desde: rango.desde,
      p_hasta: rango.hasta,
      p_agrupacion: agrupacion,
    });
  }

  /** Unidades e ingresos por producto de candy (incluye los de combo). */
  candy(rango: RangoFechas): Promise<ResultadoReporte<ProductoCandyVendido>> {
    return this.consultar<ProductoCandyVendido>('reporte_candy', {
      p_desde: rango.desde,
      p_hasta: rango.hasta,
    });
  }

  /** Detalle de compras del rango, para la hoja "Detalle" del Excel. */
  compras(rango: RangoFechas): Promise<ResultadoReporte<CompraReporte>> {
    return this.consultar<CompraReporte>('reporte_compras', {
      p_desde: rango.desde,
      p_hasta: rango.hasta,
      p_limite: 20000,
    });
  }

  private async consultar<T>(
    funcion: string,
    argumentos: Record<string, unknown>,
  ): Promise<ResultadoReporte<T>> {
    const { data, error } = await this.supabase.rpc(funcion, argumentos);
    if (error) return { filas: [], error: error.message };
    return { filas: (data ?? []) as T[], error: null };
  }
}
