import type { ProductoCandy } from './producto-candy.model';
import type { Profile } from './profile.model';

/** Texto que se agrega al nombre cuando la butaca elegida es VIP. */
export const SUFIJO_COMBO_PLUS = ' Plus +';

/**
 * Combo especial: una butaca + dos productos de candy.
 * `puntos` es el costo base y `puntos_plus` el costo con butaca VIP.
 */
export interface Combo {
  id: number;
  nombre: string;
  descripcion: string | null;
  producto_1_id: number;
  producto_2_id: number;
  puntos: number;
  puntos_plus: number;
  activo: boolean;
  producto_1?: ProductoCandy | null;
  producto_2?: ProductoCandy | null;
}

/** Producto incluido dentro de una compra con combo. */
export interface ProductoComboCompra {
  id: number;
  nombre: string;
  cantidad: number;
}

/** Nombre visible del combo, con o sin el sufijo Plus. */
export function nombreCombo(
  combo: Pick<Combo, 'nombre'>,
  plus = false
): string {
  return plus ? `${combo.nombre}${SUFIJO_COMBO_PLUS}` : combo.nombre;
}

/** Puntos que cuesta el combo segun el tipo de butaca. */
export function puntosCombo(
  combo: Pick<Combo, 'puntos' | 'puntos_plus'>,
  plus = false
): number {
  return plus ? combo.puntos_plus : combo.puntos;
}

/**
 * Motivo por el que el usuario no puede comprar el combo.
 * Devuelve null cuando esta habilitado.
 */
export function motivoNoCanjeCombo(
  usuario: Profile | null,
  combo: Combo | null,
  plus = false
): string | null {
  if (!combo || !combo.activo) {
    return 'El combo seleccionado ya no está disponible.';
  }
  if (!usuario) {
    return 'Iniciá sesión para comprar un combo con puntos.';
  }
  if (usuario.primera_compra) {
    return 'Los combos se habilitan después de tu primera compra.';
  }

  const costo = puntosCombo(combo, plus);
  if (usuario.puntos < costo) {
    return `Te faltan ${costo - usuario.puntos} puntos para este combo.`;
  }

  return null;
}
