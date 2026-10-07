import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'main', pathMatch: 'full' },
  {
    path: 'main',
    loadComponent: () => import('./pages/main/main').then(m => m.Main),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then(m => m.Registro),
  },
  {
    path: 'pelicula/:id',
    loadComponent: () => import('./pages/pelicula/pelicula').then(m => m.PeliculaPage),
  },
  {
    path: 'compra/:id',
    loadComponent: () => import('./pages/compra/compra').then(m => m.Compra),
  },
  {
  path: 'recibo/:id',
  loadComponent: () => import('./pages/recibo/recibo').then(m => m.Recibo),
  },
  {
  path: 'pago',
  loadComponent: () => import('./pages/pago/pago').then(m => m.Pago),
  },
  {
  path: 'perfil',
  canActivate: [authGuard],
  loadComponent: () => import('./pages/perfil/perfil').then(m => m.Perfil),
  },
  { path: '**', redirectTo: 'main' },
];