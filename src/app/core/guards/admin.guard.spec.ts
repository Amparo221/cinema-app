import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { adminGuard } from './admin.guard';
import { SeccionAdmin } from '../permisos';
import { SessionService } from '../../services/session';
import { Profile } from '../../models/profile.model';

const PERFIL_BASE: Profile = {
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

function crearSesion(usuario: Profile | null, inicializada = true) {
  return {
    usuario: signal(usuario),
    sesionInicializada: signal(inicializada),
    cargarSesion: vi.fn(async () => undefined),
  };
}

function configurar(sesion: ReturnType<typeof crearSesion>) {
  const router = {
    createUrlTree: vi.fn((commands: unknown[]) => ({ commands })),
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: SessionService, useValue: sesion },
      { provide: Router, useValue: router },
    ],
  });

  return router;
}

function ejecutar(seccion: SeccionAdmin = 'general') {
  return TestBed.runInInjectionContext(() =>
    adminGuard(seccion)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
  );
}

describe('adminGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('permite el acceso del admin a la sección general', async () => {
    configurar(crearSesion(PERFIL_BASE));

    expect(await ejecutar()).toBe(true);
  });

  it('permite al empleado solo las secciones habilitadas', async () => {
    configurar(crearSesion({ ...PERFIL_BASE, role: 'empleado' }));

    expect(await ejecutar('escaner')).toBe(true);
    expect(await ejecutar('general')).toEqual({ commands: ['/main'] });
  });

  it('redirige al login si no hay sesión', async () => {
    configurar(crearSesion(null));

    expect(await ejecutar()).toEqual({ commands: ['/login'] });
  });

  it('espera a que se inicialice la sesión antes de decidir', async () => {
    const sesion = crearSesion(null, false);
    configurar(sesion);

    await ejecutar();

    expect(sesion.cargarSesion).toHaveBeenCalledTimes(1);
  });
});
