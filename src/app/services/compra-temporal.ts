import { Injectable, signal } from '@angular/core';
import { ItemCarrito } from '../models/producto-candy.model';

export interface ResumenCompra {
  funcion_id: number;
  pelicula_nombre: string;
  funcion_fecha: string;
  funcion_hora: string;
  sala_nombre: string;
  butacas: string[];
  precio_butacas: number;
  descuento_primera_compra: number;
  descuento_cincuenta: number;
  carrito_candy: ItemCarrito[];
  total_candy: number;
  subtotal_con_descuentos: number;
  creditos_disponibles: number;
  creditos_usados: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class CompraTemporalService {
  resumen = signal<ResumenCompra | null>(null);

  set(resumen: ResumenCompra) {
    this.resumen.set(resumen);
  }

  limpiar() {
    this.resumen.set(null);
  }
}