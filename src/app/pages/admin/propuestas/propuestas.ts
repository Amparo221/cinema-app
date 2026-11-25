import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase';
import {
  EstadoPropuesta,
  PropuestaAdmin,
  etiquetaEstadoPropuesta,
  mensajeErrorPropuesta,
} from '../../../models/propuesta.model';
import { OpcionSelect, Select } from '../../../shared/select/select';

/** Propuestas por página en la bandeja. */
const PROPUESTAS_POR_PAGINA = 10;

const ESTADOS: readonly EstadoPropuesta[] = ['pendiente', 'aceptada', 'rechazada'];

/**
 * Bandeja de propuestas del admin.
 *
 * Aceptar no crea la película: lleva a /admin/general con el formulario
 * precargado. La propuesta se marca como aceptada recién cuando la
 * película se guarda (así una propuesta abandonada sigue pendiente).
 */
@Component({
  selector: 'app-admin-propuestas',
  imports: [FormsModule, Select],
  templateUrl: './propuestas.html',
  styleUrl: './propuestas.css',
})
export class AdminPropuestas implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  estado = signal('');
  texto = signal('');
  pagina = signal(1);
  readonly porPagina = PROPUESTAS_POR_PAGINA;

  cargando = signal(true);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  propuestas = signal<PropuestaAdmin[]>([]);
  total = signal(0);

  /** Propuesta cuyo rechazo está confirmándose en línea. */
  rechazandoId = signal<number | null>(null);
  notaRechazo = signal('');
  resolviendo = signal<number | null>(null);

  readonly opcionesEstado: readonly OpcionSelect[] = [
    { valor: '', etiqueta: 'Todas' },
    ...ESTADOS.map(estado => ({ valor: estado, etiqueta: etiquetaEstadoPropuesta(estado) })),
  ];

  readonly etiquetaEstado = etiquetaEstadoPropuesta;
  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.porPagina)),
  );
  readonly vacio = computed(() => !this.cargando() && this.propuestas().length === 0);
  readonly hayFiltros = computed(() => this.estado() !== '' || this.texto() !== '');

  ngOnInit(): void {
    void this.cargar();
  }

  cambiarEstado(valor: string | number | null): void {
    this.estado.set(valor === null ? '' : String(valor));
    this.aplicarFiltros();
  }

  cambiarTexto(evento: Event): void {
    this.texto.set(this.valorDe(evento));
  }

  /** El buscador se aplica con Enter o con "Buscar". */
  buscar(evento: Event): void {
    evento.preventDefault();
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.estado.set('');
    this.texto.set('');
    this.aplicarFiltros();
  }

  irAnterior(): void {
    if (this.pagina() <= 1) return;
    this.pagina.update(valor => valor - 1);
    void this.cargar();
  }

  irSiguiente(): void {
    if (this.pagina() >= this.totalPaginas()) return;
    this.pagina.update(valor => valor + 1);
    void this.cargar();
  }

  /** Lleva el alta de película con los datos de la propuesta. */
  aceptar(propuesta: PropuestaAdmin): void {
    void this.router.navigate(['/admin/general'], {
      queryParams: { propuesta: propuesta.id },
    });
  }

  abrirRechazo(id: number): void {
    this.rechazandoId.set(id);
    this.notaRechazo.set('');
    this.error.set(null);
    this.mensaje.set(null);
  }

  cancelarRechazo(): void {
    this.rechazandoId.set(null);
    this.notaRechazo.set('');
  }

  async rechazar(propuesta: PropuestaAdmin): Promise<void> {
    if (this.resolviendo()) return;

    this.resolviendo.set(propuesta.id);
    this.error.set(null);
    this.mensaje.set(null);

    const nota = this.notaRechazo().trim();
    const { error } = await this.supabase.resolverPropuesta(
      propuesta.id,
      'rechazada',
      nota || null,
    );

    this.resolviendo.set(null);

    if (error) {
      this.error.set(mensajeErrorPropuesta(error.message));
      return;
    }

    this.cancelarRechazo();
    this.mensaje.set(`Rechazaste la propuesta «${propuesta.titulo}». El cliente ya tiene el aviso.`);
    await this.cargar();
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  private aplicarFiltros(): void {
    this.pagina.set(1);
    void this.cargar();
  }

  private valorDe(evento: Event): string {
    const objetivo = evento.target as HTMLInputElement | null;
    return objetivo?.value ?? '';
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.listarPropuestas(
      this.estado(),
      this.texto(),
      this.porPagina,
      (this.pagina() - 1) * this.porPagina,
    );

    this.cargando.set(false);

    if (error) {
      this.error.set(mensajeErrorPropuesta(error.message));
      this.propuestas.set([]);
      this.total.set(0);
      return;
    }

    const filas = (data ?? []) as PropuestaAdmin[];

    // Si los filtros dejaron la página vacía, se vuelve a la primera.
    if (filas.length === 0 && this.pagina() > 1) {
      this.pagina.set(1);
      await this.cargar();
      return;
    }

    this.propuestas.set(filas);
    this.total.set(filas.length > 0 ? Number(filas[0].total) : 0);
  }
}
