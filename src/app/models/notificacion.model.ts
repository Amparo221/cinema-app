export type TipoNotificacion = 'preventa_disponible' | 'funcion_cancelada';

/** Aviso para la campanita del usuario. */
export interface Notificacion {
  id: number;
  usuario_id: string;
  pelicula_id: number | null;
  /** Función cancelada que originó el aviso; null en las de preventa. */
  funcion_id?: number | null;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}
