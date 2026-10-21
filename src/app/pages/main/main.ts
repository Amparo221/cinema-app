import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { Pelicula } from '../../models/pelicula.model';

interface PeliculaVendida {
  pelicula: Pelicula;
  asientos: number;
}

@Component({
  selector: 'app-main',
  imports: [NgTemplateOutlet, FormsModule, RouterLink],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main implements OnInit {
  private supabase = inject(SupabaseService);

  peliculas = signal<Pelicula[]>([]);
  asientosVendidos = signal<Map<number, number>>(new Map());
  generoFiltro = signal<string>('');
  cargando = signal(true);
  error = signal<string | null>(null);

  peliculasEnCartelera = computed(() =>
    this.peliculas().filter(pelicula => !pelicula.proximamente)
  );

  generosDisponibles = computed(() => {
    const todos = this.peliculasEnCartelera().flatMap(pelicula => pelicula.generos);
    return [...new Set(todos)].sort((a, b) => a.localeCompare(b));
  });

  peliculasFiltradas = computed(() => {
    const filtro = this.generoFiltro();
    if (!filtro) return this.peliculasEnCartelera();
    return this.peliculasEnCartelera().filter(pelicula =>
      pelicula.generos.includes(filtro)
    );
  });

  proximas = computed(() =>
    this.peliculas().filter(pelicula => pelicula.proximamente)
  );

  masVendidas = computed<PeliculaVendida[]>(() => {
    const ventas = this.asientosVendidos();
    return this.peliculasEnCartelera()
      .map(pelicula => ({
        pelicula,
        asientos: ventas.get(pelicula.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.asientos - a.asientos ||
          b.pelicula.puntuacion_promedio - a.pelicula.puntuacion_promedio ||
          a.pelicula.nombre.localeCompare(b.pelicula.nombre)
      )
      .slice(0, 3);
  });

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

    try {
      const [peliculasRes, asientos] = await Promise.all([
        this.supabase.getTodasLasPeliculas(),
        this.supabase.getAsientosVendidosPorPelicula(),
      ]);

      if (peliculasRes.error) {
        this.error.set(`No se pudieron cargar las películas: ${peliculasRes.error.message}`);
        this.peliculas.set([]);
      } else {
        this.peliculas.set((peliculasRes.data ?? []) as Pelicula[]);
      }

      this.asientosVendidos.set(asientos);
    } catch {
      this.error.set('No se pudieron cargar las películas.');
      this.peliculas.set([]);
      this.asientosVendidos.set(new Map());
    } finally {
      this.cargando.set(false);
    }
  }

  getImagenUrl(nombreArchivo: string | null): string {
    return this.supabase.getPeliculaImageUrl(nombreArchivo);
  }
}