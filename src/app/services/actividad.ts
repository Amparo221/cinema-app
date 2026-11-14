import { inject, Service } from '@angular/core';
import { SupabaseService } from './supabase';
import { FiltrosActividad, PaginaActividad, RegistroActividad } from '../models/actividad.model';

export interface ResultadoActividad {
  pagina: PaginaActividad;
  error: string | null;
}

/**
 * Lectura de la bitácora de /admin/log.
 *
 * La tabla `actividad` la llenan triggers en la base, con el usuario de
 * `auth.uid()` y la fecha del cambio. Acá solo se pagina y se filtra:
 * el total lo devuelve la RPC en cada fila (`count(*) over ()`).
 */
@Service()
export class ActividadService {
  private supabase = inject(SupabaseService);

  async listar(
    filtros: FiltrosActividad,
    pagina: number,
    porPagina: number,
  ): Promise<ResultadoActividad> {
    const { data, error } = await this.supabase.rpc('reporte_actividad', {
      p_desde: filtros.desde || null,
      p_hasta: filtros.hasta || null,
      p_accion: filtros.accion || null,
      p_usuario: filtros.usuario.trim() || null,
      p_limite: porPagina,
      p_offset: Math.max(0, pagina - 1) * porPagina,
    });

    if (error) {
      return { pagina: { registros: [], total: 0 }, error: error.message };
    }

    const registros = (data ?? []) as RegistroActividad[];
    const total = registros.length > 0 ? Number(registros[0].total) : 0;

    return { pagina: { registros, total }, error: null };
  }
}
