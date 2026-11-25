import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import {
  ErroresPropuesta,
  LIMITES_PROPUESTA,
  Propuesta,
  etiquetaEstadoPropuesta,
  hayErrores,
  mensajeErrorPropuesta,
  validarPropuesta,
} from '../../models/propuesta.model';

/**
 * Propuestas de películas del cliente.
 *
 * Solo se puede tener una propuesta pendiente a la vez (lo garantiza un
 * índice único en la base). Cuando el admin la resuelve, el aviso llega
 * por la campanita.
 */
@Component({
  selector: 'app-propuestas',
  imports: [FormsModule, RouterLink],
  templateUrl: './propuestas.html',
  styleUrl: './propuestas.css',
})
export class Propuestas implements OnInit {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);

  usuario = this.session.usuario;

  propuestas = signal<Propuesta[]>([]);
  cargando = signal(true);
  enviando = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  errores = signal<ErroresPropuesta>({});

  titulo = '';
  descripcion = '';
  motivo = '';

  readonly limites = LIMITES_PROPUESTA;
  readonly etiquetaEstado = etiquetaEstadoPropuesta;

  /** Propuesta que todavía está esperando respuesta. */
  readonly pendiente = computed(
    () => this.propuestas().find(propuesta => propuesta.estado === 'pendiente') ?? null,
  );

  async ngOnInit(): Promise<void> {
    const usuario = this.usuario();
    if (!usuario) {
      this.cargando.set(false);
      return;
    }
    await this.cargar(usuario.id);
  }

  async enviar(): Promise<void> {
    const usuario = this.usuario();
    if (!usuario || this.enviando()) return;

    const datos = {
      titulo: this.titulo,
      descripcion: this.descripcion,
      motivo: this.motivo,
    };
    const errores = validarPropuesta(datos);
    this.errores.set(errores);

    if (hayErrores(errores)) {
      this.error.set('Revisá los campos marcados.');
      return;
    }

    if (this.pendiente()) {
      this.error.set('Ya tenés una propuesta pendiente. Esperá la respuesta.');
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    const { error } = await this.supabase.crearPropuesta({
      usuario_id: usuario.id,
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      motivo: datos.motivo.trim(),
    });

    this.enviando.set(false);

    if (error) {
      this.error.set(mensajeErrorPropuesta(error.message));
      return;
    }

    this.titulo = '';
    this.descripcion = '';
    this.motivo = '';
    this.errores.set({});
    this.mensaje.set('¡Gracias! Tu propuesta quedó en revisión.');
    await this.cargar(usuario.id);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private async cargar(usuarioId: string): Promise<void> {
    this.cargando.set(true);
    const { data, error } = await this.supabase.getMisPropuestas(usuarioId);
    this.cargando.set(false);

    if (error) {
      this.error.set(mensajeErrorPropuesta(error.message));
      this.propuestas.set([]);
      return;
    }

    this.propuestas.set((data ?? []) as Propuesta[]);
  }
}
