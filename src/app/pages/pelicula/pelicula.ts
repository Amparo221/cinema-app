import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import { Pelicula } from '../../models/pelicula.model';
import { Funcion } from '../../models/funcion.model';
import { Resena } from '../../models/resena.model';

@Component({
  selector: 'app-pelicula',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pelicula.html',
  styleUrl: './pelicula.css',
})
export class PeliculaPage implements OnInit {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  pelicula = signal<Pelicula | null>(null);
  funciones = signal<Funcion[]>([]);
  resenas = signal<Resena[]>([]);
  cargando = signal(true);

  modalResenaAbierto = signal(false);
  nuevaEstrellas = signal(5);
  nuevoComentario = signal('');
  errorResena = signal<string | null>(null);
  enviandoResena = signal(false);

  usuario = this.session.usuario;

  yaTieneResena = computed(() => {
    const u = this.usuario();
    if (!u) return false;
    return this.resenas().some(r => r.usuario_id === u.id);
  });

  funcionesAgrupadas = computed(() => {
    const grupos = new Map<string, Funcion[]>();
    for (const f of this.funciones()) {
      if (!grupos.has(f.fecha)) grupos.set(f.fecha, []);
      grupos.get(f.fecha)!.push(f);
    }
    return Array.from(grupos.entries()).map(([fecha, funciones]) => ({ fecha, funciones }));
  });

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/main']);
      return;
    }
    await this.cargarTodo(id);
  }

  async cargarTodo(id: number) {
    this.cargando.set(true);
    const [pel, func, res] = await Promise.all([
      this.supabase.getPelicula(id),
      this.supabase.getFuncionesDePelicula(id),
      this.supabase.getResenasDePelicula(id),
    ]);
    if (pel.data) this.pelicula.set(pel.data as Pelicula);
    if (func.data) this.funciones.set(func.data as unknown as Funcion[]);
    if (res.data) this.resenas.set(res.data as unknown as Resena[]);
    this.cargando.set(false);
  }

  getImagenUrl(nombreArchivo: string | null): string {
    if (!nombreArchivo) return '';
    return this.supabase.storage.from('peliculas').getPublicUrl(nombreArchivo).data.publicUrl;
  }

  seleccionarFuncion(funcionId: number) {
    this.router.navigate(['/compra', funcionId]);
  }

  abrirModalResena() {
    this.errorResena.set(null);
    this.nuevaEstrellas.set(5);
    this.nuevoComentario.set('');
    this.modalResenaAbierto.set(true);
  }

  cerrarModalResena() {
    this.modalResenaAbierto.set(false);
  }

  setEstrellas(n: number) {
    this.nuevaEstrellas.set(n);
  }

  async enviarResena() {
    const u = this.usuario();
    if (!u || !this.pelicula()) return;
    this.enviandoResena.set(true);
    this.errorResena.set(null);

    const { error } = await this.supabase.crearResena(
      u.id,
      this.pelicula()!.id,
      this.nuevaEstrellas(),
      this.nuevoComentario()
    );

    this.enviandoResena.set(false);

    if (error) {
      this.errorResena.set(error.message);
      return;
    }

    await this.cargarTodo(this.pelicula()!.id);
    this.cerrarModalResena();
  }

  formatearFecha(fecha: string): string {
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}