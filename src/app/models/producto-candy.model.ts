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