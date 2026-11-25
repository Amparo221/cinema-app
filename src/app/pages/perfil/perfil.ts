import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import {
  CompraCancelable,
  creditosDeCancelacion,
  mensajeErrorCancelacion,
  motivoNoCancelable,
  textoNoCancelable,
} from '../../models/compra.model';
import {
  POR_PAGINA,
  desplazamientoPagina,
  hayPaginaSiguiente,
  paginaValida,
  resumenPagina,
  totalPaginas,
} from '../../shared/paginacion';

interface Canje {
  id: number;
  recompensa_id: number | null;
  combo_id: number | null;
  compra_id: string | null;
  puntos_usados: number;
  created_at: string;
  combos?: { nombre: string } | null;
}

interface CompraHistorial extends CompraCancelable {
  id: string;
  total: number;
  created_at: string;
  combo_nombre: string | null;
  combo_plus: boolean;
  puntos_usados: number;
  funciones?: {
    fecha?: string | null;
    hora?: string | null;
    peliculas: { nombre: string };
  };
}

@Component({
  selector: 'app-perfil',
  imports: [RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);

  usuario = this.session.usuario;

  canjes = signal<Canje[]>([]);
  compras = signal<CompraHistorial[]>([]);
  cargando = signal(true);
  cargandoCanjes = signal(false);
  error = signal<string | null>(null);

  /** Compra que se está cancelando; deshabilita solo esa fila. */
  cancelandoCompra = signal<string | null>(null);
  errorCancelacion = signal<string | null>(null);

  /** Paginación del historial de canjes: se piden 5 por página al servidor. */
  totalCanjes = signal(0);
  paginaCanjes = signal(1);
  readonly paginasCanjes = computed(() => totalPaginas(this.totalCanjes()));
  readonly puedeIrAnterior = computed(() => this.paginaCanjes() > 1);
  readonly puedeIrSiguiente = computed(() =>
    hayPaginaSiguiente(this.paginaCanjes(), this.totalCanjes()),
  );
  readonly resumenCanjes = computed(() => resumenPagina(this.paginaCanjes(), this.totalCanjes()));

  puntos = computed(() => this.usuario()?.puntos ?? 0);
  creditos = computed(() => this.usuario()?.creditos ?? 0);

  async ngOnInit() {
    const u = this.usuario();
    if (!u) return;
    await this.cargarDatos(u.id);
  }

  async cargarDatos(usuarioId: string) {
    this.cargando.set(true);

    const [canjesRes, comprasRes] = await Promise.all([
      this.supabase.getCanjesDeUsuario(
        usuarioId,
        POR_PAGINA,
        desplazamientoPagina(this.paginaCanjes()),
      ),
      this.supabase.getComprasDeUsuario(usuarioId),
    ]);

    if (canjesRes.error) {
      this.error.set('No se pudo cargar el historial de canjes.');
    } else {
      this.canjes.set((canjesRes.data ?? []) as Canje[]);
      this.totalCanjes.set(canjesRes.count ?? this.canjes().length);
    }

    if (comprasRes.data) this.compras.set(comprasRes.data as unknown as CompraHistorial[]);

    this.cargando.set(false);
  }

  /** Cambia la página del historial de canjes pidiendo solo esas filas. */
  async irAPaginaCanjes(pagina: number) {
    const usuarioId = this.usuario()?.id;
    if (!usuarioId || this.cargandoCanjes()) return;

    const destino = paginaValida(pagina, this.totalCanjes());
    if (destino === this.paginaCanjes()) return;

    const anterior = this.paginaCanjes();
    this.paginaCanjes.set(destino);
    this.cargandoCanjes.set(true);
    this.error.set(null);

    const { data, error, count } = await this.supabase.getCanjesDeUsuario(
      usuarioId,
      POR_PAGINA,
      desplazamientoPagina(destino),
    );

    this.cargandoCanjes.set(false);

    if (error) {
      this.paginaCanjes.set(anterior);
      this.error.set('No se pudo cambiar de página. Intentá nuevamente.');
      return;
    }

    this.canjes.set((data ?? []) as Canje[]);
    this.totalCanjes.set(count ?? this.canjes().length);
  }

  /**
   * Aviso de por qué una compra no se puede cancelar. `null` = se puede y la
   * plantilla muestra el botón. La regla vive en `compra.model`, no acá.
   */
  avisoNoCancelable(compra: CompraHistorial): string | null {
    const motivo = motivoNoCancelable(compra, this.usuario()?.id ?? null);
    return motivo ? textoNoCancelable(motivo) : null;
  }

  /** Créditos que devolvería cancelar esta compra (butacas con descuentos). */
  creditosDevolucion(compra: CompraHistorial): number {
    return creditosDeCancelacion(compra);
  }

  /**
   * Cancela una compra del historial con la misma RPC del recibo
   * (`cancelar_compra_liberando`): devuelve créditos, libera butacas y avisa
   * a la lista de espera.
   */
  async cancelarCompra(compra: CompraHistorial) {
    if (this.cancelandoCompra()) return;
    if (motivoNoCancelable(compra, this.usuario()?.id ?? null)) return;

    const credito = creditosDeCancelacion(compra);
    const pelicula = compra.funciones?.peliculas?.nombre ?? 'esta función';
    const confirmado = confirm(
      `¿Cancelar la compra de «${pelicula}»? Se te devolverán $${credito} en créditos. No se devuelve dinero.`,
    );
    if (!confirmado) return;

    this.cancelandoCompra.set(compra.id);
    this.errorCancelacion.set(null);

    const { error } = await this.supabase.cancelarCompra(compra.id);

    this.cancelandoCompra.set(null);

    if (error) {
      this.errorCancelacion.set(mensajeErrorCancelacion(error.message));
      return;
    }

    // La cancelación mueve créditos y puntos: `cargarSesion()` no alcanza
    // porque no vuelve a leer si la sesión ya estaba inicializada.
    await this.session.recargarSesion();

    const usuarioId = this.usuario()?.id;
    if (usuarioId) {
      await this.cargarDatos(usuarioId);
    } else {
      this.compras.update((compras) =>
        compras.map((c) => (c.id === compra.id ? { ...c, estado: 'cancelada' } : c)),
      );
    }
  }

  formatearFecha(fecha: string): string {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}
