import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseService } from './supabase';
import { ReservaButacasService } from './reserva-butacas';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('ReservaButacasService', () => {
  let service: ReservaButacasService;

  const supabaseMock = {
    getEstadoButacas: vi.fn(),
    bloquearButacas: vi.fn(),
    liberarBloqueos: vi.fn(),
    crearCanal: vi.fn(),
    quitarCanal: vi.fn(),
  };

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();

    supabaseMock.getEstadoButacas.mockResolvedValue({ data: [], error: null });
    supabaseMock.bloquearButacas.mockResolvedValue({
      data: [{ ok: true, conflictos: null, expira_at: '2026-10-22T12:10:00.000Z' }],
      error: null,
    });
    supabaseMock.liberarBloqueos.mockResolvedValue({ data: null, error: null });
    supabaseMock.quitarCanal.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(ReservaButacasService);
  });

  it('genera un identificador de sesion estable para la pestana', () => {
    expect(service.sesionId).toMatch(UUID_REGEX);
    expect(sessionStorage.getItem('cine_butacas_sesion')).toBe(service.sesionId);
  });

  it('mapea el estado devuelto por Postgres', async () => {
    supabaseMock.getEstadoButacas.mockResolvedValue({
      data: [
        { codigo_butaca: 'A1', estado: 'vendida', propia: false, expira_at: null },
        { codigo_butaca: 'A2', estado: 'bloqueada', propia: false, expira_at: '2099-01-01T00:00:00.000Z' },
        { codigo_butaca: 'A3', estado: 'bloqueada', propia: true, expira_at: '2099-01-01T00:00:00.000Z' },
      ],
      error: null,
    });

    await expect(service.estado(5)).resolves.toEqual({
      vendidas: ['A1'],
      reservadas: ['A2'],
      propias: ['A3'],
    });

    expect(supabaseMock.getEstadoButacas).toHaveBeenCalledWith(5, service.sesionId);
  });

  it('propaga los errores de estado', async () => {
    supabaseMock.getEstadoButacas.mockResolvedValue({
      data: null,
      error: new Error('sin conexion'),
    });

    await expect(service.estado(5)).rejects.toThrow('sin conexion');
  });

  it('bloquea butacas y guarda la expiracion confirmada', async () => {
    const resultado = await service.bloquear(5, ['A1', 'A2']);

    expect(resultado).toEqual({
      ok: true,
      conflictos: [],
      expiraAt: '2026-10-22T12:10:00.000Z',
    });
    expect(service.expiraAt()).toBe('2026-10-22T12:10:00.000Z');
    expect(supabaseMock.bloquearButacas).toHaveBeenCalledWith(
      5,
      ['A1', 'A2'],
      service.sesionId,
      10
    );
  });

  it('devuelve los conflictos sin guardar expiracion', async () => {
    supabaseMock.bloquearButacas.mockResolvedValue({
      data: [{ ok: false, conflictos: ['A2'], expira_at: null }],
      error: null,
    });

    const resultado = await service.bloquear(5, ['A1', 'A2']);

    expect(resultado).toEqual({ ok: false, conflictos: ['A2'], expiraAt: null });
    expect(service.expiraAt()).toBeNull();
  });

  it('libera solo los bloqueos de esta sesion', async () => {
    await service.liberar(5);

    expect(supabaseMock.liberarBloqueos).toHaveBeenCalledWith(5, service.sesionId);
    expect(service.expiraAt()).toBeNull();
  });

  it('se suscribe a los cambios de la funcion y se desuscribe', () => {
    const canal = {
      on: vi.fn(),
      subscribe: vi.fn(),
    };
    canal.on.mockReturnValue(canal);
    canal.subscribe.mockReturnValue(canal);
    supabaseMock.crearCanal.mockReturnValue(canal);

    const alCambiar = vi.fn();
    const desuscribir = service.suscribir(7, alCambiar);

    expect(supabaseMock.crearCanal).toHaveBeenCalledWith('butacas-7');
    expect(canal.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'compra_butacas',
        filter: 'funcion_id=eq.7',
      }),
      expect.any(Function)
    );

    const manejador = canal.on.mock.calls[0][2] as () => void;
    manejador();
    expect(alCambiar).toHaveBeenCalledTimes(1);

    desuscribir();
    expect(supabaseMock.quitarCanal).toHaveBeenCalledWith(canal);
  });
});
