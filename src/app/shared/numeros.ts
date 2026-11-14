/**
 * Formato de números y moneda para los reportes del admin.
 * Se comparte entre la página, el PDF y el gráfico de barras.
 */

const formatoMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoNumero = new Intl.NumberFormat('es-AR');

/** Postgres puede devolver `numeric` como string: todo pasa por acá. */
export function numero(valor: unknown): number {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

export function formatearMoneda(valor: unknown): string {
  return formatoMoneda.format(numero(valor));
}

export function formatearNumero(valor: unknown): string {
  return formatoNumero.format(numero(valor));
}
