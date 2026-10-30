import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeScannerService } from 'ng-code-scanner';
import { EntradaQr } from '../../models/entrada-qr.model';
import { SupabaseService } from '../../services/supabase';
import { Escaner } from './escaner';

/**
 * Stub de la librería de cámara: en jsdom no hay cámara y así los tests no
 * cargan html5-qrcode. El factory es sincrónico a propósito: `EscanerCamara`
 * importa `CodeScannerService` como valor y un factory `async` rompe el orden de
 * inicialización de los imports.
 */
vi.mock('ng-code-scanner', () => ({
  CodeScannerComponent: class {},
  Html5QrcodeSupportedFormats: { QR_CODE: 0 },
  CodeScannerService: class {},
}));

/** Fecha local en formato yyyy-mm-dd, igual que la manda Postgres. */
function enDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function entrada(extra: Partial<EntradaQr> = {}): EntradaQr {
  return {
    compra_id: 'compra-1',
    qr_code: 'QR-123',
    estado: 'valida',
    pelicula: 'El Padrino',
    fecha: enDias(0),
    hora: '20:00:00',
    sala: 'Sala 1',
    cantidad_butacas: 2,
    butacas: ['A1', 'A2'],
    combo_nombre: null,
    usada_at: null,
    puede_ingresar: true,
    validada_ahora: false,
    ...extra,
  };
}

