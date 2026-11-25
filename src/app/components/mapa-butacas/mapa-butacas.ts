import { Component, input, model, computed } from '@angular/core';
import { Butaca, BUTACAS, FILAS } from '../../models/butaca.model';

@Component({
  selector: 'app-mapa-butacas',
  imports: [],
  templateUrl: './mapa-butacas.html',
  styleUrl: './mapa-butacas.css',
})
export class MapaButacas {
  /** Butacas ya vendidas: no se pueden tocar. */
  butacasVendidas = input<string[]>([]);

  /** Butacas bloqueadas por otra pestana/usuario: no se pueden tocar. */
  butacasReservadas = input<string[]>([]);

  /** Seleccion actual. El padre es la unica fuente de verdad. */
  seleccion = model<string[]>([]);

  /** El layout sale de `butaca.model.ts`: no se duplican las 532 butacas. */
  filas = FILAS.map(fila => ({
    letra: fila,
    butacas: BUTACAS.filter(butaca => butaca.fila === fila),
  }));

  vendidasSet = computed(() => new Set(this.butacasVendidas()));
  reservadasSet = computed(() => new Set(this.butacasReservadas()));
  seleccionSet = computed(() => new Set(this.seleccion()));
  totalSeleccionadas = computed(() => this.seleccion().length);

  toggleButaca(butaca: Butaca) {
    // Vendidas y reservadas por otros nunca entran a la seleccion.
    if (this.estaOcupada(butaca.codigo)) return;

    this.seleccion.update(actual => {
      const siguiente = new Set(actual);
      if (siguiente.has(butaca.codigo)) {
        siguiente.delete(butaca.codigo);
      } else {
        siguiente.add(butaca.codigo);
      }
      return [...siguiente];
    });
  }

  estaSeleccionada(codigo: string): boolean {
    return this.seleccionSet().has(codigo);
  }

  estaReservada(codigo: string): boolean {
    return this.reservadasSet().has(codigo);
  }

  estaOcupada(codigo: string): boolean {
    return this.vendidasSet().has(codigo) || this.reservadasSet().has(codigo);
  }

  estadoTexto(codigo: string): string {
    if (this.vendidasSet().has(codigo)) return 'vendida';
    if (this.reservadasSet().has(codigo)) return 'reservada por otro usuario';
    if (this.seleccionSet().has(codigo)) return 'seleccionada';
    return 'disponible';
  }
}
