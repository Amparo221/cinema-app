import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import { NotificacionesService } from '../../services/notificaciones';
import { Pelicula } from '../../models/pelicula.model';
import { Funcion } from '../../models/funcion.model';
import { Resena } from '../../models/resena.model';
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

@Component({
  selector: 'app-pelicula',
  imports: [FormsModule, RouterLink],
  templateUrl: './pelicula.html',
  styleUrl: './pelicula.css',
})
export class PeliculaPage implements OnInit {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);
  private notificaciones = inject(NotificacionesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  pelicula = signal<Pelicula | null>(null);
  funciones = signal<Funcion[]>([]);
  resenas = signal<Resena[]>([]);
  combo = signal<Combo | null>(null);
  avisoCombo = signal<string | null>(null);
  avisoAviso = signal<string | null>(null);
  cargando = signal(true);

  /** Fecha de hoy congelada al abrir la página. */
  readonly hoy = fechaHoy();

  readonly nombreCombo = nombreCombo;
  readonly puntosCombo = puntosCombo;

  modalResenaAbierto = signal(false);
  nuevaEstrellas = signal(5);
  nuevoComentario = signal('');
  errorResena = signal<string | null>(null);
  enviandoResena = signal(false);

  usuario = this.session.usuario;
  suscripciones = this.notificaciones.suscripciones;

  yaTieneResena = computed(() => {
    const u = this.usuario();
    if (!u) return false;
    return this.resenas().some(r => r.usuario_id === u.id);
  });

  esProxima = computed(() => {
    const pelicula = this.pelicula();
    return pelicula ? esProximamente(pelicula, this.hoy) : false;
  });

  preventaActiva = computed(() => {
    const pelicula = this.pelicula();
    return pelicula ? estaEnPreventa(pelicula, this.hoy) : false;
  });

  /**
   * En preventa solo se muestran las funciones del día de estreno en adelante.
   * Después del estreno se muestran todas.
   */
  funcionesVisibles = computed(() => {
    const estreno = this.pelicula()?.fecha_estreno ?? null;
    const funciones = this.funciones();
    if (!estreno || this.hoy >= estreno) return funciones;
    return funciones.filter(funcion => funcion.fecha >= estreno);
  });

  funcionesAgrupadas = computed(() => {
    const grupos = new Map<string, Funcion[]>();
    for (const f of this.funcionesVisibles()) {
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

    const comboId = Number(this.route.snapshot.queryParamMap.get('combo'));
    await Promise.all([
      this.cargarTodo(id),
      comboId ? this.cargarCombo(comboId) : Promise.resolve(),
    ]);
  }

  private async cargarCombo(comboId: number) {
    await this.session.cargarSesion();
    const { data, error } = await this.supabase.getCombo(comboId);
    if (error || !data) {
      this.avisoCombo.set('El combo seleccionado ya no está disponible.');
      return;
    }

    const combo = data as unknown as Combo;
    this.combo.set(combo);
    this.avisoCombo.set(motivoNoCanjeCombo(this.usuario(), combo));
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
    const combo = this.combo();
    const parametros = combo && !this.avisoCombo() ? { combo: combo.id } : undefined;
    this.router.navigate(['/compra', funcionId], {
      queryParams: parametros,
    });
  }

  quitarCombo() {
    this.combo.set(null);
    this.avisoCombo.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { combo: null },
      queryParamsHandling: 'merge',
    });
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

  /** Primer día de preventa, o null si todavía no hay fecha de estreno. */
  inicioPreventa(): string | null {
    return fechaInicioPreventa(this.pelicula()?.fecha_estreno ?? null);
  }

  formatearPrecio(valor: number | null): string {
    if (valor === null || valor <= 0) return '';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(valor);
  }

  estaSuscrita(peliculaId: number): boolean {
    return this.suscripciones().has(peliculaId);
  }

  async alternarAviso() {
    const pelicula = this.pelicula();
    if (!pelicula) return;

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
}