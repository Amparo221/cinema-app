import { Pipe, PipeTransform } from '@angular/core';

/**
 * Recorta un texto largo y le agrega puntos suspensivos.
 *
 * Se usa en las tablas del admin para que un título, una descripción o una
 * lista de géneros no desborde la columna. El texto completo queda disponible
 * en el atributo `title` de la celda.
 */
@Pipe({ name: 'recortarTexto' })
export class RecortarTexto implements PipeTransform {
  transform(valor: string | null | undefined, limite = 40): string {
    const texto = (valor ?? '').trim();
    const maximo = Math.max(1, Math.trunc(limite));

    if (texto.length <= maximo) return texto;

    return `${texto.slice(0, maximo).trimEnd()}...`;
  }
}
