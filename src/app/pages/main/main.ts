import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { Pelicula } from '../../models/pelicula.model';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {
  private supabase = inject(SupabaseService);

  peliculas = signal<Pelicula[]>([]);
  generoFiltro = signal<string>('');
  cargando = signal(true);

  generosDisponibles = computed(() => {
    const todos = this.peliculas().flatMap(p => p.generos);
    return [...new Set(todos)].sort();
  });

  peliculasFiltradas = computed(() => {
    const filtro = this.generoFiltro();
    if (!filtro) return this.peliculas();
    return this.peliculas().filter(p => p.generos.includes(filtro));
  });

  async ngOnInit() {
    await this.cargarPeliculas();
  }

  async cargarPeliculas() {
    this.cargando.set(true);
    const { data, error } = await this.supabase.from('peliculas').select('*');
    this.cargando.set(false);
    if (error) {
      console.error('Error al cargar películas:', error);
      return;
    }
    this.peliculas.set(data as Pelicula[]);
  }

  getImagenUrl(nombreArchivo: string | null): string {
    if (!nombreArchivo) return '';
    const { data } = this.supabase.storage.from('peliculas').getPublicUrl(nombreArchivo);
    return data.publicUrl;
  }
}