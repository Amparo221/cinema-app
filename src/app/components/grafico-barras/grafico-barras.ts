import { Component, computed, input } from '@angular/core';
import { PuntoGrafico } from '../../models/reporte.model';
import { formatearNumero, numero } from '../../shared/numeros';

interface Barra extends PuntoGrafico {
  porcentaje: number;
  valorTexto: string;
}

/**
 * Gráfico de barras horizontales en HTML y CSS, sin librerías: funciona en
 * el render del servidor, se lee con lector de pantalla (cada barra muestra
 * su etiqueta y su valor) y se adapta al ancho del contenedor.
 */
@Component({
  selector: 'app-grafico-barras',
  templateUrl: './grafico-barras.html',
  styleUrl: './grafico-barras.css',
})
export class GraficoBarras {
  /** Título del gráfico; también es el `<figcaption>`. */
  titulo = input.required<string>();
  datos = input.required<PuntoGrafico[]>();
  /** Se muestra al lado del número: "entradas", "unidades"... */
  unidad = input('');
  vacio = input('Sin datos para el rango elegido.');
  /** Cuántas barras se muestran como máximo. */
  maximo = input(6);

  readonly barras = computed<Barra[]>(() => {
    const datos = this.datos().slice(0, Math.max(this.maximo(), 1));
    const mayor = Math.max(1, ...datos.map((punto) => numero(punto.valor)));

    return datos.map((punto) => ({
      ...punto,
      // 4% mínimo para que una barra chica siga siendo visible.
      porcentaje: Math.max(4, Math.round((numero(punto.valor) / mayor) * 100)),
      valorTexto: formatearNumero(punto.valor),
    }));
  });
}
