/** Filas por página en los historiales del perfil y en “Mis reseñas”. */
export const POR_PAGINA = 5;

/**
 * Cantidad de páginas para un total de filas. Nunca baja de 1 para poder
 * mostrar “Página 1 de 1” sin casos especiales en las plantillas.
 */
export function totalPaginas(total: number, porPagina: number = POR_PAGINA): number {
  if (!Number.isFinite(total) || total <= 0) return 1;
  if (!Number.isFinite(porPagina) || porPagina < 1) return 1;
  return Math.ceil(total / porPagina);
}

/** Envuelve la página pedida dentro del rango válido (1..total). */
export function paginaValida(pagina: number, total: number, porPagina: number = POR_PAGINA): number {
  const paginas = totalPaginas(total, porPagina);
  if (!Number.isInteger(pagina) || pagina < 1) return 1;
  return Math.min(pagina, paginas);
}

/**
 * `offset` para pedir una página a Supabase (`.range(offset, offset + POR_PAGINA - 1)`).
 * Las páginas inválidas se tratan como la primera.
 */
export function desplazamientoPagina(pagina: number, porPagina: number = POR_PAGINA): number {
  const actual = Number.isInteger(pagina) && pagina > 0 ? pagina : 1;
  return (actual - 1) * porPagina;
}

/** Índices (base 0) de la primera y la última fila de la página. */
export function rangoPagina(
  pagina: number,
  total: number,
  porPagina: number = POR_PAGINA,
): { desde: number; hasta: number } {
  if (total <= 0) return { desde: 0, hasta: 0 };

  const actual = paginaValida(pagina, total, porPagina);
  const desde = (actual - 1) * porPagina;
  return { desde, hasta: Math.min(desde + porPagina, total) };
}

/** `true` cuando existe una página posterior a la indicada. */
export function hayPaginaSiguiente(
  pagina: number,
  total: number,
  porPagina: number = POR_PAGINA,
): boolean {
  return pagina < totalPaginas(total, porPagina);
}

/** Texto “Mostrando 1 a 5 de 12”. Con total 0 devuelve una cadena vacía. */
export function resumenPagina(
  pagina: number,
  total: number,
  porPagina: number = POR_PAGINA,
): string {
  if (total <= 0) return '';

  const { desde, hasta } = rangoPagina(pagina, total, porPagina);
  return `Mostrando ${desde + 1} a ${hasta} de ${total}`;
}