describe('Escaner', () => {
  let component: Escaner;
  let fixture: ComponentFixture<Escaner>;

  const supabaseMock = {
    consultarEntradaQr: vi.fn(),
    validarEntradaQr: vi.fn(),
  };

  /** Doble del servicio de cámara: `EscanerCamara` lo inyecta y en jsdom no hay cámara. */
  const camaraMock = {
    isScanning: () => false,
    startScanning: vi.fn().mockResolvedValue(undefined),
    stopScanning: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    supabaseMock.consultarEntradaQr.mockResolvedValue({ data: entrada(), error: null });
    supabaseMock.validarEntradaQr.mockResolvedValue({
      data: entrada({ estado: 'usada', usada_at: '2026-10-29T21:00:00Z', validada_ahora: true }),
      error: null,
    });

    await TestBed.configureTestingModule({
      imports: [Escaner],
      providers: [
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: CodeScannerService, useValue: camaraMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Escaner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  function texto(selector: string): string {
    const nodo = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
    return nodo?.textContent?.trim() ?? '';
  }

  it('arranca mostrando la cámara y sin resultado', () => {
    expect(component.camaraActiva()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-escaner-camara')).not.toBeNull();
    expect(texto('.pelicula')).toBe('');
  });

  it('consulta el QR escaneado y muestra la película', async () => {
    await component.alEscanear(' QR-123 ');
    fixture.detectChanges();

    // El código se recorta antes de ir a la base.
    expect(supabaseMock.consultarEntradaQr).toHaveBeenCalledWith('QR-123');
    expect(texto('.pelicula')).toBe('El Padrino');
    expect(texto('.funcion')).toContain('20:00');
    expect(fixture.nativeElement.textContent).toContain('Sala 1');
  });

  it('ignora lecturas nuevas mientras se muestra un resultado', async () => {
    await component.alEscanear('QR-123');
    await component.alEscanear('QR-123');
    await component.alEscanear('QR-999');

    expect(supabaseMock.consultarEntradaQr).toHaveBeenCalledTimes(1);
  });

  it('descarta lecturas repetidas del mismo QR aunque falle la consulta', async () => {
    supabaseMock.consultarEntradaQr.mockResolvedValue({
      data: null,
      error: { message: 'QR_NO_ENCONTRADO' },
    });

    await component.alEscanear('QR-VIEJO');
    await component.alEscanear('QR-VIEJO');

    expect(supabaseMock.consultarEntradaQr).toHaveBeenCalledTimes(1);
    expect(component.error()).toContain('no corresponde a ninguna compra');
  });

  it('muestra las ubicaciones de las butacas', async () => {
    supabaseMock.consultarEntradaQr.mockResolvedValue({
      data: entrada({ butacas: ['R1', 'R2'], cantidad_butacas: 2 }),
      error: null,
    });

    await component.alEscanear('QR-123');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('R1, R2');
    expect(fixture.nativeElement.textContent).toContain('Sala 1');
  });

  it('avisa cuando la entrada no es para hoy', async () => {
    supabaseMock.consultarEntradaQr.mockResolvedValue({
      data: entrada({ fecha: '2020-01-01' }),
      error: null,
    });

    await component.alEscanear('QR-123');
    fixture.detectChanges();

    expect(texto('.aviso')).toContain('no es para hoy');
  });

  it('valida la entrada al aceptar y desactiva el QR', async () => {
    await component.alEscanear('QR-123');
    fixture.detectChanges();

    await component.aceptar();
    fixture.detectChanges();

    expect(supabaseMock.validarEntradaQr).toHaveBeenCalledWith('QR-123');
    expect(component.validada()?.estado).toBe('usada');
    expect(component.entrada()).toBeNull();
    expect(component.camaraActiva()).toBe(false);
    expect(texto('.ok-titulo')).toBe('Entrada validada');
    expect(fixture.nativeElement.textContent).toContain('El Padrino');
    expect(fixture.nativeElement.textContent).toContain('no puede usarse de nuevo');
  });

  it('no permite validar dos veces la misma entrada', async () => {
    await component.alEscanear('QR-123');
    await component.aceptar();

    await component.aceptar();

    expect(supabaseMock.validarEntradaQr).toHaveBeenCalledTimes(1);
  });

  it('muestra el error y refresca el estado si otro empleado ya la usó', async () => {
    await component.alEscanear('QR-123');

    supabaseMock.validarEntradaQr.mockResolvedValue({
      data: null,
      error: { message: 'QR_YA_USADO' },
    });
    supabaseMock.consultarEntradaQr.mockResolvedValue({
      data: entrada({ estado: 'usada', puede_ingresar: false, usada_at: '2026-10-29T21:00:00Z' }),
      error: null,
    });

    await component.aceptar();
    fixture.detectChanges();

    expect(component.error()).toContain('ya fue usada');
    expect(component.entrada()?.puede_ingresar).toBe(false);
    expect(texto('.estado-bloqueado')).toContain('Esta entrada ya fue usada');
    expect(fixture.nativeElement.querySelector('.tarjeta .btn-principal')).toBeNull();
  });

  it('no ofrece aceptar cuando la compra fue cancelada', async () => {
    supabaseMock.consultarEntradaQr.mockResolvedValue({
      data: entrada({ estado: 'cancelada', puede_ingresar: false }),
      error: null,
    });

    await component.alEscanear('QR-123');
    fixture.detectChanges();

    expect(texto('.estado-bloqueado')).toContain('cancelada');
    expect(fixture.nativeElement.querySelector('.tarjeta .btn-principal')).toBeNull();
  });

  it('busca la entrada con el código manual cuando la cámara falla', async () => {
    const evento = new Event('submit');
    const preventDefault = vi.spyOn(evento, 'preventDefault');
    component.codigoManual.set('QR-777');

    await component.buscarCodigoManual(evento);
    fixture.detectChanges();

    expect(preventDefault).toHaveBeenCalled();
    expect(supabaseMock.consultarEntradaQr).toHaveBeenCalledWith('QR-777');
    expect(texto('.pelicula')).toBe('El Padrino');
  });

  it('no busca nada con el código manual vacío', async () => {
    component.codigoManual.set('   ');

    await component.buscarCodigoManual(new Event('submit'));

    expect(supabaseMock.consultarEntradaQr).not.toHaveBeenCalled();
  });

  it('avisa cuando la cámara no pudo abrirse', () => {
    component.alFallarCamara();
    fixture.detectChanges();

    expect(component.error()).toContain('permisos del navegador');
    expect(texto('.alerta.error')).toContain('permisos del navegador');
  });

  it('muestra el motivo real del fallo de cámara', () => {
    component.alFallarCamara('Otra aplicación está usando la cámara.');
    fixture.detectChanges();

    expect(texto('.alerta.error')).toContain('Otra aplicación');
  });

  it('vuelve a la cámara al escanear la siguiente entrada', async () => {
    await component.alEscanear('QR-123');
    await component.aceptar();
    fixture.detectChanges();

    component.escanearSiguiente();
    fixture.detectChanges();

    expect(component.entrada()).toBeNull();
    expect(component.validada()).toBeNull();
    expect(component.error()).toBeNull();
    expect(component.camaraActiva()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-escaner-camara')).not.toBeNull();
  });

  it('formatea la función y la hora de uso', () => {
    expect(component.formatearFuncion(null, null)).toBe('Función sin fecha');
    expect(component.formatearFuncion('2026-10-29', '20:00:00')).toContain('20:00');
    expect(component.formatearUso(null)).toBe('');
    expect(component.formatearUso('no-es-fecha')).toBe('');
  });
});
