export type CategoriaCandy = 'pochoclos' | 'bebidas' | 'snacks' | 'golosinas' | 'combos';

export interface ProductoCandy {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: CategoriaCandy;
  precio: number;
  imagen: string | null;
  stock: number;
}

export interface ItemCarrito {
  producto: ProductoCandy;
  cantidad: number;
}

/** Indica si el producto es uno de los dos incluidos en el combo. */
export function productoEstaEnCombo(
  productoId: number,
  combo: Pick<ItemCombo, 'producto_1_id' | 'producto_2_id'> | null
): boolean {
  if (!combo) return false;
  return combo.producto_1_id === productoId || combo.producto_2_id === productoId;
}

/** Cantidad de productos que el combo aporta sin costo extra. */
export function cantidadCombo(
  combo: Pick<ItemCombo, 'producto_1_id' | 'producto_2_id'> | null
): number {
  return combo ? 2 : 0;
}

/**
 * Unidades que se cobran aparte: el combo incluye una unidad de cada producto.
 */
export function cantidadPagada(
  item: ItemCarrito,
  combo: Pick<ItemCombo, 'producto_1_id' | 'producto_2_id'> | null
): number {
  const incluidas = productoEstaEnCombo(item.producto.id, combo) ? 1 : 0;
  return Math.max(0, item.cantidad - incluidas);
}

/** Total en dinero del candy que no cubre el combo. */
export function totalCandyPagado(
  carrito: Iterable<ItemCarrito>,
  combo: Pick<ItemCombo, 'producto_1_id' | 'producto_2_id'> | null
): number {
  let total = 0;
  for (const item of carrito) {
    total += item.producto.precio * cantidadPagada(item, combo);
  }
  return total;
}

interface ItemCombo {
  producto_1_id: number;
  producto_2_id: number;
}
