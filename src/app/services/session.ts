import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { Profile } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private supabase = inject(SupabaseService);
  private cargaEnCurso: Promise<void> | null = null;
  /** Cada carga tiene una versión para descartar respuestas viejas. */
  private versionCarga = 0;

  usuario = signal<Profile | null>(null);
  cargando = signal(true);
  /** Indica que ya se intentó restaurar la sesión al menos una vez. */
  sesionInicializada = signal(false);

  /**
   * Restaura la sesión una sola vez. Varios guards pueden llamarla en paralelo:
   * todos comparten la misma promesa y, una vez inicializada, no se repite.
   */
  cargarSesion(): Promise<void> {
    if (this.cargaEnCurso) return this.cargaEnCurso;
    if (this.sesionInicializada()) return Promise.resolve();
    return this.iniciarCarga();
  }

  /** Fuerza una nueva lectura; se usa después del login. */
  recargarSesion(): Promise<void> {
    return this.iniciarCarga();
  }

  private iniciarCarga(): Promise<void> {
    const version = ++this.versionCarga;
    const carga = this.cargarSesionInterna(version).finally(() => {
      if (version !== this.versionCarga) return;
      this.cargaEnCurso = null;
      this.sesionInicializada.set(true);
    });
    this.cargaEnCurso = carga;
    return carga;
  }

  private async cargarSesionInterna(version: number): Promise<void> {
    this.cargando.set(true);
    try {
      const { data } = await this.supabase.getSession();
      if (version !== this.versionCarga) return;

      if (data.session?.user) {
        const perfil = await this.supabase.getProfile(data.session.user.id);
        if (version !== this.versionCarga) return;
        this.usuario.set(perfil);
      } else {
        this.usuario.set(null);
      }
    } catch {
      if (version === this.versionCarga) this.usuario.set(null);
    } finally {
      if (version === this.versionCarga) this.cargando.set(false);
    }
  }

  async login(email: string, password: string): Promise<string | null> {
    const { error } = await this.supabase.signIn(email, password);
    if (error) return error.message;
    await this.recargarSesion();
    return null;
  }

  async logout() {
    await this.supabase.signOut();
    this.invalidarSesion();
  }

  /** Invalida la carga actual y cualquier respuesta que llegue tarde. */
  private invalidarSesion() {
    this.versionCarga++;
    this.cargaEnCurso = null;
    this.usuario.set(null);
    this.cargando.set(false);
    this.sesionInicializada.set(false);
  }
}