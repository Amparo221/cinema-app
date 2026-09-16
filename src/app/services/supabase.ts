import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Profile, RegistroMetadata } from '../models/profile.model';

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
  async getPelicula(id: number) {
    return this.supabase
      .from('peliculas')
      .select('*')
      .eq('id', id)
      .single();
  }

  async getFuncionesDePelicula(peliculaId: number) {
    return this.supabase
      .from('funciones')
      .select(`
      id, pelicula_id, sala_id, fecha, hora, formato, idioma,
      salas (nombre)
    `)
      .eq('pelicula_id', peliculaId)
      .gte('fecha', new Date().toISOString().split('T')[0])
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });
  }

  async getResenasDePelicula(peliculaId: number) {
    return this.supabase
      .from('resenas')
      .select(`
      id, usuario_id, pelicula_id, estrellas, comentario, created_at,
      profiles (nombre, apellido)
    `)
      .eq('pelicula_id', peliculaId)
      .order('created_at', { ascending: false });
  }

  async crearResena(usuarioId: string, peliculaId: number, estrellas: number, comentario: string) {
    return this.supabase
      .from('resenas')
      .insert({ usuario_id: usuarioId, pelicula_id: peliculaId, estrellas, comentario })
      .select()
      .single();
  }

  from(table: string) {
    return this.supabase.from(table);
  }

  get storage() {
    return this.supabase.storage;
  }
}