import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { NotificacionesService } from '../../services/notificaciones';
import { Notificacion } from '../../models/notificacion.model';

/** Campanita flotante con las notificaciones del usuario logueado. */
@Component({
  selector: 'app-campanita',
  host: {
    '(document:keydown.escape)': 'cerrar()',
    '(document:click)': 'alClickFuera($event)',
  },
  templateUrl: './campanita.html',
  styleUrl: './campanita.css',
})
export class Campanita {
  private notificaciones = inject(NotificacionesService);
  private router = inject(Router);
  private injector = inject(Injector);

  private contenedor = viewChild<ElementRef<HTMLElement>>('contenedor');
  private panel = viewChild<ElementRef<HTMLElement>>('panel');

  readonly abierto = signal(false);

  readonly items = this.notificaciones.notificaciones;
  readonly noLeidas = this.notificaciones.noLeidas;
  readonly cargando = this.notificaciones.cargando;
  readonly error = this.notificaciones.error;

  readonly etiquetaBoton = computed(() => {
    const sinLeer = this.noLeidas();
    return sinLeer > 0
      ? `Notificaciones (${sinLeer} sin leer)`
      : 'Notificaciones';
  });

  readonly anuncio = computed(() => {
    const sinLeer = this.noLeidas();
    if (sinLeer === 0) return 'No tenés notificaciones sin leer.';
    return sinLeer === 1
      ? 'Tenés 1 notificación sin leer.'
      : `Tenés ${sinLeer} notificaciones sin leer.`;
  });

  alternar() {
    if (this.abierto()) {
      this.cerrar();
      return;
    }

    this.abierto.set(true);
    void this.notificaciones.refrescar();

    // El panel todavía no existe: se enfoca cuando Angular lo renderiza.
    afterNextRender(() => this.panel()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  cerrar() {
    if (!this.abierto()) return;
    this.abierto.set(false);
  }

  /** Cierra el panel cuando el clic cae fuera de la campanita. */
  alClickFuera(evento: MouseEvent) {
    if (!this.abierto()) return;

    const destino = evento.target as Node | null;
    const contenedor = this.contenedor()?.nativeElement;
    if (!destino || !contenedor) return;
    if (contenedor.contains(destino)) return;

    this.cerrar();
  }

  async seleccionar(notificacion: Notificacion) {
    if (!notificacion.leida) {
      await this.notificaciones.marcarLeida(notificacion.id);
    }

    this.cerrar();

    if (notificacion.pelicula_id) {
      await this.router.navigate(['/pelicula', notificacion.pelicula_id]);
    }
  }

  async marcarTodas() {
    await this.notificaciones.marcarTodasLeidas();
  }

  /** Texto corto para la fecha del aviso. */
  formatearFecha(iso: string): string {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '';

    const diferencia = Date.now() - fecha.getTime();
    const minutos = Math.floor(diferencia / 60_000);

    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos} min`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;

    return fecha.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
