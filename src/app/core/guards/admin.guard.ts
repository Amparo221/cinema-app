import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SeccionAdmin, tienePermiso } from '../permisos';
import { SessionService } from '../../services/session';

/**
 * Guard por sección: cada ruta de admin declara qué permiso necesita.
 * Así, cuando los permisos pasen a la base de datos, cada sección puede
 * habilitarse o restringirse de forma independiente.
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

    if (tienePermiso(usuario.role, seccion)) {
      return true;
    }

    return router.createUrlTree(['/main']);
  };
}
