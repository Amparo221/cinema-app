import { Component, input, model, computed } from '@angular/core';
import { Butaca, TipoButaca } from '../../models/butaca.model';

const FILAS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
const FILAS_ACCESIBLES = ['J', 'K'];
const FILAS_VIP = ['R', 'S', 'T'];

function generarFila(fila: string): Butaca[] {
  const butacas: Butaca[] = [];
  const tipoBase: TipoButaca = FILAS_ACCESIBLES.includes(fila)
    ? 'accesible'
    : FILAS_VIP.includes(fila)
      ? 'vip'
      : 'normal';

  if (FILAS_ACCESIBLES.includes(fila)) {
    for (const col of [2, 3]) {
      butacas.push({ codigo: `${fila}${col}`, fila, columna: col, tipo: tipoBase });
    }
    for (let col = 11; col <= 20; col++) {
      butacas.push({ codigo: `${fila}${col}`, fila, columna: col, tipo: tipoBase });
    }
    for (const col of [28, 29]) {
      butacas.push({ codigo: `${fila}${col}`, fila, columna: col, tipo: tipoBase });
    }
  } else {
    for (let col = 1; col <= 4; col++) {
      butacas.push({ codigo: `${fila}${col}`, fila, columna: col, tipo: tipoBase });
    }
    for (let col = 6; col <= 25; col++) {
      butacas.push({ codigo: `${fila}${col}`, fila, columna: col, tipo: tipoBase });
    }
    for (let col = 27; col <= 30; col++) {
      butacas.push({ codigo: `${fila}${col}`, fila, columna: col, tipo: tipoBase });
    }
  }
  return butacas;
}

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

  filas = FILAS.map(fila => ({
    letra: fila,
    butacas: generarFila(fila),
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
