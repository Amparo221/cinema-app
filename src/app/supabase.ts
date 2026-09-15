import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

export interface Profile {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number;
  puntos: number;
  creditos: number;
  primera_compra: boolean;
  role: 'registrado' | 'admin' | 'empleado';
}

export interface RegistroMetadata {
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabasePublishableKey
    );
  }

  async signUp(email: string, password: string, metadata: RegistroMetadata) {
    return this.supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
  }

  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  async getSession() {
    return this.supabase.auth.getSession();
  }

  async getUser(): Promise<User | null> {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) return null;
    return data.user;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data as Profile;
  }
}