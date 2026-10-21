import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SessionService } from './session';
import { SupabaseService } from './supabase';
import { Profile } from '../models/profile.model';

const PERFIL: Profile = {
  id: 'usuario-1',
  email: 'admin@cine.com',
  nombre: 'Ada',
  apellido: 'Lovelace',
  fecha_nacimiento: '1990-01-01',
  tipo_sangre: 'O+',
  color_ojos: 'marrón',
  dias_vacaciones: 0,
  puntos: 0,
  creditos: 0,
  primera_compra: true,
  role: 'admin',
};

function crearSupabase() {
  return {
    getSession: vi.fn(),
    getProfile: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
}

function sesionDe(id: string) {
  return { data: { session: { user: { id } } } };
}

function sinSesion() {
  return { data: { session: null } };
}

function diferido<T>() {
  let resolver!: (valor: T) => void;
  const promesa = new Promise<T>(resolverPromesa => {
    resolver = resolverPromesa;
  });
  return { promesa, resolver };
}

describe('SessionService', () => {
  let supabase: ReturnType<typeof crearSupabase>;
  let servicio: SessionService;

  beforeEach(() => {
    supabase = crearSupabase();

    TestBed.configureTestingModule({
      providers: [SessionService, { provide: SupabaseService, useValue: supabase }],
    });

    servicio = TestBed.inject(SessionService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('comparte una sola carga entre llamadas concurrentes', async () => {
    supabase.getSession.mockResolvedValue(sesionDe('usuario-1'));
    supabase.getProfile.mockResolvedValue(PERFIL);

    await Promise.all([servicio.cargarSesion(), servicio.cargarSesion()]);

    expect(supabase.getSession).toHaveBeenCalledTimes(1);
    expect(supabase.getProfile).toHaveBeenCalledWith('usuario-1');
    expect(servicio.usuario()).toEqual(PERFIL);
    expect(servicio.sesionInicializada()).toBe(true);
  });

  it('no vuelve a consultar la sesión una vez inicializada', async () => {
    supabase.getSession.mockResolvedValue(sinSesion());

    await servicio.cargarSesion();
    await servicio.cargarSesion();

    expect(supabase.getSession).toHaveBeenCalledTimes(1);
  });

  it('recargarSesion fuerza una nueva consulta', async () => {
    supabase.getSession.mockResolvedValue(sinSesion());

    await servicio.cargarSesion();
    await servicio.recargarSesion();

    expect(supabase.getSession).toHaveBeenCalledTimes(2);
  });

  it('login recarga el perfil después de autenticar', async () => {
    supabase.signIn.mockResolvedValue({ error: null });
    supabase.getSession.mockResolvedValue(sesionDe('usuario-1'));
    supabase.getProfile.mockResolvedValue(PERFIL);

    const error = await servicio.login('admin@cine.com', 'secreta');

    expect(error).toBeNull();
    expect(supabase.signIn).toHaveBeenCalledWith('admin@cine.com', 'secreta');
    expect(supabase.getSession).toHaveBeenCalledTimes(1);
    expect(servicio.usuario()).toEqual(PERFIL);
  });

  it('login devuelve el error y no carga la sesión si falla', async () => {
    supabase.signIn.mockResolvedValue({ error: { message: 'Credenciales inválidas' } });

    const error = await servicio.login('admin@cine.com', 'incorrecta');

    expect(error).toBe('Credenciales inválidas');
    expect(supabase.getSession).not.toHaveBeenCalled();
  });

  it('logout limpia la sesión y permite volver a cargarla', async () => {
    supabase.getSession.mockResolvedValue(sesionDe('usuario-1'));
    supabase.getProfile.mockResolvedValue(PERFIL);
    supabase.signOut.mockResolvedValue({ error: null });

    await servicio.cargarSesion();
    await servicio.logout();

    expect(servicio.usuario()).toBeNull();
    expect(servicio.sesionInicializada()).toBe(false);

    supabase.getSession.mockResolvedValue(sinSesion());
    await servicio.cargarSesion();

    expect(supabase.getSession).toHaveBeenCalledTimes(2);
    expect(servicio.usuario()).toBeNull();
  });

  it('descarta una carga vieja si se recarga la sesión', async () => {
    const cargaVieja = diferido<ReturnType<typeof sesionDe>>();
    supabase.getSession
      .mockReturnValueOnce(cargaVieja.promesa)
      .mockResolvedValueOnce(sesionDe('usuario-nuevo'));
    supabase.getProfile.mockImplementation(async (id: string) => ({ ...PERFIL, id }));

    const viejaEnCurso = servicio.cargarSesion();
    await servicio.recargarSesion();

    expect(servicio.usuario()?.id).toBe('usuario-nuevo');

    cargaVieja.resolver(sesionDe('usuario-viejo'));
    await viejaEnCurso;

    expect(servicio.usuario()?.id).toBe('usuario-nuevo');
    expect(servicio.cargando()).toBe(false);
  });
});
