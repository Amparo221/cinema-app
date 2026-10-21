import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { Login } from './login';
import { SessionService } from '../../services/session';
import { Profile } from '../../models/profile.model';

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

function crearSesion(usuario: Profile | null = null) {
  return {
    usuario: signal(usuario),
    login: vi.fn<(email: string, password: string) => Promise<string | null>>(),
  };
}

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let componente: Login;
  let router: Router;
  let sesion: ReturnType<typeof crearSesion>;

  beforeEach(async () => {
    sesion = crearSesion();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: SessionService, useValue: sesion }],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    componente = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('redirige al admin a /admin/general', async () => {
    sesion.usuario.set({ ...PERFIL, role: 'admin' });
    sesion.login.mockResolvedValue(null);
    componente.email = 'admin@cine.com';
    componente.password = 'secreta';

    await componente.onSubmit();

    expect(sesion.login).toHaveBeenCalledWith('admin@cine.com', 'secreta');
    expect(router.navigate).toHaveBeenCalledWith(['/admin/general']);
    expect(componente.cargando()).toBe(false);
  });

  it('redirige a los usuarios registrados a /main', async () => {
    sesion.usuario.set({ ...PERFIL, role: 'registrado' });
    sesion.login.mockResolvedValue(null);

    await componente.onSubmit();

    expect(router.navigate).toHaveBeenCalledWith(['/main']);
  });

  it('muestra un error si no se pudo cargar el perfil', async () => {
    sesion.usuario.set(null);
    sesion.login.mockResolvedValue(null);

    await componente.onSubmit();

    expect(componente.error()).toBe('No se pudo cargar tu perfil. Intentá nuevamente.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('no navega y muestra el error si las credenciales fallan', async () => {
    sesion.login.mockResolvedValue('Credenciales inválidas');

    await componente.onSubmit();

    expect(componente.error()).toBe('Credenciales inválidas');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(componente.cargando()).toBe(false);
  });
});
