import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ACCIONES_ACTIVIDAD, RegistroActividad } from '../../../models/actividad.model';
import { ActividadService } from '../../../services/actividad';
import {
  REGISTROS_POR_PAGINA,
  claseAccion,
  entidadLegible,
  etiquetaAccion,
  fechaHoraLocal,
  mensajeErrorActividad,
  referencia,
  resumenCambio,
  totalPaginas,
} from './log-datos';

/**
 * Bitácora del admin: quién creó o modificó funciones, precios y
 * recompensas, quién validó cada QR y qué compras se cancelaron.
 *
 * Los registros los escriben triggers de la base (tabla `actividad`),
 * así que no se pueden alterar desde el frontend. Acá solo se filtra
 * y se pagina.
 */
@Component({
  selector: 'app-admin-log',
  templateUrl: './log.html',
  styleUrl: './log.css',
})
export class AdminLog implements OnInit {
  private actividad = inject(ActividadService);

  readonly desde = signal('');
  readonly hasta = signal('');
  readonly accion = signal('');
  readonly usuario = signal('');

  readonly pagina = signal(1);
  readonly porPagina = REGISTROS_POR_PAGINA;

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly registros = signal<RegistroActividad[]>([]);
  readonly total = signal(0);

  readonly acciones = ACCIONES_ACTIVIDAD;
  readonly totalPaginas = computed(() => totalPaginas(this.total(), this.porPagina));
  readonly vacio = computed(() => !this.cargando() && this.registros().length === 0);
  readonly hayFiltros = computed(
    () =>
      this.desde() !== '' || this.hasta() !== '' || this.accion() !== '' || this.usuario() !== '',
  );

  /** Funciones puras que usa el template. */
  readonly etiquetaAccion = etiquetaAccion;
  readonly claseAccion = claseAccion;
  readonly entidadLegible = entidadLegible;
  readonly resumenCambio = resumenCambio;
  readonly referencia = referencia;
  readonly fechaHoraLocal = fechaHoraLocal;

  ngOnInit(): void {
    void this.cargar();
  }

  cambiarDesde(evento: Event): void {
    this.desde.set(this.valorDe(evento));
    this.aplicarFiltros();
  }

  cambiarHasta(evento: Event): void {
    this.hasta.set(this.valorDe(evento));
    this.aplicarFiltros();
  }

  cambiarAccion(evento: Event): void {
    this.accion.set(this.valorDe(evento));
    this.aplicarFiltros();
  }

  cambiarUsuario(evento: Event): void {
    this.usuario.set(this.valorDe(evento));
  }

  /** El buscador por nombre se aplica con Enter o con "Buscar". */
  buscar(evento: Event): void {
    evento.preventDefault();
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.desde.set('');
    this.hasta.set('');
    this.accion.set('');
    this.usuario.set('');
    this.aplicarFiltros();
  }

  irAnterior(): void {
    if (this.pagina() <= 1) return;
    this.pagina.update((valor) => valor - 1);
    void this.cargar();
  }

  irSiguiente(): void {
    if (this.pagina() >= this.totalPaginas()) return;
    this.pagina.update((valor) => valor + 1);
    void this.cargar();
  }

  private aplicarFiltros(): void {
    this.pagina.set(1);
    void this.cargar();
  }

  private valorDe(evento: Event): string {
    const objetivo = evento.target as HTMLInputElement | HTMLSelectElement | null;
    return objetivo?.value ?? '';
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    const respuesta = await this.actividad.listar(
      {
        desde: this.desde(),
        hasta: this.hasta(),
        accion: this.accion(),
        usuario: this.usuario(),
      },
      this.pagina(),
      this.porPagina,
    );

    this.cargando.set(false);

    if (respuesta.error) {
      this.error.set(mensajeErrorActividad(respuesta.error));
      this.registros.set([]);
      this.total.set(0);
      return;
    }

    // Si los filtros dejaron la página vacía, se vuelve a la primera.
    if (respuesta.pagina.registros.length === 0 && this.pagina() > 1) {
      this.pagina.set(1);
      await this.cargar();
      return;
    }

    this.registros.set(respuesta.pagina.registros);
    this.total.set(respuesta.pagina.total);
  }
}
