import {
  ACCIONES_ACTIVIDAD,
  CambioValor,
  DetalleActividad,
  RegistroActividad,
} from '../../../models/actividad.model';
import { formatearNumero } from '../../../shared/numeros';
import { fechaHoraLocal } from '../reporte/reporte-datos';

/**
 * Funciones puras de /admin/log: etiquetas en castellano y resumen del
 * detalle que guardó el trigger (sirve para leer el cambio de un vistazo).
 */

export const REGISTROS_POR_PAGINA = 25;

/** Campos que se muestran primero en el resumen de cada fila. */
const CAMPOS_DESTACADOS = [
  'nombre',
  'precio',
  'precio_preventa',
  'puntos',
  'puntos_plus',
  'stock',
  'fecha',
  'hora',
  'sala_id',
  'estado',
  'valor',
  'clave',
  'activo',
  'cantidad_butacas',
  'total',
];

const ENTIDADES: Record<string, string> = {
  funciones: 'Función',
  peliculas: 'Película',
  productos_candy: 'Producto de candy',
  combos: 'Recompensa',
  configuracion: 'Configuración',
  escaneos_qr: 'Validación de QR',
  compras: 'Compra',
  propuestas: 'Propuesta de película',
  profiles: 'Usuario',
};

export type ClaseAccion = 'alta' | 'edicion' | 'baja' | 'validacion' | 'cancelacion';

export function etiquetaAccion(accion: string): string {
  const opcion = ACCIONES_ACTIVIDAD.find((item) => item.valor === accion);
  return opcion?.etiqueta ?? accion.replaceAll('_', ' ');
}

export function claseAccion(accion: string): ClaseAccion {
  if (accion === 'qr_validado') return 'validacion';
  if (accion === 'compra_cancelada') return 'cancelacion';
  if (accion.endsWith('_creada') || accion.endsWith('_creado')) return 'alta';
  if (accion.endsWith('_eliminada') || accion.endsWith('_eliminado')) return 'baja';
  return 'edicion';
}

export function entidadLegible(entidad: string): string {
  return ENTIDADES[entidad] ?? entidad;
}

function esCambio(valor: unknown): valor is CambioValor {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    !Array.isArray(valor) &&
    'antes' in valor &&
    'despues' in valor
  );
}

export interface CambioDetectado {
  campo: string;
  antes: unknown;
  despues: unknown;
}

/** Columnas que cambiaron en una edición. */
export function cambiosDe(detalle: DetalleActividad): CambioDetectado[] {
  return Object.entries(detalle)
    .filter(([campo, valor]) => campo !== 'nuevo' && campo !== 'anterior' && esCambio(valor))
    .map(([campo, valor]) => {
      const cambio = valor as CambioValor;
      return { campo, antes: cambio.antes, despues: cambio.despues };
    });
}

/** Valor listo para mostrar: nulos, booleanos, listas y objetos. */
export function valorLegible(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'number') return formatearNumero(valor);
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor)) {
    return valor.length === 0 ? '—' : valor.map((item) => valorLegible(item)).join(', ');
  }
  const texto = JSON.stringify(valor);
  return texto.length > 60 ? `${texto.slice(0, 57)}...` : texto;
}

function ordenarCampos(campos: string[]): string[] {
  const destacados = CAMPOS_DESTACADOS.filter((campo) => campos.includes(campo));
  return [...destacados, ...campos.filter((campo) => !destacados.includes(campo))];
}

/**
 * Resumen corto del registro: "precio: 1.000 → 1.200".
 * En altas y bajas se muestran los campos más importantes guardados.
 */
export function resumenCambio(registro: RegistroActividad, maximo = 3): string {
  const cambios = cambiosDe(registro.detalle);

  if (cambios.length > 0) {
    return ordenarCampos(cambios.map((cambio) => cambio.campo))
      .slice(0, maximo)
      .map((campo) => {
        const cambio = cambios.find((item) => item.campo === campo);
        return `${campo}: ${valorLegible(cambio?.antes)} → ${valorLegible(cambio?.despues)}`;
      })
      .join(' · ');
  }

  const base = registro.detalle.nuevo ?? registro.detalle.anterior;
  if (!base) return '';

  return ordenarCampos(Object.keys(base))
    .slice(0, maximo)
    .map((campo) => `${campo}: ${valorLegible(base[campo])}`)
    .join(' · ');
}

/** Identificador legible: "#12" para filas con id y "clave x" para configuración. */
export function referencia(registro: RegistroActividad): string {
  if (registro.entidad === 'configuracion') {
    const clave =
      registro.detalle.nuevo?.['clave'] ??
      registro.detalle.anterior?.['clave'] ??
      registro.entidad_id;
    return clave ? `clave ${String(clave)}` : '';
  }

  return registro.entidad_id ? `#${registro.entidad_id}` : '';
}

export function totalPaginas(total: number, porPagina = REGISTROS_POR_PAGINA): number {
  return Math.max(1, Math.ceil(total / porPagina));
}

export function mensajeErrorActividad(mensaje: string): string {
  if (mensaje.includes('NO_AUTORIZADO')) {
    return 'Solo un administrador puede ver el log.';
  }
  if (mensaje.includes('RANGO_INVALIDO')) {
    return 'El rango de fechas no es válido.';
  }
  if (mensaje.includes('PGRST202') || mensaje.includes('Could not find the function')) {
    return 'Falta aplicar la migración del log en Supabase (20261114130000_log_actividad.sql).';
  }
  if (mensaje.includes('Failed to fetch') || mensaje.includes('fetch failed')) {
    return 'No se pudo conectar con Supabase. Revisá la conexión e intentá de nuevo.';
  }
  return `No se pudo cargar el log: ${mensaje}`;
}

export { fechaHoraLocal };
