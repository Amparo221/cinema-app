import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeScannerService, Html5QrcodeSupportedFormats } from 'ng-code-scanner';
import type { ScanResult, ScannerConfig } from 'ng-code-scanner';
import { EscanerCamara } from './escaner-camara';

/**
 * Stub de la librería: en jsdom no hay cámara y así el test no carga
 * html5-qrcode.
 */
vi.mock('ng-code-scanner', () => ({
  CodeScannerService: class {},
  Html5QrcodeSupportedFormats: { QR_CODE: 0 },
}));

type IniciarEscaner = (
  elementId: string,
  cameraId: string | undefined,
  config: ScannerConfig,
  alLeer: (resultado: ScanResult) => void,
  alFallarFrame?: (mensaje: string) => void
) => Promise<void>;

const escanerMock = {
  isScanning: vi.fn(() => false),
  startScanning: vi.fn<IniciarEscaner>(),
  stopScanning: vi.fn<() => Promise<void>>(),
};

describe('EscanerCamara', () => {
  let fixture: ComponentFixture<EscanerCamara>;
  let component: EscanerCamara;
  let destruido = false;

  beforeEach(async () => {
    destruido = false;
    vi.clearAllMocks();
    escanerMock.isScanning.mockReturnValue(false);
    escanerMock.startScanning.mockResolvedValue(undefined);
    escanerMock.stopScanning.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [EscanerCamara],
      providers: [{ provide: CodeScannerService, useValue: escanerMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(EscanerCamara);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(escanerMock.startScanning).toHaveBeenCalled());
  });

  afterEach(() => {
    if (!destruido) fixture.destroy();
  });

  it('arranca el escaneo sobre su contenedor y solo para QR', () => {
    const [elemento, cameraId, config] = escanerMock.startScanning.mock.calls[0];

    expect(elemento).toBe(component.id);
    expect(cameraId).toBeUndefined();
    expect(config.fps).toBe(10);
    expect(config.formatsToSupport).toEqual([Html5QrcodeSupportedFormats.QR_CODE]);
    // En jsdom el contenedor mide 0, así que el recuadro queda en el mínimo.
    expect(config.qrbox).toEqual({ width: 160, height: 160 });
    // `aspectRatio` se aplica con applyConstraints y rompe en webcams de escritorio.
    expect(config.aspectRatio).toBeUndefined();
    expect(config.videoConstraints).toEqual({
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    });
  });

  it('queda listo cuando la cámara arranca', async () => {
    await vi.waitFor(() => expect(component.estado()).toBe('listo'));
    expect(fixture.nativeElement.querySelector('.estado')).toBeNull();
  });

  it('no trata un frame sin QR como error de cámara', () => {
    const mensajes: string[] = [];
    component.error.subscribe((mensaje) => mensajes.push(mensaje));

    const [, , , , alFallarFrame] = escanerMock.startScanning.mock.calls[0];
    alFallarFrame?.('NotFoundException: No MultiFormat Readers were able to detect the code.');

    expect(mensajes).toEqual([]);
  });

  it('muestra el motivo real cuando la cámara no arranca', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const mensajes: string[] = [];
    component.error.subscribe((mensaje) => mensajes.push(mensaje));
    escanerMock.startScanning.mockRejectedValue(
      'Error getting userMedia, error = NotAllowedError: Permission denied'
    );

    await component.iniciar();
    fixture.detectChanges();

    expect(component.estado()).toBe('error');
    expect(mensajes[0]).toContain('bloqueó la cámara');
    expect(fixture.nativeElement.querySelector('.reintentar')).not.toBeNull();
    errorSpy.mockRestore();
  });

  it('emite el código recortado y descarta los vacíos', () => {
    const codigos: string[] = [];
    component.codigo.subscribe((codigo) => codigos.push(codigo));

    component.alEscanear({ decodedText: '  QR-123 ', result: null });
    component.alEscanear({ decodedText: '   ', result: null });

    expect(codigos).toEqual(['QR-123']);
  });

  it('cierra la cámara al destruirse', () => {
    destruido = true;
    escanerMock.stopScanning.mockClear();

    fixture.destroy();

    expect(escanerMock.stopScanning).toHaveBeenCalled();
  });
});
