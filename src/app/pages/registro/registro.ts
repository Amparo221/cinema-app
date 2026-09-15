import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService, RegistroMetadata } from '../../supabase';
import { SessionService } from '../../session';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);
  private router = inject(Router);

  email = '';
  password = '';
  nombre = '';
  apellido = '';
  fecha_nacimiento = '';
  tipo_sangre = '';
  color_ojos = '';
  dias_vacaciones = 0;

  error = signal<string | null>(null);
  cargando = signal(false);

  async onSubmit() {
    this.error.set(null);
    this.cargando.set(true);

    const metadata: RegistroMetadata = {
      nombre: this.nombre,
      apellido: this.apellido,
      fecha_nacimiento: this.fecha_nacimiento,
      tipo_sangre: this.tipo_sangre,
      color_ojos: this.color_ojos,
      dias_vacaciones: this.dias_vacaciones,
    };

    const { error } = await this.supabase.signUp(this.email, this.password, metadata);

    if (error) {
      this.error.set(error.message);
      this.cargando.set(false);
      return;
    }

    // Login automático después del registro
    const errLogin = await this.session.login(this.email, this.password);
    this.cargando.set(false);

    if (errLogin) {
      this.error.set(errLogin);
      return;
    }

    this.router.navigate(['/main']);
  }
}