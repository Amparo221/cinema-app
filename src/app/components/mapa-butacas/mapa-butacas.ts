import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapa-butacas.html',
  styleUrl: './mapa-butacas.css',
})
export class MapaButacas {
  butacasOcupadas = input<string[]>([]);

  seleccionCambiada = output<string[]>();

  butacasSeleccionadas = signal<Set<string>>(new Set());

  filas = FILAS.map(fila => ({
    letra: fila,
    butacas: generarFila(fila),
  }));

  ocupadasSet = computed(() => new Set(this.butacasOcupadas()));

  totalSeleccionadas = computed(() => this.butacasSeleccionadas().size);

  toggleButaca(butaca: Butaca) {
    if (this.ocupadasSet().has(butaca.codigo)) return;

    const actual = new Set(this.butacasSeleccionadas());

    if (actual.has(butaca.codigo)) {
      actual.delete(butaca.codigo);
    } else {
      actual.add(butaca.codigo);
    }

    this.butacasSeleccionadas.set(actual);
    this.seleccionCambiada.emit(Array.from(actual));
  }

  estaSeleccionada(codigo: string): boolean {
    return this.butacasSeleccionadas().has(codigo);
  }

  estaOcupada(codigo: string): boolean {
    return this.ocupadasSet().has(codigo);
  }
}