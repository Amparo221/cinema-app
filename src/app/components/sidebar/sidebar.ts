import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../services/session';
import { Rol } from '../../models/rol.model';

interface MenuItem {
  label: string;
  ruta: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  @Input() rol: Rol = 'anonimo';

  private session = inject(SessionService);
  private router = inject(Router);

  get items(): MenuItem[] {
    switch (this.rol) {
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
        return [
          { label: 'General', ruta: '/admin/general' },
          { label: 'Escáner', ruta: '/admin/escaner' },
          { label: 'Reporte', ruta: '/admin/reporte' },
          { label: 'Log', ruta: '/admin/log' },
        ];
    }
  }

  async cerrarSesion() {
    await this.session.logout();
    this.router.navigate(['/main']);
  }
}