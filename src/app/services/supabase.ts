import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Profile, RegistroMetadata } from '../models/profile.model';
import {
  NuevaPelicula,
  NuevoCombo,
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

  private readonly selectCombo = `
    id, nombre, descripcion, producto_1_id, producto_2_id,
    puntos, puntos_plus, activo,
    producto_1:productos_candy!combos_producto_1_id_fkey (
      id, nombre, descripcion, categoria, precio, imagen, stock
    ),
    producto_2:productos_candy!combos_producto_2_id_fkey (
      id, nombre, descripcion, categoria, precio, imagen, stock
    )
  `;

  async getCombosDisponibles() {
    return this.supabase
      .from('combos')
      .select(this.selectCombo)
      .eq('activo', true)
      .order('puntos');
  }

  /** Los combos no dependen de una película; se devuelve el catálogo activo. */
  async getCombosDePelicula(_peliculaId: number) {
    return this.getCombosDisponibles();
  }

  async getCombo(id: number) {
    return this.supabase
      .from('combos')
      .select(this.selectCombo)
      .eq('id', id)
      .single();
  }

  async getTodosLosCombos() {
    return this.supabase
      .from('combos')
      .select(this.selectCombo)
      .order('activo', { ascending: false })
      .order('puntos');
  }

  async crearCombo(datos: NuevoCombo) {
    return this.supabase
      .from('combos')
      .insert(datos)
      .select()
      .single();
  }

  async actualizarCombo(id: number, datos: Partial<NuevoCombo>) {
    return this.supabase
      .from('combos')
      .update(datos)
      .eq('id', id)
      .select()
      .single();
  }

  async cambiarActivoCombo(id: number, activo: boolean) {
    return this.supabase
      .from('combos')
      .update({ activo })
      .eq('id', id)
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

  /** RPC: estado de todas las butacas de una funcion. */
  async getEstadoButacas(funcionId: number, sesionId: string) {
    return this.supabase.rpc('estado_butacas', {
      p_funcion_id: funcionId,
      p_sesion_id: sesionId,
    });
  }

  /** RPC: bloquea o renueva las butacas de esta sesion. */
  async bloquearButacas(funcionId: number, codigos: string[], sesionId: string, minutos: number) {
    return this.supabase.rpc('bloquear_butacas', {
      p_funcion_id: funcionId,
      p_codigos: codigos,
      p_sesion_id: sesionId,
      p_minutos: minutos,
    });
  }

  /** RPC: libera todas las butacas de esta sesion. */
  async liberarBloqueos(funcionId: number, sesionId: string) {
    return this.supabase.rpc('liberar_bloqueos', {
      p_funcion_id: funcionId,
      p_sesion_id: sesionId,
    });
  }

  async getAsientosVendidosPorPelicula(): Promise<Map<number, number>> {
    const { data, error } = await this.supabase
      .from('compra_butacas')
      .select(`
        funciones!inner (pelicula_id),
        compras!inner (estado)
      `)
      .eq('estado', 'vendida')
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

  /**
   * RPC atomica: crea la compra y convierte los bloqueos en ventas.
   * Si una butaca dejo de estar disponible, Postgres hace rollback de todo.
   */
  async crearCompraConButacas(datos: {
    funcion_id: number;
    codigos: string[];
    sesion_id: string;
    cantidad_butacas: number;
    precio_butacas: number;
    precio_candy: number;
    descuento_primera_compra: number;
    descuento_cincuenta: number;
    creditos_usados: number;
    total: number;
    metodo_pago: string;
    combo_id?: number | null;
    carrito_extra?: { producto_id: number; cantidad: number }[];
    puntos_combo?: number;
  }) {
    return this.supabase.rpc('crear_compra_con_butacas', {
      p_funcion_id: datos.funcion_id,
      p_codigos: datos.codigos,
      p_sesion_id: datos.sesion_id,
      p_cantidad_butacas: datos.cantidad_butacas,
      p_precio_butacas: datos.precio_butacas,
      p_precio_candy: datos.precio_candy,
      p_descuento_primera_compra: datos.descuento_primera_compra,
      p_descuento_cincuenta: datos.descuento_cincuenta,
      p_creditos_usados: datos.creditos_usados,
      p_total: datos.total,
      p_metodo_pago: datos.metodo_pago,
      p_combo_id: datos.combo_id ?? null,
      p_carrito_extra: datos.carrito_extra ?? [],
      p_puntos_combo: datos.puntos_combo ?? 0,
    });
  }

  async actualizarPerfilTrasCompra(
    usuarioId: string,
    puntosTotales: number,
    creditosRestantes: number
  ) {
    return this.supabase
      .from('profiles')
      .update({
        puntos: puntosTotales,
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
    return this.supabase.rpc('cancelar_compra_liberando', { p_compra_id: compraId });
  }

  /** Abre un canal de Realtime; la pagina decide que escuchar. */
  crearCanal(nombre: string): RealtimeChannel {
    return this.supabase.channel(nombre);
  }

  async quitarCanal(canal: RealtimeChannel) {
    return this.supabase.removeChannel(canal);
  }

  get storage() {
    return this.supabase.storage;
  }

  async getCanjesDeUsuario(usuarioId: string) {
    return this.supabase
      .from('canjes')
      .select(`
        *,
        combos (nombre)
      `)
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
  }

  async getComprasDeUsuario(usuarioId: string) {
    return this.supabase
      .from('compras')
      .select(`
        id, total, estado, created_at, combo_nombre, combo_plus, puntos_usados,
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