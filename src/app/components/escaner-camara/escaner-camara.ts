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
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { mensajeErrorCamara } from './escaner-camara-errores';

const LADO_MINIMO = 160;
const LADO_MAXIMO = 300;
const INTENTOS_DE_ANCHO = 5;

function configurarEscaner(ancho: number) {
  const lado = Math.min(LADO_MAXIMO, Math.max(LADO_MINIMO, Math.round(ancho * 0.5)));

  return {
    fps: 10,
    qrbox: { width: lado, height: lado },
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    disableFlip: false,
    videoConstraints: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };
}

function siguienteFrame(): Promise<void> {
  return new Promise((listo) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => listo());
      return;
    }
    setTimeout(listo, 16);
  });
}

@Component({
  selector: 'app-escaner-camara',
  templateUrl: './escaner-camara.html',
  styleUrl: './escaner-camara.css',
})
export class EscanerCamara {
  private readonly destroyRef = inject(DestroyRef);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly codigo = output<string>();
  readonly error = output<string>();

  readonly id = `escaner-${Math.random().toString(36).slice(2, 11)}`;
  readonly estado = signal<'iniciando' | 'listo' | 'error'>('iniciando');

  private readonly contenedor = viewChild.required<ElementRef<HTMLElement>>('contenedor');
  
  // Aquí guardamos la instancia de la librería
  private html5QrCode: Html5Qrcode | null = null;

  constructor() {
    afterNextRender(() => void this.iniciar());
    this.destroyRef.onDestroy(() => void this.detener());
  }

  async iniciar(): Promise<void> {
    if (!this.esNavegador) return;

    this.estado.set('iniciando');
    try {
      // Si ya había una instancia corriendo, la limpiamos
      if (this.html5QrCode) {
         await this.detener();
      }

      const elemento = this.contenedor().nativeElement;
      await this.esperarAncho(elemento);

      // Instanciamos la librería pasándole el ID del contenedor
      this.html5QrCode = new Html5Qrcode(this.id);

      await this.html5QrCode.start(
        { facingMode: 'environment' },
        configurarEscaner(elemento.clientWidth),
        (decodedText) => {
          // Lógica cuando lee el QR
          const codigo = decodedText.trim();
          if (codigo) this.codigo.emit(codigo);
        },
        () => {
          // Errores de lectura frame a frame (es normal, ignoramos)
        }
      );
      this.estado.set('listo');
    } catch (causa) {
      console.error('[escaner] no pudimos abrir la cámara', causa);
      this.estado.set('error');
      this.error.emit(mensajeErrorCamara(causa));
    }
  }

  private async esperarAncho(elemento: HTMLElement): Promise<void> {
    for (let intento = 0; intento < INTENTOS_DE_ANCHO && elemento.clientWidth === 0; intento++) {
      await siguienteFrame();
    }
  }

  private async detener(): Promise<void> {
    if (this.html5QrCode) {
      try {
        if (this.html5QrCode.isScanning) {
          await this.html5QrCode.stop();
        }
        this.html5QrCode.clear();
        this.html5QrCode = null;
      } catch (causa) {
        console.error('[escaner] no pudimos cerrar la cámara', causa);
      }
    }
  }
}