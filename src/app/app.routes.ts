import { Routes } from '@angular/router';

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
  { path: '**', redirectTo: 'main' },
];