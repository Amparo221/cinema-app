import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SessionService } from '../../services/session';

export const authGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);

  // Al recargar la página el perfil todavía no está: esperamos el refresh.
  if (!session.sesionInicializada()) {
    await session.cargarSesion();
  }

  if (session.usuario()) return true;
  return router.createUrlTree(['/login']);
};