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