import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Profile } from '../../models/profile.model';
import { CompraTemporalService } from '../../services/compra-temporal';
import { ReservaButacasService } from '../../services/reserva-butacas';
import { SessionService } from '../../services/session';
import { SupabaseService } from '../../services/supabase';
import { Compra } from './compra';

/** Fecha local en formato yyyy-mm-dd, igual que la usa el modelo de preventa. */
function enDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

const PERFIL: Profile = {
  id: 'usuario-1',
  email: 'ana@cine.com',
  nombre: 'Ana',
  apellido: 'Pérez',
  fecha_nacimiento: '1990-01-01',
  tipo_sangre: 'O+',
  color_ojos: 'marrón',
  dias_vacaciones: 0,
  puntos: 0,
  creditos: 0,
  primera_compra: false,
  role: 'registrado',
};

describe('Compra', () => {
  let component: Compra;
  let fixture: ComponentFixture<Compra>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  const funcionQuery = {
    select: () => funcionQuery,
    eq: () => funcionQuery,
    single: async () => ({
      data: {
        id: 1,
        fecha: '2026-10-22',
        hora: '20:00',
        salas: { nombre: 'Sala 1' },
        peliculas: { nombre: 'Película de prueba' },
      },
      error: null,
    }),
  };

  const supabaseMock = {
    from: vi.fn().mockReturnValue(funcionQuery),
    getProductosCandy: vi.fn().mockResolvedValue({ data: [], error: null }),
    getConfiguracion: vi.fn().mockResolvedValue({}),
    getCandyImageUrl: vi.fn().mockReturnValue(''),
  };

  const reservaMock = {
    sesionId: '00000000-0000-4000-8000-000000000001',
    estado: vi.fn().mockResolvedValue({ vendidas: [], reservadas: [], propias: [] }),
    bloquear: vi.fn().mockResolvedValue({ ok: true, conflictos: [], expiraAt: null }),
    liberar: vi.fn().mockResolvedValue(undefined),
    suscribir: vi.fn().mockReturnValue(() => undefined),
    desuscribir: vi.fn(),
  };

  const compraTemporalMock = {
    set: vi.fn(),
  };

  const sessionMock = {
    usuario: signal<Profile | null>(null),
    cargarSesion: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    sessionMock.usuario.set(null);
    router = { navigate: vi.fn().mockResolvedValue(true) };
    reservaMock.estado.mockResolvedValue({ vendidas: [], reservadas: [], propias: [] });
    reservaMock.bloquear.mockResolvedValue({ ok: true, conflictos: [], expiraAt: null });
    reservaMock.liberar.mockResolvedValue(undefined);
    reservaMock.suscribir.mockReturnValue(() => undefined);

    await TestBed.configureTestingModule({
      imports: [Compra],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => '1' },
              queryParamMap: { get: () => null },
            },
          },
        },
        { provide: Router, useValue: router },
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: SessionService, useValue: sessionMock },
        { provide: CompraTemporalService, useValue: compraTemporalMock },
        { provide: ReservaButacasService, useValue: reservaMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Compra);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('prepara el resumen normal y navega a pago cuando hay butacas', async () => {
    component.butacasSeleccionadas.set(['A1', 'A2']);

    await component.irAPagar();

    expect(reservaMock.bloquear).toHaveBeenCalledWith(1, ['A1', 'A2']);
    expect(compraTemporalMock.set).toHaveBeenCalledWith(
      expect.objectContaining({
        funcion_id: 1,
        butacas: ['A1', 'A2'],
        pelicula_nombre: 'Película de prueba',
        combo: null,
        combo_plus: false,
      })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/pago']);
  });

  it('no navega si Postgres informa un conflicto de butacas', async () => {
    component.butacasSeleccionadas.set(['A1', 'A2']);
    reservaMock.bloquear.mockResolvedValue({
      ok: false,
      conflictos: ['A1'],
      expiraAt: null,
    });

    await component.irAPagar();

    expect(component.butacasSeleccionadas()).toEqual(['A2']);
    expect(component.avisoButacas()).toContain('A1');
    expect(component.errorCompra()).toBeTruthy();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  /** Reemplaza la película cargada por una con datos de preventa. */
  function cargarPelicula(datos: Record<string, unknown> = {}) {
    component.pelicula.set({
      nombre: 'Película de prueba',
      precio_preventa: 40000,
      fecha_estreno: enDias(3),
      proximamente: true,
      ...datos,
    });
  }

  it('cobra el precio de preventa en las butacas normales', () => {
    cargarPelicula();
    component.butacasSeleccionadas.set(['A1', 'A2']);

    expect(component.preventaActiva()).toBe(true);
    expect(component.precioButacas()).toBe(80000);
  });

  it('mantiene la diferencia de la butaca VIP durante la preventa', () => {
    cargarPelicula();
    component.butacasSeleccionadas.set(['R1']);

    expect(component.precioButacas()).toBe(45000);
  });

  it('vuelve al precio de cartelera el día del estreno', () => {
    cargarPelicula({ fecha_estreno: enDias(0) });
    component.butacasSeleccionadas.set(['A1']);

    expect(component.preventaActiva()).toBe(false);
    expect(component.precioButacas()).toBe(10000);
  });

  it('no aplica preventa fuera de la ventana ni sin fecha de estreno', () => {
    cargarPelicula({ fecha_estreno: enDias(20) });
    component.butacasSeleccionadas.set(['A1']);
    expect(component.precioButacas()).toBe(10000);

    cargarPelicula({ fecha_estreno: null });
    expect(component.precioButacas()).toBe(10000);
  });

  it('aplica los descuentos sobre el precio de preventa', () => {
    sessionMock.usuario.set({ ...PERFIL, primera_compra: true });
    cargarPelicula();
    component.butacasSeleccionadas.set(['A1']);

    expect(component.descuentoPrimera()).toBe(8000);
    expect(component.subtotalConDescuentos()).toBe(32000);
  });

  it('envía el precio de preventa en el resumen de pago', async () => {
    cargarPelicula();
    component.butacasSeleccionadas.set(['A1']);

    await component.irAPagar();

    expect(compraTemporalMock.set).toHaveBeenCalledWith(
      expect.objectContaining({ precio_butacas: 40000 })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/pago']);
  });
});
