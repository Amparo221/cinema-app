import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import { NotificacionesService } from '../../services/notificaciones';
import { Pelicula } from '../../models/pelicula.model';
import {
  Combo,
  motivoNoCanjeCombo,
  nombreCombo,
  puntosCombo,
} from '../../models/combo.model';
import {
  esProximamente,
  estaEnPreventa,
  fechaHoy,
  fechaInicioPreventa,
} from '../../models/preventa.model';

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
  private notificaciones = inject(NotificacionesService);
  private router = inject(Router);

  peliculas = signal<Pelicula[]>([]);
  asientosVendidos = signal<Map<number, number>>(new Map());
  combos = signal<Combo[]>([]);
  peliculaPorCombo = signal<Record<number, number>>({});
  generoFiltro = signal<string>('');
  cargando = signal(true);
  error = signal<string | null>(null);
  avisoCombo = signal<string | null>(null);
  avisoAviso = signal<string | null>(null);

  /** Fecha de hoy congelada al cargar la cartelera. */
  readonly hoy = fechaHoy();

  usuario = this.session.usuario;
  suscripciones = this.notificaciones.suscripciones;

  readonly nombreCombo = nombreCombo;
  readonly puntosCombo = puntosCombo;

  private readonly formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  peliculasEnCartelera = computed(() =>
    this.peliculas().filter(pelicula => !esProximamente(pelicula, this.hoy))
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
    this.peliculas().filter(pelicula => esProximamente(pelicula, this.hoy))
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

  /** true si la película todavía no se estrenó (manda la fecha de estreno). */
  esProximamente(pelicula: Pelicula): boolean {
    return esProximamente(pelicula, this.hoy);
  }

  estaEnPreventa(pelicula: Pelicula): boolean {
    return estaEnPreventa(pelicula, this.hoy);
  }

  estaSuscrita(peliculaId: number): boolean {
    return this.suscripciones().has(peliculaId);
  }

  /** Primer día de preventa de la película, o null si no tiene fecha. */
  inicioPreventa(pelicula: Pelicula): string | null {
    return fechaInicioPreventa(pelicula.fecha_estreno);
  }

  async alternarAviso(pelicula: Pelicula) {
    this.avisoAviso.set(null);

    if (!this.usuario()) {
      await this.router.navigate(['/login']);
      return;
    }

    const ok = await this.notificaciones.alternarSuscripcion(pelicula.id);
    if (!ok) {
      this.avisoAviso.set(
        this.notificaciones.error() ?? 'No pudimos guardar tu preferencia.'
      );
      return;
    }

    this.avisoAviso.set(
      this.estaSuscrita(pelicula.id)
        ? `Listo: te avisamos cuando abra la preventa de ${pelicula.nombre}.`
        : `No te vamos a avisar por ${pelicula.nombre}.`
    );
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return 'Fecha a confirmar';
    const valor = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(valor.getTime())) return 'Fecha a confirmar';
    return valor.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  formatearPrecio(valor: number | null): string {
    return valor === null || valor <= 0 ? '' : this.formatoMoneda.format(valor);
  }
}