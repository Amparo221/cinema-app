import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../services/session';
import { rutaInicial } from '../../core/permisos';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private session = inject(SessionService);
  private router = inject(Router);

  email = '';
  password = '';
  error = signal<string | null>(null);
  cargando = signal(false);

  async onSubmit() {
    this.error.set(null);
    this.cargando.set(true);
    const err = await this.session.login(this.email, this.password);
    this.cargando.set(false);
    if (err) {
      this.error.set(err);
      return;
    }

    const perfil = this.session.usuario();
    if (!perfil) {
      this.error.set('No se pudo cargar tu perfil. Intentá nuevamente.');
      return;
    }

    // El destino depende de las secciones que habilite su rol.
    const destino = rutaInicial(this.session.secciones());
    await this.router.navigate([destino]);
  }
}
