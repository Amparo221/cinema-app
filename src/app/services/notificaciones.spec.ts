import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Notificacion } from '../models/notificacion.model';
import { Profile } from '../models/profile.model';
import { NotificacionesService } from './notificaciones';
import { SessionService } from './session';
import { SupabaseService } from './supabase';

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

function notificacion(datos: Partial<Notificacion> = {}): Notificacion {
  return {
    id: 1,
    usuario_id: 'usuario-1',
    pelicula_id: 15,
    tipo: 'preventa_disponible',
    titulo: 'Preventa abierta: heidi',
    mensaje: 'Ya podés comprar entradas anticipadas.',
    leida: false,
    created_at: '2026-11-15T12:00:00Z',
    ...datos,
  };
}

function crearSupabase() {
  return {
    generarNotificacionesPreventa: vi.fn().mockResolvedValue({ data: 0, error: null }),
    getNotificaciones: vi.fn().mockResolvedValue({ data: [], error: null }),
    getSuscripcionesPreventa: vi.fn().mockResolvedValue({ data: [], error: null }),
    suscribirPreventa: vi.fn().mockResolvedValue({ error: null }),
    cancelarSuscripcionPreventa: vi.fn().mockResolvedValue({ error: null }),
    marcarNotificacionLeida: vi.fn().mockResolvedValue({ error: null }),
    marcarTodasNotificacionesLeidas: vi.fn().mockResolvedValue({ error: null }),
  };
}

describe('NotificacionesService', () => {
  let supabase: ReturnType<typeof crearSupabase>;
  let session: { usuario: ReturnType<typeof signal<Profile | null>> };
  let servicio: NotificacionesService;
  let suscripcionesServidor: number[];

  beforeEach(() => {
    vi.clearAllMocks();
    suscripcionesServidor = [];
    supabase = crearSupabase();
    session = { usuario: signal<Profile | null>(null) };

    // El mock imita al servidor: la suscripción persiste entre llamadas.
    supabase.getSuscripcionesPreventa.mockImplementation(async () => ({
      data: suscripcionesServidor.map(pelicula_id => ({ pelicula_id })),
      error: null,
    }));
    supabase.suscribirPreventa.mockImplementation(async (peliculaId: number) => {
      suscripcionesServidor.push(peliculaId);
      return { error: null };
    });
    supabase.cancelarSuscripcionPreventa.mockImplementation(async (peliculaId: number) => {
      suscripcionesServidor = suscripcionesServidor.filter(id => id !== peliculaId);
      return { error: null };
    });

    TestBed.configureTestingModule({
      providers: [
        NotificacionesService,
        { provide: SupabaseService, useValue: supabase },
        { provide: SessionService, useValue: session },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    servicio = TestBed.inject(NotificacionesService);
  });

  afterEach(() => TestBed.resetTestingModule());


  it('carga notificaciones y suscripciones del usuario', async () => {
    session.usuario.set(PERFIL);
    suscripcionesServidor = [15];
    supabase.getNotificaciones.mockResolvedValue({
      data: [notificacion()],
      error: null,
    });

    await servicio.refrescar();

    expect(supabase.generarNotificacionesPreventa).toHaveBeenCalled();
    expect(supabase.getNotificaciones).toHaveBeenCalledWith('usuario-1');
    expect(servicio.notificaciones()).toHaveLength(1);
    expect(servicio.noLeidas()).toBe(1);
    expect(servicio.estaSuscrita(15)).toBe(true);
    expect(servicio.cargando()).toBe(false);
  });

  it('no consulta nada si no hay sesión', async () => {
    await servicio.refrescar();

    expect(supabase.getNotificaciones).not.toHaveBeenCalled();
    expect(supabase.generarNotificacionesPreventa).not.toHaveBeenCalled();
    expect(servicio.notificaciones()).toEqual([]);
    expect(servicio.noLeidas()).toBe(0);
  });

  it('sigue y deja de seguir una preventa', async () => {
    session.usuario.set(PERFIL);

    const suscrito = await servicio.alternarSuscripcion(15);

    expect(suscrito).toBe(true);
    expect(supabase.suscribirPreventa).toHaveBeenCalledWith(15);
    expect(servicio.estaSuscrita(15)).toBe(true);

    const cancelado = await servicio.alternarSuscripcion(15);

    expect(cancelado).toBe(true);
    expect(supabase.cancelarSuscripcionPreventa).toHaveBeenCalledWith(15);
    expect(servicio.estaSuscrita(15)).toBe(false);
  });

  it('no permite suscribirse sin sesión', async () => {
    const ok = await servicio.alternarSuscripcion(15);

    expect(ok).toBe(false);
    expect(supabase.suscribirPreventa).not.toHaveBeenCalled();
    expect(servicio.error()).toContain('Iniciá sesión');
  });

  it('informa cuando la película ya no está disponible', async () => {
    session.usuario.set(PERFIL);
    supabase.suscribirPreventa.mockResolvedValue({
      error: { message: 'PELICULA_NO_DISPONIBLE' },
    });

    const ok = await servicio.alternarSuscripcion(15);

    expect(ok).toBe(false);
    expect(servicio.estaSuscrita(15)).toBe(false);
    expect(servicio.error()).toContain('ya no está disponible');
  });

  it('marca una notificación como leída', async () => {
    session.usuario.set(PERFIL);
    servicio.notificaciones.set([notificacion(), notificacion({ id: 2, leida: true })]);

    await servicio.marcarLeida(1);

    expect(supabase.marcarNotificacionLeida).toHaveBeenCalledWith(1);
    expect(servicio.notificaciones()[0].leida).toBe(true);
    expect(servicio.noLeidas()).toBe(0);
  });

  it('marca todas las notificaciones como leídas', async () => {
    session.usuario.set(PERFIL);
    servicio.notificaciones.set([notificacion(), notificacion({ id: 2 })]);

    await servicio.marcarTodasLeidas();

    expect(supabase.marcarTodasNotificacionesLeidas).toHaveBeenCalled();
    expect(servicio.notificaciones().every(n => n.leida)).toBe(true);
    expect(servicio.noLeidas()).toBe(0);
  });

  it('deja la bandeja vacía si la consulta falla', async () => {
    session.usuario.set(PERFIL);
    supabase.getNotificaciones.mockResolvedValue({
      data: null,
      error: { message: 'relation does not exist' },
    });

    await servicio.refrescar();

    expect(servicio.notificaciones()).toEqual([]);
    expect(servicio.error()).toContain('No pudimos cargar');
  });
});
