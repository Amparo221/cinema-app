import {
  PLATFORM_ID,
  Service,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase';
import { SessionService } from './session';
import { Notificacion } from '../models/notificacion.model';

/** Cada cuánto se revisan notificaciones nuevas mientras hay sesión. */
export const INTERVALO_REFRESCO_MS = 60_000;

interface ErrorSupabase {
  message?: string;
  code?: string;
}

/**
 * Bandeja de la campanita y suscripciones de preventa.
 *
 * Las notificaciones no las empuja el servidor: se generan al abrir la
 * campanita o al refrescar (RPC `generar_notificaciones_preventa`).
 */
@Service()
export class NotificacionesService {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);
  private platformId = inject(PLATFORM_ID);

  readonly notificaciones = signal<Notificacion[]>([]);
  readonly suscripciones = signal<ReadonlySet<number>>(new Set());
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly noLeidas = computed(
    () => this.notificaciones().filter(notificacion => !notificacion.leida).length
  );

  /** Descarta respuestas viejas si el usuario cambia mientras carga. */
  private version = 0;
  private cargaEnCurso: Promise<void> | null = null;
  private intervalo: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const usuario = this.session.usuario();
      if (!usuario) {
        this.detenerRefresco();
        this.limpiar();
        return;
      }
      void this.refrescar();
      this.iniciarRefresco();
    });
  }

  /** Vuelve a pedir notificaciones y suscripciones. */
  async refrescar(): Promise<void> {
    const usuario = this.session.usuario();
    if (!usuario) {
      this.limpiar();
      return;
    }

    if (this.cargaEnCurso) return this.cargaEnCurso;

    const version = ++this.version;
    const carga = this.cargar(usuario.id, version).finally(() => {
      if (version === this.version) this.cargaEnCurso = null;
    });

    this.cargaEnCurso = carga;
    return carga;
  }

  private async cargar(usuarioId: string, version: number): Promise<void> {
    this.cargando.set(true);

    try {
      // La RPC es idempotente: si ya existe la notificación, no la duplica.
      try {
        await this.supabase.generarNotificacionesPreventa();
      } catch {
        // Sin la migración aplicada seguimos mostrando la bandeja vacía.
      }

      const [notificacionesRes, suscripcionesRes] = await Promise.all([
        this.supabase.getNotificaciones(usuarioId),
        this.supabase.getSuscripcionesPreventa(usuarioId),
      ]);

      if (version !== this.version) return;

      if (notificacionesRes.error) {
        this.notificaciones.set([]);
        this.error.set('No pudimos cargar tus notificaciones.');
      } else {
        this.notificaciones.set((notificacionesRes.data ?? []) as Notificacion[]);
        this.error.set(null);
      }

      if (suscripcionesRes.error) {
        this.suscripciones.set(new Set());
      } else {
        const filas = (suscripcionesRes.data ?? []) as { pelicula_id: number | string }[];
        this.suscripciones.set(
          new Set(filas.map(fila => Number(fila.pelicula_id)).filter(Number.isFinite))
        );
      }
    } catch {
      if (version === this.version) {
        this.notificaciones.set([]);
        this.suscripciones.set(new Set());
        this.error.set('No pudimos cargar tus notificaciones.');
      }
    } finally {
      if (version === this.version) this.cargando.set(false);
    }
  }

  estaSuscrita(peliculaId: number): boolean {
    return this.suscripciones().has(peliculaId);
  }

  /** Alterna "avisame" y devuelve el estado final. */
  async alternarSuscripcion(peliculaId: number): Promise<boolean> {
    const usuario = this.session.usuario();
    if (!usuario) {
      this.error.set('Iniciá sesión para que te avisemos.');
      return false;
    }

    const estabaSuscrita = this.estaSuscrita(peliculaId);
    this.error.set(null);

    const { error } = estabaSuscrita
      ? await this.supabase.cancelarSuscripcionPreventa(peliculaId)
      : await this.supabase.suscribirPreventa(peliculaId);

    if (error) {
      this.error.set(this.mensajeDeError(error));
      return false;
    }

    this.suscripciones.update(actual => {
      const nuevo = new Set(actual);
      if (estabaSuscrita) {
        nuevo.delete(peliculaId);
      } else {
        nuevo.add(peliculaId);
      }
      return nuevo;
    });

    if (!estabaSuscrita) await this.refrescar();

    return true;
  }

  async marcarLeida(id: number): Promise<void> {
    if (!this.session.usuario()) return;

    const { error } = await this.supabase.marcarNotificacionLeida(id);
    if (error) {
      this.error.set('No pudimos marcar la notificación como leída.');
      return;
    }

    this.notificaciones.update(lista =>
      lista.map(notificacion =>
        notificacion.id === id ? { ...notificacion, leida: true } : notificacion
      )
    );
  }

  async marcarTodasLeidas(): Promise<void> {
    if (!this.session.usuario()) return;

    const { error } = await this.supabase.marcarTodasNotificacionesLeidas();
    if (error) {
      this.error.set('No pudimos marcar las notificaciones como leídas.');
      return;
    }

    this.notificaciones.update(lista =>
      lista.map(notificacion => ({ ...notificacion, leida: true }))
    );
  }

  private mensajeDeError(error: ErrorSupabase): string {
    const mensaje = error.message ?? '';

    if (mensaje.includes('USUARIO_REQUERIDO')) {
      return 'Iniciá sesión para que te avisemos.';
    }
    if (mensaje.includes('PELICULA_NO_DISPONIBLE')) {
      return 'Esta película ya no está disponible para preventa.';
    }

    return 'No pudimos guardar tu preferencia. Intentá de nuevo.';
  }

  private iniciarRefresco() {
    if (!isPlatformBrowser(this.platformId) || this.intervalo) return;
    this.intervalo = setInterval(() => void this.refrescar(), INTERVALO_REFRESCO_MS);
  }

  private detenerRefresco() {
    if (!this.intervalo) return;
    clearInterval(this.intervalo);
    this.intervalo = null;
  }

  private limpiar() {
    this.version++;
    this.cargaEnCurso = null;
    this.notificaciones.set([]);
    this.suscripciones.set(new Set());
    this.cargando.set(false);
    this.error.set(null);
  }
}

