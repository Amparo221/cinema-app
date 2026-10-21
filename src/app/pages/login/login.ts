import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../services/session';

@Component({
  selector: 'app-login',
  standalone: true,
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

    const destino = perfil.role === 'admin' ? '/admin/general' : '/main';
    await this.router.navigate([destino]);
  }
}