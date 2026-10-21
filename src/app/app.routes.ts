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
        loadComponent: () =>
          import('./pages/admin/en-construccion/en-construccion').then(m => m.AdminEnConstruccion),
        data: {
          titulo: 'Escáner',
          descripcion: 'Validación de entradas y pedidos del candy bar.',
        },
      },
      {
        path: 'reporte',
        canActivate: [adminGuard('reporte')],
        loadComponent: () =>
          import('./pages/admin/en-construccion/en-construccion').then(m => m.AdminEnConstruccion),
        data: {
          titulo: 'Reporte',
          descripcion: 'Reportes de ventas, ocupación y películas más vistas.',
        },
      },
      {
        path: 'log',
        canActivate: [adminGuard('log')],
        loadComponent: () =>
          import('./pages/admin/en-construccion/en-construccion').then(m => m.AdminEnConstruccion),
        data: {
          titulo: 'Log',
          descripcion: 'Registro de acciones y eventos del sistema.',
        },
      },
    ],
  },
  {
    path: 'escaner',
    canActivate: [adminGuard('escaner')],
    loadComponent: () =>
      import('./pages/admin/en-construccion/en-construccion').then(m => m.AdminEnConstruccion),
    data: {
      titulo: 'Escáner',
      descripcion: 'Validación de entradas y pedidos del candy bar.',
    },
  },
  { path: '**', redirectTo: 'main' },
];