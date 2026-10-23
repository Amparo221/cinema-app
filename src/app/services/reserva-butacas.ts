import { inject, PLATFORM_ID, Service, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';
import { FilaEstadoButaca, OcupacionButacas, mapearOcupacion } from '../models/butaca.model';

const CLAVE_SESION = 'cine_butacas_sesion';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MINUTOS_RESERVA = 10;

export interface ResultadoBloqueo {
  ok: boolean;
  conflictos: string[];
  expiraAt: string | null;
}

/**
 * Maneja el identificador anonimo de esta pestana y las llamadas de butacas.
 * El servicio no decide cuando reservar: eso lo hace la pagina Compra.
 */
@Service()
export class ReservaButacasService {
  private supabase = inject(SupabaseService);
  private platformId = inject(PLATFORM_ID);
  private canal: RealtimeChannel | null = null;

  /** UUID que identifica esta pestana. No es el usuario: sirve para saber que bloqueos son propios. */
  readonly sesionId = this.obtenerOCrearSesion();

  /** Ultima expiracion confirmada por Postgres. */
  readonly expiraAt = signal<string | null>(null);

  private obtenerOCrearSesion(): string {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const guardada = sessionStorage.getItem(CLAVE_SESION);
        if (guardada && UUID_REGEX.test(guardada)) return guardada;

        const nueva = this.generarId();
        sessionStorage.setItem(CLAVE_SESION, nueva);
        return nueva;
      } catch {
        // Si el navegador bloquea sessionStorage, seguimos con un id temporal.
      }
    }
    return this.generarId();
  }

  private generarId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, caracter => {
      const aleatorio = (Math.random() * 16) | 0;
      const valor = caracter === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8;
      return valor.toString(16);
    });
  }

  /** Lee vendidas, reservadas por otros y reservadas propias. */
  async estado(funcionId: number): Promise<OcupacionButacas> {
    const { data, error } = await this.supabase.getEstadoButacas(funcionId, this.sesionId);
    if (error) throw error;

    return mapearOcupacion((data ?? []) as FilaEstadoButaca[]);
  }

  /**
   * Reemplaza la seleccion de bloqueos de esta sesion.
   * Si otra persona gano la carrera, devuelve las butacas en conflicto.
   */
  async bloquear(funcionId: number, codigos: string[]): Promise<ResultadoBloqueo> {
    const { data, error } = await this.supabase.bloquearButacas(
      funcionId,
      codigos,
      this.sesionId,
      MINUTOS_RESERVA
    );
    if (error) throw error;

    const fila = (Array.isArray(data) ? data[0] : data) as
      | { ok: boolean; conflictos: string[] | null; expira_at: string | null }
      | null;

    const resultado: ResultadoBloqueo = {
      ok: fila?.ok === true,
      conflictos: fila?.conflictos ?? [],
      expiraAt: fila?.expira_at ?? null,
    };

    this.expiraAt.set(resultado.ok ? resultado.expiraAt : null);
    return resultado;
  }

  /** Libera todas las butacas bloqueadas por esta pestana. */
  async liberar(funcionId: number): Promise<void> {
    const { error } = await this.supabase.liberarBloqueos(funcionId, this.sesionId);
    if (error) throw error;
    this.expiraAt.set(null);
  }

  /**
   * Escucha cambios de la tabla para esta funcion.
   * Realtime es solo aviso visual: la verdad siempre se consulta a Postgres.
   */
  suscribir(funcionId: number, alCambiar: () => void): () => void {
    this.desuscribir();

    this.canal = this.supabase
      .crearCanal(`butacas-${funcionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'compra_butacas',
          filter: `funcion_id=eq.${funcionId}`,
        },
        () => alCambiar()
      )
      .subscribe();

    return () => this.desuscribir();
  }

  desuscribir(): void {
    if (!this.canal) return;
    void this.supabase.quitarCanal(this.canal);
    this.canal = null;
  }
}
