import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import { RegistroMetadata } from '../../models/profile.model';
import { FechaInput } from '../../shared/fecha-input';
import { OpcionSelect, Select } from '../../shared/select/select';

/** Los ocho tipos de sangre que ofrece el select. */
export const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/** Colores de ojos que se eligen con un botón; `clase` pinta el punto. */
export const COLORES_OJOS = [
  { valor: 'Azul', clase: 'azul' },
  { valor: 'Verde', clase: 'verde' },
  { valor: 'Marrón', clase: 'marron' },
  { valor: 'Otro', clase: 'otro' },
];

/** Opción que abre el campo de texto libre. */
export const OTRO_COLOR = 'Otro';

/** Máximo de caracteres cuando se elige "Otro". */
export const MAXIMO_COLOR_PROPIO = 100;

export type OpcionColorOjos = (typeof COLORES_OJOS)[number]['valor'];

@Component({
  selector: 'app-registro',
  imports: [FormsModule, RouterLink, FechaInput, Select],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);
  private router = inject(Router);

  readonly tiposSangre = TIPOS_SANGRE;
  readonly opcionesSangre: readonly OpcionSelect[] = TIPOS_SANGRE.map(tipo => ({
    valor: tipo,
    etiqueta: tipo,
  }));
  readonly coloresOjos = COLORES_OJOS;
  readonly maximoColorPropio = MAXIMO_COLOR_PROPIO;

  email = '';
  password = '';
  nombre = '';
  apellido = '';
  fecha_nacimiento = '';
  tipo_sangre = '';
  color_ojos_opcion: OpcionColorOjos | '' = '';
  color_ojos_otro = '';
  dias_vacaciones = 0;

  error = signal<string | null>(null);
  cargando = signal(false);

  /** Lo que se guarda en el perfil: la opción elegida o el texto libre. */
  get color_ojos(): string {
    return this.color_ojos_opcion === OTRO_COLOR
      ? this.color_ojos_otro.trim()
      : this.color_ojos_opcion;
  }

  /** `true` si falta elegir el color o si eligió "Otro" sin escribirlo. */
  get faltaColorOjos(): boolean {
    if (!this.color_ojos_opcion) return true;

    return this.color_ojos_opcion === OTRO_COLOR && this.color_ojos_otro.trim() === '';
  }

  async onSubmit() {
    this.error.set(null);

    if (this.faltaColorOjos) {
      this.error.set(
        this.color_ojos_opcion === OTRO_COLOR
          ? 'Escribí cuál es el color de ojos.'
          : 'Elegí un color de ojos.',
      );
      return;
    }

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

    const errLogin = await this.session.login(this.email, this.password);
    this.cargando.set(false);

    if (errLogin) {
      this.error.set(errLogin);
      return;
    }

    this.router.navigate(['/main']);
  }
}