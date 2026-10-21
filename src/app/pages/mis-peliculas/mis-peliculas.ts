import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import { Resena } from '../../models/resena.model';

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
      this.supabase.getResenasDeUsuario(usuarioId),
      this.supabase.getPeliculasCompradasDeUsuario(usuarioId),
    ]);
    if (resenasRes.data) this.resenas.set(resenasRes.data as unknown as Resena[]);
    if (comprasRes.data) this.compras.set(comprasRes.data as unknown as CompraConPelicula[]);
    this.cargando.set(false);
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
