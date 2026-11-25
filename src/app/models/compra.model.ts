import type { ProductoComboCompra } from './combo.model';

export interface Compra {
  id: string;
  usuario_id: string | null;
  funcion_id: number;
  cantidad_butacas: number;
  precio_butacas: number;
  precio_candy: number;
  descuento_primera_compra: number;
  descuento_cincuenta: number;
  creditos_usados: number;
  total: number;
  qr_code: string;
  estado: 'valida' | 'usada' | 'cancelada';
  /** Se completa cuando el empleado escanea el QR y da paso en la puerta. */
  usada_at?: string | null;
  metodo_pago: string | null;
  created_at: string;
  combo_id: number | null;
  combo_nombre: string | null;
  combo_plus: boolean;
  combo_productos: ProductoComboCompra[] | null;
  puntos_usados: number;
  funciones?: {
    fecha: string;
    hora: string;
    peliculas: { nombre: string; duracion: number; imagen: string | null };
    salas: { nombre: string };
  };
}

/** Anticipación mínima, en horas, que exige la regla de cancelación. */
export const HORAS_MINIMAS_CANCELACION = 2;

/**
 * Campos mínimos para decidir si una compra se puede cancelar. Lo cumplen
 * tanto `Compra` como el historial que arma la página de perfil.
 */
export interface CompraCancelable {
  usuario_id: string | null;
  estado: string;
  combo_id: number | null;
  precio_butacas: number;
  descuento_primera_compra: number;
  descuento_cincuenta: number;
  funciones?: { fecha?: string | null; hora?: string | null } | null;
}

/** Motivo por el que la compra no se puede cancelar; `null` = se puede. */
export type MotivoNoCancelable = 'usuario' | 'combo' | 'estado' | 'funcion' | 'tiempo';

/** Inicio de la función, o `null` si la compra no trae el horario. */
export function inicioFuncion(compra: CompraCancelable): Date | null {
  const fecha = compra.funciones?.fecha;
  const hora = compra.funciones?.hora;
  if (!fecha || !hora) return null;

  const inicio = new Date(`${fecha}T${hora}`);
  return Number.isNaN(inicio.getTime()) ? null : inicio;
}

/** Horas que faltan para la función; `null` si no se puede calcular. */
export function horasHastaLaFuncion(
  compra: CompraCancelable,
  ahora: Date = new Date(),
): number | null {
  const inicio = inicioFuncion(compra);
  return inicio ? (inicio.getTime() - ahora.getTime()) / 3_600_000 : null;
}

/**
 * Créditos que devuelve la cancelación: el precio de butacas después de los
 * descuentos. Es la misma cuenta que hace `cancelar_compra` en la base
 * (`total + creditos_usados`), y las compras con combo no devuelven nada.
 */
export function creditosDeCancelacion(compra: CompraCancelable): number {
  if (compra.combo_id) return 0;

  return Math.max(
    compra.precio_butacas - compra.descuento_primera_compra - compra.descuento_cincuenta,
    0,
  );
}

/**
 * Replica las reglas de `cancelar_compra_liberando` (combo no cancelable) y la
 * ventana de 2 horas, para no ofrecer un botón que la base va a rechazar.
 */
export function motivoNoCancelable(
  compra: CompraCancelable,
  usuarioId: string | null | undefined,
  ahora: Date = new Date(),
): MotivoNoCancelable | null {
  if (!usuarioId || compra.usuario_id !== usuarioId) return 'usuario';
  if (compra.combo_id) return 'combo';
  if (compra.estado !== 'valida') return 'estado';

  const horas = horasHastaLaFuncion(compra, ahora);
  if (horas === null) return 'funcion';

  return horas >= HORAS_MINIMAS_CANCELACION ? null : 'tiempo';
}

export function puedeCancelarCompra(
  compra: CompraCancelable,
  usuarioId: string | null | undefined,
  ahora: Date = new Date(),
): boolean {
  return motivoNoCancelable(compra, usuarioId, ahora) === null;
}

/** Texto para la UI que explica por qué no se puede cancelar. */
export function textoNoCancelable(motivo: MotivoNoCancelable): string {
  switch (motivo) {
    case 'combo':
      return 'Las compras con combo no se pueden cancelar.';
    case 'tiempo':
      return 'Faltan menos de 2 horas para la función: ya no se puede cancelar.';
    case 'estado':
      return 'Esta compra ya no se puede cancelar.';
    case 'funcion':
      return 'No encontramos el horario de la función.';
    case 'usuario':
      return 'Esta compra no es tuya.';
    default:
      return 'Esta compra no se puede cancelar.';
  }
}

/** Traduce los códigos de `cancelar_compra_liberando` a algo legible. */
export function mensajeErrorCancelacion(mensaje: string): string {
  const texto = (mensaje ?? '').toUpperCase();

  if (texto.includes('COMPRA_COMBO_NO_CANCELABLE')) {
    return 'Las compras con combo no se pueden cancelar.';
  }
  if (texto.includes('COMPRA_YA_CANCELADA')) {
    return 'Esa compra ya estaba cancelada.';
  }
  if (texto.includes('COMPRA_NO_EXISTE')) {
    return 'La compra ya no existe.';
  }
  if (texto.includes('PLAZO')) {
    return 'Faltan menos de 2 horas para la función: ya no se puede cancelar.';
  }
  if (texto.includes('AUTORIZADO')) {
    return 'No podés cancelar esta compra.';
  }

  return 'No se pudo cancelar la compra. Intentá nuevamente.';
}
