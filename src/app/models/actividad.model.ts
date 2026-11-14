/**
 * Tipos del log de actividad (/admin/log).
 * La tabla `actividad` la llenan triggers (ver
 * supabase/migrations/20261114130000_log_actividad.sql); el frontend
 * solo lee a través de la RPC `reporte_actividad`.
 */

export interface CambioValor {
  antes: unknown;
  despues: unknown;
}

/**
 * Detalle de un registro: en un alta guarda `nuevo`, en una baja
 * `anterior` y en una edición una clave por cada columna que cambió.
 */
export interface DetalleActividad {
  nuevo?: Record<string, unknown>;
  anterior?: Record<string, unknown>;
  [clave: string]: unknown;
}

export interface RegistroActividad {
  id: number;
  created_at: string;
  usuario_nombre: string;
  rol: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalle: DetalleActividad;
  /** Total de filas que cumplen los filtros (viene repetido en cada fila). */
  total: number;
}

export interface PaginaActividad {
  registros: RegistroActividad[];
  total: number;
}

export interface OpcionAccion {
  valor: string;
  etiqueta: string;
}

/** Acciones que registran los triggers; también alimentan el filtro. */
export const ACCIONES_ACTIVIDAD: OpcionAccion[] = [
  { valor: 'funcion_creada', etiqueta: 'Función creada' },
  { valor: 'funcion_modificada', etiqueta: 'Función modificada' },
  { valor: 'funcion_eliminada', etiqueta: 'Función eliminada' },
  { valor: 'pelicula_creada', etiqueta: 'Película creada' },
  { valor: 'pelicula_modificada', etiqueta: 'Película modificada' },
  { valor: 'pelicula_eliminada', etiqueta: 'Película eliminada' },
  { valor: 'candy_creado', etiqueta: 'Producto de candy creado' },
  { valor: 'candy_modificado', etiqueta: 'Producto de candy modificado' },
  { valor: 'candy_eliminado', etiqueta: 'Producto de candy eliminado' },
  { valor: 'combo_creado', etiqueta: 'Recompensa creada' },
  { valor: 'combo_modificado', etiqueta: 'Recompensa modificada' },
  { valor: 'combo_eliminado', etiqueta: 'Recompensa eliminada' },
  { valor: 'configuracion_creada', etiqueta: 'Configuración creada' },
  { valor: 'configuracion_modificada', etiqueta: 'Configuración modificada' },
  { valor: 'configuracion_eliminada', etiqueta: 'Configuración eliminada' },
  { valor: 'qr_validado', etiqueta: 'QR validado' },
  { valor: 'compra_cancelada', etiqueta: 'Compra cancelada' },
];

/** Filtros de la bitácora. */
export interface FiltrosActividad {
  desde: string;
  hasta: string;
  accion: string;
  usuario: string;
}
