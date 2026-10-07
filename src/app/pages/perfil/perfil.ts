import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';

interface Canje {
  id: number;
  recompensa_id: number | null;
  puntos_usados: number;
  created_at: string;
}

interface CompraHistorial {
  id: string;
  total: number;
  estado: string;
  created_at: string;
  funciones?: {
    fecha: string;
    hora: string;
    peliculas: { nombre: string };
  };
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
      this.supabase.getCanjesDeUsuario(usuarioId),
      this.supabase.getComprasDeUsuario(usuarioId),
    ]);
    if (canjesRes.data) this.canjes.set(canjesRes.data as Canje[]);
    if (comprasRes.data) this.compras.set(comprasRes.data as unknown as CompraHistorial[]);
    this.cargando.set(false);
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