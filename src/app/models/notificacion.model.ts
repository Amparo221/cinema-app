export type TipoNotificacion = 'preventa_disponible';

/** Aviso para la campanita del usuario. */
export interface Notificacion {
  id: number;
  usuario_id: string;
  pelicula_id: number | null;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}
