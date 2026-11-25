import { DatosPelicula } from './admin.model';

/**
 * Tipos de las propuestas de películas (/propuestas y /admin/propuestas).
 *
 * Tabla `public.propuestas`; ver
 * supabase/migrations/20261115130000_propuestas.sql.
 * Las reglas de escritura viven en la base (checks + índice único de
 * pendiente); acá se repiten solo para dar mensajes antes de enviar.
 */

export type EstadoPropuesta = 'pendiente' | 'aceptada' | 'rechazada';

/** Lo que ve el cliente en /propuestas. */
export interface Propuesta {
  id: number;
  usuario_id: string;
  titulo: string;
  descripcion: string;
  motivo: string;
  estado: EstadoPropuesta;
  nota_admin: string | null;
  /** Película creada al aceptarla; null mientras sigue pendiente. */
  pelicula_id: number | null;
  creada_at: string;
  resuelta_at: string | null;
  resuelta_por: string | null;
}

/** Fila de la bandeja del admin (RPC `listar_propuestas`). */
export interface PropuestaAdmin extends Propuesta {
  usuario_nombre: string;
  usuario_email: string;
  pelicula: string | null;
  /** Total de filas que cumplen los filtros (viene repetido en cada fila). */
  total: number;
}

/** Alta desde el cliente. */
export interface NuevaPropuesta {
  usuario_id: string;
  titulo: string;
  descripcion: string;
  motivo: string;
}

/** Campos del formulario del cliente. */
export interface DatosPropuesta {
  titulo: string;
  descripcion: string;
  motivo: string;
}

/** Mismos límites que los `check` de la tabla. */
export const LIMITES_PROPUESTA = {
  titulo: { min: 3, max: 120 },
  descripcion: { min: 10, max: 1000 },
  motivo: { min: 10, max: 1000 },
} as const;

/** Errores por campo; vacío cuando está todo bien. */
export type ErroresPropuesta = Partial<Record<keyof DatosPropuesta, string>>;

export const ETIQUETAS_ESTADO_PROPUESTA: Record<EstadoPropuesta, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
};

export function etiquetaEstadoPropuesta(estado: string): string {
  return ETIQUETAS_ESTADO_PROPUESTA[estado as EstadoPropuesta] ?? estado;
}

function largo(valor: string): number {
  return valor.trim().length;
}

/** Valida el formulario sin tocar la red. */
export function validarPropuesta(datos: DatosPropuesta): ErroresPropuesta {
  const errores: ErroresPropuesta = {};

  if (largo(datos.titulo) < LIMITES_PROPUESTA.titulo.min) {
    errores.titulo = `El título necesita al menos ${LIMITES_PROPUESTA.titulo.min} caracteres.`;
  } else if (largo(datos.titulo) > LIMITES_PROPUESTA.titulo.max) {
    errores.titulo = `El título no puede superar los ${LIMITES_PROPUESTA.titulo.max} caracteres.`;
  }

  if (largo(datos.descripcion) < LIMITES_PROPUESTA.descripcion.min) {
    errores.descripcion = `La descripción necesita al menos ${LIMITES_PROPUESTA.descripcion.min} caracteres.`;
  } else if (largo(datos.descripcion) > LIMITES_PROPUESTA.descripcion.max) {
    errores.descripcion = `La descripción no puede superar los ${LIMITES_PROPUESTA.descripcion.max} caracteres.`;
  }

  if (largo(datos.motivo) < LIMITES_PROPUESTA.motivo.min) {
    errores.motivo = `Contanos un poco más: al menos ${LIMITES_PROPUESTA.motivo.min} caracteres.`;
  } else if (largo(datos.motivo) > LIMITES_PROPUESTA.motivo.max) {
    errores.motivo = `El motivo no puede superar los ${LIMITES_PROPUESTA.motivo.max} caracteres.`;
  }

  return errores;
}

export function hayErrores(errores: ErroresPropuesta): boolean {
  return Object.keys(errores).length > 0;
}

/**
 * Se puede enviar si no hay una propuesta pendiente y los datos son válidos.
 * La base vuelve a validar todo: esto es solo para no ir y volver.
 */
export function puedeEnviarPropuesta(datos: DatosPropuesta, hayPendiente: boolean): boolean {
  return !hayPendiente && !hayErrores(validarPropuesta(datos));
}

/**
 * Detalle técnico entre paréntesis para no perder el error real de Postgres.
 * Se recorta para que entre en una línea de la alerta.
 */
function detalleError(mensaje: string): string {
  const limpio = mensaje.trim().replace(/\s+/g, ' ');
  if (!limpio) return '';

  const recortado = limpio.length > 160 ? `${limpio.slice(0, 157)}...` : limpio;
  return ` (${recortado})`;
}

/** Traduce los errores de Postgres a algo legible. */
export function mensajeErrorPropuesta(mensaje: string): string {
  const codigo = mensaje.toUpperCase();

  if (codigo.includes('23505') || codigo.includes('PENDIENTE')) {
    return 'Ya tenés una propuesta pendiente. Esperá la respuesta antes de enviar otra.';
  }

  if (codigo.includes('NO_AUTORIZADO')) {
    return 'No tenés permiso para hacer esta acción.';
  }

  if (codigo.includes('PELICULA_REQUERIDA')) {
    return 'Primero creá la película y después aceptá la propuesta.';
  }

  if (codigo.includes('PROPUESTA_YA_RESUELTA')) {
    return 'Otra persona ya resolvió esta propuesta. Recargá la lista.';
  }

  if (codigo.includes('PROPUESTA_NO_EXISTE')) {
    return 'La propuesta ya no existe. Recargá la lista.';
  }

  // La base no pudo inferir el índice único de notificaciones (42P10).
  if (
    codigo.includes('42P10') ||
    codigo.includes('NO UNIQUE OR EXCLUSION CONSTRAINT') ||
    codigo.includes('ON CONFLICT')
  ) {
    return `La base rechazó el aviso al cliente${detalleError(mensaje)}. Reintentá la aceptación o aceptá la propuesta con la película existente.`;
  }

  if (codigo.includes('23514') || codigo.includes('CHEC')) {
    return 'Revisá los datos: alguno no cumple con el mínimo o el máximo.';
  }

  return `No se pudo completar la acción. Intentá nuevamente.${detalleError(mensaje)}`;
}

/**
 * Datos para precargar el formulario de alta de películas con lo que
 * propuso el cliente. La imagen y los precios los completa el admin.
 */
export function datosPeliculaDesdePropuesta(
  propuesta: Pick<Propuesta, 'titulo' | 'descripcion'>,
): DatosPelicula {
  return {
    nombre: propuesta.titulo,
    sinopsis: propuesta.descripcion,
    duracion: 90,
    generos: [],
    restriccion_edad: null,
    precio_preventa: null,
    proximamente: false,
    fecha_estreno: null,
  };
}
