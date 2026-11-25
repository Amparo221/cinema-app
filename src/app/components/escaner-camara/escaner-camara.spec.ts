import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EscanerCamara } from './escaner-camara';

interface ConfigEscaner {
  fps: number;
  qrbox: { width: number; height: number };
  formatsToSupport: number[];
  disableFlip: boolean;
  videoConstraints: {
    facingMode: string;
    width: { ideal: number };
    height: { ideal: number };
  };
}

type AlLeer = (texto: string) => void;
type AlFallarFrame = (mensaje: string) => void;

/** Lo que la librería recibió: en jsdom no hay cámara, así que se reemplaza. */
const libreria = {
  id: '',
  config: null as ConfigEscaner | null,
  alLeer: null as AlLeer | null,
  escaneando: true,
  start: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
};

vi.mock('html5-qrcode', () => ({
  Html5QrcodeSupportedFormats: { QR_CODE: 0 },
  Html5Qrcode: class {
    constructor(id: string) {
      libreria.id = id;
    }

    get isScanning(): boolean {
      return libreria.escaneando;
    }

    start(camara: unknown, config: ConfigEscaner, alLeer: AlLeer, alFallar?: AlFallarFrame) {
      libreria.config = config;
      libreria.alLeer = alLeer;
      return libreria.start(camara, config, alLeer, alFallar);
    }

    stop() {
      return libreria.stop();
    }

    clear() {
      libreria.clear();
    }
  },
}));

describe('EscanerCamara', () => {
  let fixture: ComponentFixture<EscanerCamara>;
  let component: EscanerCamara;
  let destruido = false;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  async function montar(): Promise<void> {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({ imports: [EscanerCamara] }).compileComponents();

    fixture = TestBed.createComponent(EscanerCamara);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(libreria.start).toHaveBeenCalled());
  }

  beforeEach(async () => {
    destruido = false;
    vi.clearAllMocks();
    libreria.config = null;
    libreria.alLeer = null;
    libreria.escaneando = true;
    libreria.start.mockResolvedValue(undefined);
    libreria.stop.mockResolvedValue(undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await montar();
  });

  afterEach(() => {
    if (!destruido) fixture.destroy();
    errorSpy.mockRestore();
  });

  it('arranca el escaneo sobre su contenedor y solo para QR', () => {
    expect(libreria.id).toBe(component.id);
    expect(libreria.config?.fps).toBe(10);
    expect(libreria.config?.formatsToSupport).toEqual([0]);
    // En jsdom el contenedor mide 0, así que el recuadro queda en el mínimo.
    expect(libreria.config?.qrbox).toEqual({ width: 160, height: 160 });
    expect(libreria.config?.videoConstraints).toEqual({
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    });
  });

  it('queda listo cuando la cámara arranca', async () => {
    await vi.waitFor(() => expect(component.estado()).toBe('listo'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.estado')).toBeNull();
  });

  it('emite el código recortado y descarta los vacíos', () => {
    const codigos: string[] = [];
    component.codigo.subscribe((codigo) => codigos.push(codigo));

    libreria.alLeer?.('  QR-123 ');
    libreria.alLeer?.('   ');

    expect(codigos).toEqual(['QR-123']);
  });

  it('muestra el motivo real cuando la cámara no arranca', async () => {
    const mensajes: string[] = [];
    component.error.subscribe((mensaje) => mensajes.push(mensaje));
    libreria.start.mockRejectedValue(
      'Error getting userMedia, error = NotAllowedError: Permission denied',
    );

    await component.iniciar();
    fixture.detectChanges();

    expect(component.estado()).toBe('error');
    expect(mensajes[0]).toContain('bloqueó la cámara');
    expect(fixture.nativeElement.querySelector('.reintentar')).not.toBeNull();
  });

  it('cierra la cámara al destruirse', async () => {
    destruido = true;
    libreria.stop.mockClear();
    libreria.clear.mockClear();

    fixture.destroy();
    // `detener()` espera al `stop()`, así que el `clear()` llega un tick después.
    await vi.waitFor(() => expect(libreria.clear).toHaveBeenCalled());
    expect(libreria.stop).toHaveBeenCalled();
  });
});
