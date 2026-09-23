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

  async getProductosCandy() {
    return this.supabase
      .from('productos_candy')
      .select('*')
      .order('categoria')
      .order('nombre');
  }

  getCandyImageUrl(nombreArchivo: string | null): string {
    if (!nombreArchivo) return '';
    return this.supabase.storage.from('candy').getPublicUrl(nombreArchivo).data.publicUrl;
  }

  async getConfiguracion(): Promise<Record<string, number>> {
  const { data, error } = await this.supabase.from('configuracion').select('*');
  if (error || !data) return {};
  const config: Record<string, number> = {};
  for (const fila of data) config[fila.clave] = Number(fila.valor);
  return config;
}

  async getButacasOcupadas(funcionId: number): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('compra_butacas')
      .select('codigo_butaca')
      .eq('funcion_id', funcionId);
    if (error || !data) return [];
    return data.map(b => b.codigo_butaca);
  }

  async crearCompra(datos: {
    usuario_id: string | null;
    funcion_id: number;
    cantidad_butacas: number;
    precio_butacas: number;
    precio_candy: number;
    descuento_primera_compra: number;
    descuento_cincuenta: number;
    creditos_usados: number;
    total: number;
  }) {
    return this.supabase
      .from('compras')
      .insert(datos)
      .select()
      .single();
  }

  async crearCompraButacas(compraId: string, funcionId: number, codigos: string[]) {
    const filas = codigos.map(codigo => ({
      compra_id: compraId,
      funcion_id: funcionId,
      codigo_butaca: codigo,
    }));
    return this.supabase.from('compra_butacas').insert(filas);
  }

  async actualizarPerfilTrasCompra(
    usuarioId: string,
    puntosSumados: number,
    creditosRestantes: number
  ) {
    return this.supabase
      .from('profiles')
      .update({
        puntos: puntosSumados,
        creditos: creditosRestantes,
        primera_compra: false,
      })
      .eq('id', usuarioId);
  }

  from(table: string) {
    return this.supabase.from(table);
  }

  get storage() {
    return this.supabase.storage;
  }
}