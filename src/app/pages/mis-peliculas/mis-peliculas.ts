import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import { Resena } from '../../models/resena.model';
import {
  POR_PAGINA,
  desplazamientoPagina,
  hayPaginaSiguiente,
  paginaValida,
  resumenPagina,
  totalPaginas,
} from '../../shared/paginacion';

interface PeliculaComprada {
  id: number;
  nombre: string;
  imagen: string | null;
  fecha: string;
}

interface CompraConPelicula {
  id: string;
  created_at: string;
  estado: string;
  funciones?: {
    peliculas?: { id: number; nombre: string; imagen: string | null };
  };
}

@Component({
  selector: 'app-mis-peliculas',
  imports: [RouterLink],
  templateUrl: './mis-peliculas.html',
  styleUrl: './mis-peliculas.css',
})
export class MisPeliculas implements OnInit {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);

  usuario = this.session.usuario;

  resenas = signal<Resena[]>([]);
  compras = signal<CompraConPelicula[]>([]);
  cargando = signal(true);
  cargandoResenas = signal(false);
  errorResenas = signal<string | null>(null);

  /** Paginación de “Mis reseñas”: se piden 5 por página al servidor. */
  totalResenas = signal(0);
  paginaResenas = signal(1);
  readonly paginasResenas = computed(() => totalPaginas(this.totalResenas()));
  readonly puedeIrAnterior = computed(() => this.paginaResenas() > 1);
  readonly puedeIrSiguiente = computed(() =>
    hayPaginaSiguiente(this.paginaResenas(), this.totalResenas()),
  );
  readonly resumenResenas = computed(() =>
    resumenPagina(this.paginaResenas(), this.totalResenas()),
  );

  peliculasCompradas = computed<PeliculaComprada[]>(() => {
    const vistas = new Map<number, PeliculaComprada>();
    for (const c of this.compras()) {
      const pel = c.funciones?.peliculas;
      if (!pel || vistas.has(pel.id)) continue;
      vistas.set(pel.id, {
        id: pel.id,
        nombre: pel.nombre,
        imagen: pel.imagen,
        fecha: c.created_at,
      });
    }
    return Array.from(vistas.values());
  });

  async ngOnInit() {
    const u = this.usuario();
    if (!u) {
      this.cargando.set(false);
      return;
    }
    await this.cargarDatos(u.id);
  }

  async cargarDatos(usuarioId: string) {
    this.cargando.set(true);

    const [resenasRes, comprasRes] = await Promise.all([
      this.supabase.getResenasDeUsuario(
        usuarioId,
        POR_PAGINA,
        desplazamientoPagina(this.paginaResenas()),
      ),
      this.supabase.getPeliculasCompradasDeUsuario(usuarioId),
    ]);

    if (resenasRes.error) {
      this.errorResenas.set('No se pudieron cargar tus reseñas.');
    } else {
      this.resenas.set((resenasRes.data ?? []) as unknown as Resena[]);
      this.totalResenas.set(resenasRes.count ?? this.resenas().length);
    }

    if (comprasRes.data) this.compras.set(comprasRes.data as unknown as CompraConPelicula[]);

    this.cargando.set(false);
  }

  /** Cambia la página de “Mis reseñas” pidiendo solo esas filas. */
  async irAPaginaResenas(pagina: number) {
    const usuarioId = this.usuario()?.id;
    if (!usuarioId || this.cargandoResenas()) return;

    const destino = paginaValida(pagina, this.totalResenas());
    if (destino === this.paginaResenas()) return;

    const anterior = this.paginaResenas();
    this.paginaResenas.set(destino);
    this.cargandoResenas.set(true);
    this.errorResenas.set(null);

    const { data, error, count } = await this.supabase.getResenasDeUsuario(
      usuarioId,
      POR_PAGINA,
      desplazamientoPagina(destino),
    );

    this.cargandoResenas.set(false);

    if (error) {
      this.paginaResenas.set(anterior);
      this.errorResenas.set('No se pudo cambiar de página. Intentá nuevamente.');
      return;
    }

    this.resenas.set((data ?? []) as unknown as Resena[]);
    this.totalResenas.set(count ?? this.resenas().length);
  }

  getImagenUrl(nombreArchivo: string | null): string {
    if (!nombreArchivo) return '';
    return this.supabase.storage.from('peliculas').getPublicUrl(nombreArchivo).data.publicUrl;
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
