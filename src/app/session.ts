import { Injectable, signal, inject } from '@angular/core';
import { Profile, SupabaseService } from './supabase';

export type Rol = 'anonimo' | 'registrado' | 'admin' | 'empleado';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private supabase = inject(SupabaseService);

  usuario = signal<Profile | null>(null);
  cargando = signal(true);

  async cargarSesion() {
    this.cargando.set(true);
    const { data } = await this.supabase.getSession();
    if (data.session?.user) {
      const perfil = await this.supabase.getProfile(data.session.user.id);
      this.usuario.set(perfil);
    } else {
      this.usuario.set(null);
    }
    this.cargando.set(false);
  }

  async login(email: string, password: string): Promise<string | null> {
    const { error } = await this.supabase.signIn(email, password);
    if (error) return error.message;
    await this.cargarSesion();
    return null;
  }

  async logout() {
    await this.supabase.signOut();
    this.usuario.set(null);
  }
}