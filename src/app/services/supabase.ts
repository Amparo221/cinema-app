import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Profile, RegistroMetadata } from '../models/profile.model';
import {
  NuevaPelicula,
  NuevoProductoCandy,
  ResultadoSubida,
} from '../models/admin.model';

interface FilaAsientoVendido {
  funciones: { pelicula_id: number } | null;
  compras: { estado: string } | null;
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
  async getPelicula(id: number) {
    return this.supabase
      .from('peliculas')
      .select('*')
      .eq('id', id)
      .single();
  }

  async getTodasLasPeliculas() {
    return this.supabase
      .from('peliculas')
      .select('*')
      .order('nombre');
  }

  async crearPelicula(datos: NuevaPelicula) {
    return this.supabase
      .from('peliculas')
      .insert(datos)
      .select()
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

  async crearProductoCandy(datos: NuevoProductoCandy) {
    return this.supabase
      .from('productos_candy')
      .insert(datos)
      .select()
      .single();
  }

  async subirImagen(
    bucket: 'peliculas' | 'candy',
    archivo: File
  ): Promise<ResultadoSubida> {
    const nombreArchivo = `${this.generarIdArchivo()}.${this.extensionDe(archivo)}`;

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(nombreArchivo, archivo, {
        cacheControl: '3600',
        upsert: false,
        contentType: archivo.type || undefined,
      });

    if (error) return { nombreArchivo: null, error: error.message };
    return { nombreArchivo, error: null };
  }

  private extensionDe(archivo: File): string {
    const extension = archivo.name.split('.').pop()?.toLowerCase();
    if (extension && /^[a-z0-9]+$/.test(extension)) return extension;
    if (archivo.type === 'image/png') return 'png';
    if (archivo.type === 'image/webp') return 'webp';
    return 'jpg';
  }

  private generarIdArchivo(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  getPeliculaImageUrl(nombreArchivo: string | null): string {
    if (!nombreArchivo) return '';
    return this.supabase.storage.from('peliculas').getPublicUrl(nombreArchivo).data.publicUrl;
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

  async getAsientosVendidosPorPelicula(): Promise<Map<number, number>> {
    const { data, error } = await this.supabase
      .from('compra_butacas')
      .select(`
        funciones!inner (pelicula_id),
        compras!inner (estado)
      `)
      .neq('compras.estado', 'cancelada');

    if (error || !data) return new Map();

    const conteo = new Map<number, number>();
    for (const fila of data as unknown as FilaAsientoVendido[]) {
      const peliculaId = fila.funciones?.pelicula_id;
      if (typeof peliculaId === 'number') {
        conteo.set(peliculaId, (conteo.get(peliculaId) ?? 0) + 1);
      }
    }

    return conteo;
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
    metodo_pago: string;
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

  async getCompra(id: string) {
    return this.supabase
    .from('compras')
    .select(`
      *,
      funciones (
        fecha, hora,
        peliculas (nombre, duracion, imagen),
        salas (nombre)
      )
    `)
    .eq('id', id)
    .single();
}

  async cancelarCompra(compraId: string) {
    return this.supabase.rpc('cancelar_compra', { p_compra_id: compraId });
  }

  get storage() {
    return this.supabase.storage;
  }

  async getCanjesDeUsuario(usuarioId: string) {
  return this.supabase
    .from('canjes')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false });
}

async getComprasDeUsuario(usuarioId: string) {
  return this.supabase
    .from('compras')
    .select(`
      id, total, estado, created_at,
      funciones (fecha, hora, peliculas (nombre))
    `)
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false });
}

  async getResenasDeUsuario(usuarioId: string) {
    return this.supabase
      .from('resenas')
      .select(`
        id, usuario_id, pelicula_id, estrellas, comentario, created_at,
        peliculas (nombre, imagen)
      `)
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
  }

  async getPeliculasCompradasDeUsuario(usuarioId: string) {
    return this.supabase
      .from('compras')
      .select(`
        id, created_at, estado,
        funciones (peliculas (id, nombre, imagen))
      `)
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
  }
}