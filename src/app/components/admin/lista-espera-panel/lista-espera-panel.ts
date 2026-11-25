import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../services/supabase';
import {
  FilaReporteEspera,
  mensajeErrorListaEspera,
} from '../../../models/lista-espera.model';

/**
 * Resumen de la lista de espera para el back-office (`/admin/general`).
 * La RPC `reporte_lista_espera` exige la sección `general`.
 */
@Component({
  selector: 'app-lista-espera-panel',
  templateUrl: './lista-espera-panel.html',
  styleUrl: './lista-espera-panel.css',
})
export class ListaEsperaPanel implements OnInit {
  private supabase = inject(SupabaseService);

  filas = signal<FilaReporteEspera[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);

  /** Función cuyo aviso se está disparando a mano. */
  procesando = signal<number | null>(null);

  readonly totalEnEspera = computed(() =>
    this.filas().reduce((total, fila) => total + Number(fila.en_espera ?? 0), 0),
  );

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.getReporteListaEspera();

      if (error) {
        this.filas.set([]);
        this.error.set(mensajeErrorListaEspera(error.message));
        return;
      }

      this.filas.set((data ?? []) as FilaReporteEspera[]);
    } catch {
      this.filas.set([]);
      this.error.set(mensajeErrorListaEspera());
    } finally {
      this.cargando.set(false);
    }
  }

  /** Fuerza el aviso a la fila de una función (sin esperar a la campanita). */
  async procesar(fila: FilaReporteEspera) {
    if (this.procesando() !== null) return;

    this.procesando.set(fila.funcion_id);
    this.error.set(null);
    this.aviso.set(null);

    try {
      const { data, error } = await this.supabase.procesarListaEspera(fila.funcion_id);

      if (error) {
        this.error.set(mensajeErrorListaEspera(error.message));
        return;
      }

      const avisados = Number(data ?? 0);
      this.aviso.set(
        avisados > 0
          ? `Se avisó a ${avisados} ${avisados === 1 ? 'persona' : 'personas'} de «${fila.pelicula_nombre}».`
          : 'No hay butacas libres para avisar en este momento.',
      );
      await this.cargar();
    } catch {
      this.error.set(mensajeErrorListaEspera());
    } finally {
      this.procesando.set(null);
    }
  }

  /** `20:30:00` → `20:30`. */
  horaCorta(hora: string | null): string {
    return (hora ?? '').slice(0, 5);
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return '—';
    const valor = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(valor.getTime())) return '—';
    return valor.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  }
}
