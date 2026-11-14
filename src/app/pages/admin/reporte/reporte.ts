import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { GraficoBarras } from '../../../components/grafico-barras/grafico-barras';
import {
  Agrupacion,
  CompraReporte,
  DatosReporte,
  FilaFacturacion,
  PeliculaMasVista,
  ProductoCandyVendido,
  RangoFechas,
} from '../../../models/reporte.model';
import { ReportesService } from '../../../services/reportes';
import { formatearMoneda, formatearNumero } from '../../../shared/numeros';
import {
  completarDias,
  errorDeRango,
  etiquetaDia,
  etiquetaPeriodo,
  fechaHoraLocal,
  hojasExcel,
  mejorProducto,
  nombreArchivoReporte,
  rangoMesActual,
  rangoSemanaActual,
  rangoUltimosDias,
  serieCandy,
  seriePeliculas,
  totalesDe,
} from './reporte-datos';
import { mensajeErrorReporte } from './reporte-errores';
import { descargarReporteExcel } from './reporte-excel';
import { descargarReportePdf } from './reporte-pdf';

/**
 * Reportes del cine: facturación diaria, películas más vistas y candy más
 * vendido, con exportación a PDF y Excel.
 *
 * Todo lo calcula Postgres (RPC security definer); la página solo arma las
 * series y los archivos. Las compras canceladas quedan fuera de la
 * facturación y se muestran en su propia columna.
 */
@Component({
  selector: 'app-admin-reporte',
  imports: [GraficoBarras],
  templateUrl: './reporte.html',
  styleUrl: './reporte.css',
})
export class AdminReporte implements OnInit {
  private reportes = inject(ReportesService);

  private readonly rangoInicial = rangoUltimosDias(7);

  readonly desde = signal(this.rangoInicial.desde);
  readonly hasta = signal(this.rangoInicial.hasta);
  readonly agrupacion = signal<Agrupacion>('semana');

  readonly cargando = signal(true);
  readonly exportando = signal<'pdf' | 'excel' | null>(null);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  private readonly filas = signal<FilaFacturacion[]>([]);
  readonly peliculas = signal<PeliculaMasVista[]>([]);
  readonly candy = signal<ProductoCandyVendido[]>([]);
  private readonly compras = signal<CompraReporte[]>([]);
  private readonly rangoActual = signal<RangoFechas>(this.rangoInicial);

  /** Días del rango, con ceros donde no hubo ventas. */
  readonly dias = computed(() => completarDias(this.filas(), this.rangoActual()));
  readonly totales = computed(() => totalesDe(this.filas()));

  readonly barrasPeliculas = computed(() => seriePeliculas(this.peliculas(), 6));
  readonly barrasCandy = computed(() => serieCandy(this.candy(), 6));
  readonly mejor = computed(() => mejorProducto(this.candy()));
  readonly sinVentas = computed(() => this.filas().length === 0);
  /** La tabla muestra un resumen; el detalle completo va en el Excel. */
  readonly peliculasPorPeriodo = computed(() => this.peliculas().slice(0, 12));

  /** Las mismas funciones puras que usa el PDF, expuestas al template. */
  readonly formatearMoneda = formatearMoneda;
  readonly formatearNumero = formatearNumero;
  readonly etiquetaDia = etiquetaDia;
  readonly etiquetaPeriodo = etiquetaPeriodo;

  ngOnInit(): void {
    void this.cargar();
  }

  cambiarDesde(evento: Event): void {
    this.desde.set(this.valorDe(evento));
    void this.cargar();
  }

  cambiarHasta(evento: Event): void {
    this.hasta.set(this.valorDe(evento));
    void this.cargar();
  }

  cambiarAgrupacion(evento: Event): void {
    const agrupacion: Agrupacion = this.valorDe(evento) === 'mes' ? 'mes' : 'semana';
    if (agrupacion === this.agrupacion()) return;
    this.agrupacion.set(agrupacion);
    void this.cargar();
  }

  elegirSemana(): void {
    this.aplicarRango(rangoSemanaActual());
  }

  elegirMes(): void {
    this.aplicarRango(rangoMesActual());
  }

  elegirUltimos(dias: number): void {
    this.aplicarRango(rangoUltimosDias(dias));
  }

  async descargarPdf(): Promise<void> {
    if (this.exportando()) return;
    this.exportando.set('pdf');
    this.error.set(null);

    try {
      await descargarReportePdf(this.datos(), nombreArchivoReporte(this.rangoActual(), 'pdf'));
      this.aviso.set('PDF descargado.');
    } catch {
      this.error.set('No se pudo generar el PDF. Probá de nuevo.');
    } finally {
      this.exportando.set(null);
    }
  }

  async descargarExcel(): Promise<void> {
    if (this.exportando()) return;
    this.exportando.set('excel');
    this.error.set(null);

    try {
      await descargarReporteExcel(
        hojasExcel(this.datos()),
        nombreArchivoReporte(this.rangoActual(), 'xlsx'),
      );
      this.aviso.set('Excel descargado.');
    } catch {
      this.error.set('No se pudo generar el Excel. Probá de nuevo.');
    } finally {
      this.exportando.set(null);
    }
  }

  private aplicarRango(rango: RangoFechas): void {
    this.desde.set(rango.desde);
    this.hasta.set(rango.hasta);
    void this.cargar();
  }

  private valorDe(evento: Event): string {
    const objetivo = evento.target as HTMLInputElement | HTMLSelectElement | null;
    return objetivo?.value ?? '';
  }

  private async cargar(): Promise<void> {
    const rango: RangoFechas = { desde: this.desde(), hasta: this.hasta() };
    const errorRango = errorDeRango(rango);

    this.aviso.set(null);
    this.error.set(null);

    if (errorRango) {
      this.error.set(errorRango);
      return;
    }

    this.rangoActual.set(rango);
    this.cargando.set(true);

    const [facturacion, peliculas, candy, compras] = await Promise.all([
      this.reportes.facturacion(rango),
      this.reportes.peliculas(rango, this.agrupacion()),
      this.reportes.candy(rango),
      this.reportes.compras(rango),
    ]);

    this.cargando.set(false);

    const primerError = facturacion.error ?? peliculas.error ?? candy.error ?? compras.error;
    if (primerError) {
      this.error.set(mensajeErrorReporte(primerError));
      this.filas.set([]);
      this.peliculas.set([]);
      this.candy.set([]);
      this.compras.set([]);
      return;
    }

    this.filas.set(facturacion.filas);
    this.peliculas.set(peliculas.filas);
    this.candy.set(candy.filas);
    this.compras.set(compras.filas);
  }

  /** Lo que necesitan el PDF y el Excel: el rango con los días completos. */
  private datos(): DatosReporte {
    return {
      rango: this.rangoActual(),
      agrupacion: this.agrupacion(),
      totales: this.totales(),
      facturacion: this.dias(),
      peliculas: this.peliculas(),
      candy: this.candy(),
      compras: this.compras(),
      generadoEl: fechaHoraLocal(new Date().toISOString()),
    };
  }
}
