import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import { Pelicula } from '../../models/pelicula.model';
import {
  Combo,
  motivoNoCanjeCombo,
  nombreCombo,
  puntosCombo,
} from '../../models/combo.model';

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
  private session = inject(SessionService);
  private router = inject(Router);

  peliculas = signal<Pelicula[]>([]);
  asientosVendidos = signal<Map<number, number>>(new Map());
  combos = signal<Combo[]>([]);
  peliculaPorCombo = signal<Record<number, number>>({});
  generoFiltro = signal<string>('');
  cargando = signal(true);
  error = signal<string | null>(null);
  avisoCombo = signal<string | null>(null);

  usuario = this.session.usuario;

  readonly nombreCombo = nombreCombo;
  readonly puntosCombo = puntosCombo;

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
      const [peliculasRes, asientos, combosRes] = await Promise.all([
        this.supabase.getTodasLasPeliculas(),
        this.supabase.getAsientosVendidosPorPelicula(),
        this.supabase.getCombosDisponibles(),
      ]);

      if (peliculasRes.error) {
        this.error.set(`No se pudieron cargar las películas: ${peliculasRes.error.message}`);
        this.peliculas.set([]);
      } else {
        this.peliculas.set((peliculasRes.data ?? []) as Pelicula[]);
      }

      this.asientosVendidos.set(asientos);

      if (combosRes.error) {
        // La migración de combos puede no estar aplicada todavía.
        this.combos.set([]);
      } else {
        const combos = (combosRes.data ?? []) as unknown as Combo[];
        this.combos.set(combos);
        const primeraPelicula = this.peliculasEnCartelera()[0]?.id ?? 0;
        const seleccion: Record<number, number> = {};
        for (const combo of combos) seleccion[combo.id] = primeraPelicula;
        this.peliculaPorCombo.set(seleccion);
      }
    } catch {
      this.error.set('No se pudieron cargar las películas.');
      this.peliculas.set([]);
      this.asientosVendidos.set(new Map());
      this.combos.set([]);
    } finally {
      this.cargando.set(false);
    }
  }

  seleccionarPeliculaCombo(comboId: number, peliculaId: number) {
    this.peliculaPorCombo.update(actual => ({
      ...actual,
      [comboId]: Number(peliculaId),
    }));
  }

  irACombo(combo: Combo) {
    this.avisoCombo.set(null);

    const usuario = this.usuario();
    if (!usuario) {
      this.router.navigate(['/login']);
      return;
    }

    const motivo = motivoNoCanjeCombo(usuario, combo);
    if (motivo) {
      this.avisoCombo.set(motivo);
      return;
    }

    const peliculaId =
      this.peliculaPorCombo()[combo.id] ?? this.peliculasEnCartelera()[0]?.id ?? 0;
    if (!peliculaId) {
      this.avisoCombo.set('No hay películas en cartelera para este combo.');
      return;
    }

    this.router.navigate(['/pelicula', peliculaId], {
      queryParams: { combo: combo.id },
    });
  }

  getImagenUrl(nombreArchivo: string | null): string {
    return this.supabase.getPeliculaImageUrl(nombreArchivo);
  }
}