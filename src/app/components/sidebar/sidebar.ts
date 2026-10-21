import { Component, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../services/session';
import { Rol } from '../../models/rol.model';
import { SeccionAdmin, tienePermiso } from '../../core/permisos';

interface MenuItem {
  label: string;
  ruta: string;
}

interface MenuItemAdmin extends MenuItem {
  seccion: SeccionAdmin;
}

const ITEMS_ADMIN: readonly MenuItemAdmin[] = [
  { label: 'General', ruta: '/admin/general', seccion: 'general' },
  { label: 'Escáner', ruta: '/admin/escaner', seccion: 'escaner' },
  { label: 'Reporte', ruta: '/admin/reporte', seccion: 'reporte' },
  { label: 'Log', ruta: '/admin/log', seccion: 'log' },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  rol = input<Rol>('anonimo');

  private session = inject(SessionService);
  private router = inject(Router);

  get items(): MenuItem[] {
    const rol = this.rol();
    switch (rol) {
      case 'anonimo':
        return [
          { label: 'Main', ruta: '/main' },
          { label: 'Iniciar sesión', ruta: '/login' },
          { label: 'Registrarse', ruta: '/registro' },
        ];
      case 'registrado':
        return [
          { label: 'Main', ruta: '/main' },
          { label: 'Mis películas', ruta: '/mis-peliculas' },
          { label: 'Perfil', ruta: '/perfil' },
        ];
      case 'empleado':
        return [
          { label: 'Main', ruta: '/main' },
          { label: 'Escáner', ruta: '/escaner' },
        ];
      case 'admin':
        return ITEMS_ADMIN
          .filter(item => tienePermiso(rol, item.seccion))
          .map(({ label, ruta }) => ({ label, ruta }));
    }
  }

  async cerrarSesion() {
    await this.session.logout();
    this.router.navigate(['/main']);
  }
}