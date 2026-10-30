import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { EscanerCamara } from '../../components/escaner-camara/escaner-camara';
import { ERROR_CAMARA } from '../../components/escaner-camara/escaner-camara-errores';
import { SupabaseService } from '../../services/supabase';
import { EntradaQr } from '../../models/entrada-qr.model';
import { mensajeErrorEscaner } from './escaner-errores';

/**
 * Ventana en la que se ignora el mismo QR para que la cámara no repita la
 * consulta mientras el empleado lee el resultado.
 */
const MISMO_CODIGO_MS = 2500;

/**
 * Página del empleado (y del admin): escanea el QR del recibo, muestra para
 * qué película es y, cuando el empleado acepta, consume la entrada.
 */
@Component({
  selector: 'app-escaner',
  imports: [EscanerCamara],
  templateUrl: './escaner.html',
  styleUrl: './escaner.css',
})
export class Escaner {
  private supabase = inject(SupabaseService);

  /** Entrada consultada, todavía sin dar paso. */
  entrada = signal<EntradaQr | null>(null);
  /** Entrada recién validada (pantalla verde). */
  validada = signal<EntradaQr | null>(null);
  consultando = signal(false);
  validando = signal(false);
  error = signal<string | null>(null);
  codigoManual = signal('');

  private ultimoCodigo: string | null = null;
  private ultimoEscaneo = 0;

  /** Foco al botón de aceptar en cuanto aparece la entrada. */
  private botonAceptar = viewChild<ElementRef<HTMLButtonElement>>('botonAceptar');

  constructor() {
    effect(() => {
      this.botonAceptar()?.nativeElement.focus();
    });
  }

  /** La cámara solo vive mientras no hay resultado en pantalla. */
  camaraActiva = computed(() => !this.entrada() && !this.validada());

  /** Aviso suave si la entrada no es para hoy (no bloquea el paso). */
  avisoFecha = computed(() => {
    const entrada = this.entrada();
    if (!entrada?.fecha) return null;
    return esDeHoy(entrada.fecha) ? null : 'Ojo: esta entrada no es para hoy.';
  });

  /** Llega cada lectura de la cámara. */
  async alEscanear(codigo: string) {
    if (!this.camaraActiva() || this.consultando() || this.validando()) return;

    const ahora = Date.now();
    if (codigo === this.ultimoCodigo && ahora - this.ultimoEscaneo < MISMO_CODIGO_MS) {
      return;
    }

    this.ultimoCodigo = codigo;
    this.ultimoEscaneo = ahora;
    await this.consultar(codigo);
  }

  /** Fallback para cuando el lector falla: el empleado tipea el código. */
  async buscarCodigoManual(evento: Event) {
    evento.preventDefault();
    const codigo = this.codigoManual().trim();
    if (!codigo) return;
    await this.consultar(codigo);
  }

  /** El empleado da paso: la RPC desactiva el QR. */
  async aceptar() {
    const entrada = this.entrada();
    if (!entrada || !entrada.puede_ingresar || this.validando()) return;

    this.validando.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.validarEntradaQr(entrada.qr_code);
    this.validando.set(false);

    if (error || !data) {
      this.error.set(mensajeErrorEscaner(error?.message ?? ''));
      // Puede que otro empleado lo haya usado: se refresca el estado real.
      await this.consultar(entrada.qr_code, false);
      return;
    }

    this.validada.set(data as unknown as EntradaQr);
    this.entrada.set(null);
  }

  /** Vuelve a la cámara para la siguiente persona. */
  escanearSiguiente() {
    this.entrada.set(null);
    this.validada.set(null);
    this.error.set(null);
    this.codigoManual.set('');
    this.ultimoCodigo = null;
    this.ultimoEscaneo = 0;
  }

  /** Muestra por qué no arrancó la cámara (el mensaje ya viene traducido). */
  alFallarCamara(mensaje: string = ERROR_CAMARA) {
    this.error.set(mensaje);
  }

  formatearFuncion(fecha: string | null, hora: string | null): string {
    if (!fecha || !hora) return 'Función sin fecha';
    const d = new Date(`${fecha}T${hora}`);
    if (Number.isNaN(d.getTime())) return `${fecha} ${hora}`;
    return d.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  formatearUso(usadaAt: string | null): string {
    if (!usadaAt) return '';
    const d = new Date(usadaAt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private async consultar(codigo: string, limpiarError = true) {
    const texto = codigo.trim();
    if (!texto) return;

    if (limpiarError) this.error.set(null);
    this.consultando.set(true);

    const { data, error } = await this.supabase.consultarEntradaQr(texto);

    this.consultando.set(false);

    if (error || !data) {
      this.error.set(mensajeErrorEscaner(error?.message ?? ''));
      return;
    }

    this.entrada.set(data as unknown as EntradaQr);
  }
}

/** Compara solo la fecha (la hora de la función no importa acá). */
function esDeHoy(fecha: string): boolean {
  const hoy = new Date();
  const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
    hoy.getDate()
  ).padStart(2, '0')}`;
  return fecha === iso;
}
