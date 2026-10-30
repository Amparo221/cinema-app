import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  CodeScannerService,
  Html5QrcodeSupportedFormats,
  ScanResult,
  ScannerConfig,
} from 'ng-code-scanner';
import { mensajeErrorCamara } from './escaner-camara-errores';

/** Recuadro de escaneo: ni tan chico que no entre el QR ni más ancho que el video. */
const LADO_MINIMO = 160;
const LADO_MAXIMO = 300;

/** Frames que esperamos a que el contenedor tenga ancho antes de rendirnos. */
const INTENTOS_DE_ANCHO = 5;

/**
 * Arma la configuración de `html5-qrcode` a partir del ancho del contenedor.
 *
 * El video hereda ese ancho y su alto sale de la proporción real de la cámara,
 * así que `qrbox` se calcula sobre el ancho y con margen: si el recuadro no
 * entra en el video, la librería apaga el sombreado y escanea el frame entero.
 * Tampoco se usa `aspectRatio`, que se aplica con `applyConstraints()` y muchas
 * webcams de escritorio rechazan (eso aborta el arranque).
 */
function configurarEscaner(ancho: number): ScannerConfig {
  const lado = Math.min(LADO_MAXIMO, Math.max(LADO_MINIMO, Math.round(ancho * 0.5)));

  return {
    fps: 10,
    qrbox: { width: lado, height: lado },
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    disableFlip: false,
    // Ideal, no exacto: si la cámara no llega a 720p igual arranca.
    videoConstraints: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };
}

/** Espera un frame; en jsdom no siempre existe `requestAnimationFrame`. */
function siguienteFrame(): Promise<void> {
  return new Promise((listo) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => listo());
      return;
    }
    setTimeout(listo, 16);
  });
}

/**
 * Cámara del escáner.
 *
 * Usa el servicio de `ng-code-scanner` en lugar de su componente porque acá el
 * arranque lo controlamos nosotros con `afterNextRender()`: el componente de la
 * librería arranca desde un `effect()` del constructor, antes de que el
 * contenedor tenga ancho, y entonces el video queda en 0×0, el loop de escaneo
 * muere y la cámara queda prendida sin leer ningún QR.
 */
@Component({
  selector: 'app-escaner-camara',
  templateUrl: './escaner-camara.html',
  styleUrl: './escaner-camara.css',
})
export class EscanerCamara {
  private readonly escaner = inject(CodeScannerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** Texto leído por la cámara (ya recortado). */
  readonly codigo = output<string>();
  /** No pudimos abrir la cámara; el texto ya está listo para mostrar. */
  readonly error = output<string>();

  /** `html5-qrcode` busca el contenedor del video por id. */
  readonly id = `escaner-${Math.random().toString(36).slice(2, 11)}`;
  /** `iniciando` mientras pide la cámara, `error` si no la pudo abrir. */
  readonly estado = signal<'iniciando' | 'listo' | 'error'>('iniciando');

  private readonly contenedor = viewChild.required<ElementRef<HTMLElement>>('contenedor');

  constructor() {
    afterNextRender(() => void this.iniciar());
    this.destroyRef.onDestroy(() => void this.detener());
  }

  /** Pide la cámara y arranca el escaneo. También lo usa el botón de reintento. */
  async iniciar(): Promise<void> {
    if (!this.esNavegador) return;

    this.estado.set('iniciando');
    try {
      // El servicio es un singleton: si quedó escaneando de una visita previa,
      // `startScanning` rechazaría con "Scanner is already running".
      if (this.escaner.isScanning()) await this.escaner.stopScanning();

      const elemento = this.contenedor().nativeElement;
      await this.esperarAncho(elemento);

      await this.escaner.startScanning(
        this.id,
        undefined,
        configurarEscaner(elemento.clientWidth),
        (resultado) => this.alEscanear(resultado),
        // Un frame sin QR no es un error de cámara: solo sigue buscando.
        () => undefined,
      );
      this.estado.set('listo');
    } catch (causa) {
      console.error('[escaner] no pudimos abrir la cámara', causa);
      this.estado.set('error');
      this.error.emit(mensajeErrorCamara(causa));
    }
  }

  alEscanear(resultado: ScanResult) {
    const codigo = (resultado?.decodedText ?? '').trim();
    if (codigo) this.codigo.emit(codigo);
  }

  /** El video toma el ancho del contenedor: con ancho 0 el canvas queda 0×0. */
  private async esperarAncho(elemento: HTMLElement): Promise<void> {
    for (let intento = 0; intento < INTENTOS_DE_ANCHO && elemento.clientWidth === 0; intento++) {
      await siguienteFrame();
    }
  }

  private async detener(): Promise<void> {
    try {
      await this.escaner.stopScanning();
    } catch (causa) {
      console.error('[escaner] no pudimos cerrar la cámara', causa);
    }
  }
}

