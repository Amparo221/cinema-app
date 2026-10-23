import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompraTemporalService, ResumenCompra } from '../../services/compra-temporal';
import { ReservaButacasService } from '../../services/reserva-butacas';
import { SessionService } from '../../services/session';
import { SupabaseService } from '../../services/supabase';
import { Pago } from './pago';

describe('Pago', () => {
  let component: Pago;
  let fixture: ComponentFixture<Pago>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  const resumenBase: ResumenCompra = {
    funcion_id: 1,
    pelicula_nombre: 'Película de prueba',
    funcion_fecha: '2026-10-22',
    funcion_hora: '20:00',
    sala_nombre: 'Sala 1',
    butacas: ['A1', 'A2'],
    combo: null,
    combo_plus: false,
    puntos_combo: 0,
    precio_butacas: 20000,
    descuento_primera_compra: 4000,
    descuento_cincuenta: 0,
    carrito_candy: [],
    total_candy: 0,
    subtotal_con_descuentos: 16000,
    creditos_disponibles: 0,
    creditos_usados: 0,
    total: 16000,
  };

  const resumenCombo: ResumenCompra = {
    ...resumenBase,
    butacas: ['R12'],
    combo: {
      id: 7,
      nombre: 'Combo Clásico',
      descripcion: null,
      producto_1_id: 10,
      producto_2_id: 20,
      puntos: 12000,
      puntos_plus: 18000,
      activo: true,
    },
    combo_plus: true,
    puntos_combo: 18000,
    precio_butacas: 0,
    descuento_primera_compra: 0,
    total_candy: 0,
    subtotal_con_descuentos: 0,
    total: 0,
  };

  let resumen: ReturnType<typeof signal<ResumenCompra | null>>;

  const compraTemporalMock = {
    resumen: signal<ResumenCompra | null>(null),
    limpiar: vi.fn(),
  };

  const supabaseMock = {
    crearCompraConButacas: vi.fn(),
  };

  const reservaMock = {
    sesionId: '00000000-0000-4000-8000-000000000001',
    liberar: vi.fn().mockResolvedValue(undefined),
  };

  const sessionMock = {
    usuario: signal(null),
    recargarSesion: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    router = { navigate: vi.fn().mockResolvedValue(true) };

    resumen = signal<ResumenCompra | null>({ ...resumenBase });
    compraTemporalMock.resumen = resumen;
    compraTemporalMock.limpiar.mockImplementation(() => resumen.set(null));
    supabaseMock.crearCompraConButacas.mockResolvedValue({
      data: 'compra-1',
      error: null,
    });
    reservaMock.liberar.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [Pago],
      providers: [
        { provide: Router, useValue: router },
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: SessionService, useValue: sessionMock },
        { provide: CompraTemporalService, useValue: compraTemporalMock },
        { provide: ReservaButacasService, useValue: reservaMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Pago);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('confirma una compra normal con una sola RPC atómica', async () => {
    await component.confirmarPago();

    expect(supabaseMock.crearCompraConButacas).toHaveBeenCalledWith(
      expect.objectContaining({
        funcion_id: 1,
        codigos: ['A1', 'A2'],
        sesion_id: reservaMock.sesionId,
        cantidad_butacas: 2,
        precio_butacas: 20000,
        total: 16000,
        metodo_pago: 'tarjeta',
        combo_id: null,
        carrito_extra: [],
        puntos_combo: 0,
      })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/recibo', 'compra-1']);
    expect(compraTemporalMock.limpiar).toHaveBeenCalled();
  });

  it('paga un combo Plus + solo con puntos y sin método de dinero', async () => {
    resumen.set({ ...resumenCombo });

    await component.confirmarPago();

    expect(supabaseMock.crearCompraConButacas).toHaveBeenCalledWith(
      expect.objectContaining({
        funcion_id: 1,
        codigos: ['R12'],
        cantidad_butacas: 1,
        precio_butacas: 0,
        total: 0,
        metodo_pago: 'puntos',
        combo_id: 7,
        carrito_extra: [],
        puntos_combo: 18000,
      })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/recibo', 'compra-1']);
  });

  it('muestra la opción de volver si las butacas dejaron de estar disponibles', async () => {
    supabaseMock.crearCompraConButacas.mockResolvedValue({
      data: null,
      error: { message: 'BUTACAS_NO_DISPONIBLES' },
    });

    await component.confirmarPago();

    expect(component.error()).toContain('ocupada');
    expect(component.volverAElegirVisible()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
