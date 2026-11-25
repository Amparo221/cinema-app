import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

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
  {
    path: 'mis-peliculas',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/mis-peliculas/mis-peliculas').then(m => m.MisPeliculas),
  },
  {
    path: 'propuestas',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/propuestas/propuestas').then(m => m.Propuestas),
  },
  {
    path: 'admin',
    children: [
      { path: '', redirectTo: 'general', pathMatch: 'full' },
      {
        path: 'general',
        canActivate: [adminGuard('general')],
        loadComponent: () => import('./pages/admin/general/general').then(m => m.AdminGeneral),
      },
      {
        path: 'escaner',
        canActivate: [adminGuard('escaner')],
        loadComponent: () => import('./pages/escaner/escaner').then(m => m.Escaner),
      },
      {
        path: 'reporte',
        canActivate: [adminGuard('reporte')],
        loadComponent: () => import('./pages/admin/reporte/reporte').then(m => m.AdminReporte),
      },
      {
        path: 'log',
        canActivate: [adminGuard('log')],
        loadComponent: () => import('./pages/admin/log/log').then(m => m.AdminLog),
      },
      {
        path: 'propuestas',
        canActivate: [adminGuard('propuestas')],
        loadComponent: () =>
          import('./pages/admin/propuestas/propuestas').then(m => m.AdminPropuestas),
      },
      {
        path: 'roles',
        canActivate: [adminGuard('roles')],
        loadComponent: () => import('./pages/admin/roles/roles').then(m => m.AdminRoles),
      },
    ],
  },
  {
    path: 'escaner',
    canActivate: [adminGuard('escaner')],
    loadComponent: () => import('./pages/escaner/escaner').then(m => m.Escaner),
  },
  { path: '**', redirectTo: 'main' },
];