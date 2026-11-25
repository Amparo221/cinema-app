import {
  POR_PAGINA,
  desplazamientoPagina,
  hayPaginaSiguiente,
  paginaValida,
  rangoPagina,
  resumenPagina,
  totalPaginas,
} from './paginacion';

describe('paginacion', () => {
  it('usa 5 filas por página por defecto', () => {
    expect(POR_PAGINA).toBe(5);
  });

  it('calcula el total de páginas redondeando hacia arriba', () => {
    expect(totalPaginas(0)).toBe(1);
    expect(totalPaginas(1)).toBe(1);
    expect(totalPaginas(5)).toBe(1);
    expect(totalPaginas(6)).toBe(2);
    expect(totalPaginas(12)).toBe(3);
  });

  it('tolera totales y tamaños de página inválidos', () => {
    expect(totalPaginas(Number.NaN)).toBe(1);
    expect(totalPaginas(-3)).toBe(1);
    expect(totalPaginas(10, 0)).toBe(1);
  });

  it('respeta el tamaño de página que se le pase', () => {
    expect(totalPaginas(10, 4)).toBe(3);
  });

  it('acota la página pedida al rango válido', () => {
    expect(paginaValida(1, 12)).toBe(1);
    expect(paginaValida(3, 12)).toBe(3);
    expect(paginaValida(9, 12)).toBe(3);
    expect(paginaValida(0, 12)).toBe(1);
    expect(paginaValida(-2, 12)).toBe(1);
    expect(paginaValida(2.5, 12)).toBe(1);
    expect(paginaValida(4, 0)).toBe(1);
  });

  it('traduce la página al offset de Supabase', () => {
    expect(desplazamientoPagina(1)).toBe(0);
    expect(desplazamientoPagina(2)).toBe(5);
    expect(desplazamientoPagina(3)).toBe(10);
    expect(desplazamientoPagina(0)).toBe(0);
    expect(desplazamientoPagina(-1)).toBe(0);
  });

  it('devuelve el rango visible de la página', () => {
    expect(rangoPagina(1, 12)).toEqual({ desde: 0, hasta: 5 });
    expect(rangoPagina(3, 12)).toEqual({ desde: 10, hasta: 12 });
    expect(rangoPagina(2, 6)).toEqual({ desde: 5, hasta: 6 });
    expect(rangoPagina(1, 0)).toEqual({ desde: 0, hasta: 0 });
  });

  it('sabe cuándo hay página siguiente', () => {
    expect(hayPaginaSiguiente(1, 12)).toBe(true);
    expect(hayPaginaSiguiente(2, 12)).toBe(true);
    expect(hayPaginaSiguiente(3, 12)).toBe(false);
    expect(hayPaginaSiguiente(1, 0)).toBe(false);
  });

  it('arma el resumen “Mostrando 1 a 5 de 12”', () => {
    expect(resumenPagina(1, 12)).toBe('Mostrando 1 a 5 de 12');
    expect(resumenPagina(3, 12)).toBe('Mostrando 11 a 12 de 12');
    expect(resumenPagina(1, 3)).toBe('Mostrando 1 a 3 de 3');
    expect(resumenPagina(1, 0)).toBe('');
  });
});
