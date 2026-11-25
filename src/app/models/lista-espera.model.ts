/**
 * Lista de espera de funciones agotadas (/compra/:funcion_id y /admin/general).
 *
 * Tabla `public.lista_espera`; ver
 * `supabase/migrations/20261124140000_lista_espera.sql` y
 * `docs/lista-espera.md`.
 */

export type EstadoListaEspera =
  | 'esperando'
  | 'notificado'
  | 'reclamado'
  | 'vencido'
  | 'cancelado';

/** Minutos que dura el aviso para reclamar el lugar. */
export const MINUTOS_RECLAMO = 10;

/** Fila de `public.lista_espera` del usuario actual. */
export interface EsperaButaca {
  id: number;
  funcion_id: number;
  usuario_id: string;
  estado: EstadoListaEspera;
  /** Butaca que se le ofrece; se bloquea recién al reclamar. */
  butaca_reservada: string | null;
  notificado_at: string | null;
  /** Fin de la ventana para reclamar; null si todavía no fue notificado. */
  reclamo_expira_at: string | null;
  created_at: string;
}

/** Fila de la RPC `reporte_lista_espera()` (panel del admin). */
export interface FilaReporteEspera {
  funcion_id: number;
  pelicula_nombre: string;
  fecha: string;
  hora: string;
  sala: string | null;
  en_espera: number;
  notificados: number;
  desde: string;
}

/** true si el usuario sigue en la cola (esperando o con aviso abierto). */
export function esperaEnCola(espera: EsperaButaca | null): boolean {
  if (!espera) return false;
  return espera.estado === 'esperando' || espera.estado === 'notificado';
}

/** true si el aviso de la lista sigue vigente y se puede reclamar. */
export function reclamoVigente(
  espera: EsperaButaca | null,
  ahora: number = Date.now(),
): boolean {
  if (!espera || espera.estado !== 'notificado' || !espera.reclamo_expira_at) {
    return false;
  }

  const fin = new Date(espera.reclamo_expira_at).getTime();
  return Number.isFinite(fin) && fin > ahora;
}

/** Minutos que le quedan al aviso (0 si venció o no hay aviso). */
export function minutosRestantesReclamo(
  espera: EsperaButaca | null,
  ahora: number = Date.now(),
): number {
  if (!reclamoVigente(espera, ahora) || !espera?.reclamo_expira_at) return 0;

  const fin = new Date(espera.reclamo_expira_at).getTime();
  return Math.max(0, Math.ceil((fin - ahora) / 60000));
}

/** Texto corto del estado para la pantalla de compra. */
export function textoEstadoEspera(espera: EsperaButaca | null): string {
  if (!espera) return '';
  if (espera.estado === 'esperando') {
    return 'Estás en la lista de espera. Te avisamos por la campanita.';
  }
  if (espera.estado === 'notificado') {
    return 'Se liberó un lugar para esta función.';
  }
  if (espera.estado === 'reclamado') {
    return espera.butaca_reservada
      ? `Reclamaste la butaca ${espera.butaca_reservada}. Completá la compra.`
      : 'Ya reclamaste tu lugar. Completá la compra.';
  }
  if (espera.estado === 'vencido') {
    return 'Se venció el tiempo para reclamar. Podés volver a anotarte.';
  }
  return 'Saliste de la lista de espera.';
}

/** Traduce los códigos de error de las RPC a un mensaje para el usuario. */
export function mensajeErrorListaEspera(mensaje?: string | null): string {
  const codigo = (mensaje ?? '').toUpperCase();

  if (codigo.includes('USUARIO_REQUERIDO')) {
    return 'Iniciá sesión para anotarte en la lista de espera.';
  }
  if (codigo.includes('HAY_BUTACAS_LIBRES')) {
    return 'Todavía hay butacas libres: elegí la tuya en el mapa.';
  }
  if (codigo.includes('FUNCION_NO_DISPONIBLE')) {
    return 'Esta función ya no está disponible.';
  }
  if (codigo.includes('FUNCION_YA_COMENZO')) {
    return 'La función ya comenzó: no se puede anotar.';
  }
  if (codigo.includes('YA_RECLAMADO')) {
    return 'Ya reclamaste tu lugar: completá la compra.';
  }
  if (codigo.includes('TURNO_VENCIDO')) {
    return 'Se venció el tiempo para reclamar. Podés volver a anotarte.';
  }
  if (codigo.includes('SIN_TURNO')) {
    return 'Todavía no es tu turno. Te avisamos por la campanita.';
  }
  if (codigo.includes('SIN_ESPERA')) {
    return 'No estás en la lista de espera de esta función.';
  }
  if (codigo.includes('SIN_BUTACAS')) {
    return 'Justo se ocuparon las butacas. Seguís en la lista de espera.';
  }
  if (codigo.includes('SESION_INVALIDA')) {
    return 'No pudimos identificar tu sesión. Recargá la página.';
  }
  if (codigo.includes('SOLO_ADMIN')) {
    return 'No tenés permiso para ver la lista de espera.';
  }

  return 'No pudimos completar la operación. Intentá de nuevo.';
}
