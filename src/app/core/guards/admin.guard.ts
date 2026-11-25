import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SeccionAdmin, tienePermiso } from '../permisos';
import { SessionService } from '../../services/session';

/**
 * Guard por sección: cada ruta de admin declara qué permiso necesita.
 * Las secciones salen de `public.roles` (las carga SessionService), así
 * que un rol propio puede habilitar o restringir cada pantalla.
 */
export function adminGuard(seccion: SeccionAdmin): CanActivateFn {
  return async () => {
    const session = inject(SessionService);
    const router = inject(Router);

    if (!session.sesionInicializada()) {
      await session.cargarSesion();
    }

    const usuario = session.usuario();
    if (!usuario) {
      return router.createUrlTree(['/login']);
    }

    if (tienePermiso(session.secciones(), seccion)) {
      return true;
    }

    return router.createUrlTree(['/main']);
  };
}

