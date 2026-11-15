/**
 * Máscara de fechas `dd/mm/aaaa`.
 *
 * El usuario solo escribe dígitos y las barras se acomodan solas
 * (`02112006` → `02/11/2006`). El valor que se guarda en los formularios
 * sigue siendo ISO (`aaaa-mm-dd`), así los RPC y las consultas no cambian.
 */

/** Dígitos de una fecha completa: ddmmaaaa. */
export const DIGITOS_FECHA = 8;

/** Largo del texto enmascarado: dd/mm/aaaa. */
export const LARGO_FECHA = 10;

/** Texto de ayuda que se muestra mientras no hay fecha. */
export const PLACEHOLDER_FECHA = 'dd/mm/aaaa';

/** Deja solo dígitos y corta en 8 (ddmmaaaa). */
export function soloDigitos(texto: string | null | undefined): string {
  return String(texto ?? '')
    .replace(/\D/g, '')
    .slice(0, DIGITOS_FECHA);
}

/**
 * Arma `dd/mm/aaaa` a partir de los dígitos escritos.
 * La barra aparece recién cuando hay un dígito después, así el borrado
 * con Backspace se siente natural.
 */
export function enmascararFecha(texto: string | null | undefined): string {
  const digitos = soloDigitos(texto);
  if (digitos.length <= 2) return digitos;

  const dia = digitos.slice(0, 2);
  const resto = digitos.slice(2);

  if (resto.length <= 2) return `${dia}/${resto}`;

  const mes = resto.slice(0, 2);
  const anio = resto.slice(2);

  return `${dia}/${mes}/${anio}`;
}

/** Año bisiesto del calendario gregoriano. */
function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

/** Días que tiene un mes (1-12). */
export function diasDelMes(mes: number, anio: number): number {
  const dias = [31, esBisiesto(anio) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return dias[mes - 1] ?? 0;
}

/** `true` cuando ya están los 8 dígitos (no dice si la fecha existe). */
export function fechaCompleta(texto: string | null | undefined): boolean {
  return soloDigitos(texto).length === DIGITOS_FECHA;
}

/**
 * `true` cuando los dígitos forman una fecha real del calendario:
 * rechaza `31/02/2006`, `00/00/0000` y años anteriores a 1900.
 */
export function fechaReal(texto: string | null | undefined): boolean {
  const digitos = soloDigitos(texto);
  if (digitos.length !== DIGITOS_FECHA) return false;

  const dia = Number(digitos.slice(0, 2));
  const mes = Number(digitos.slice(2, 4));
  const anio = Number(digitos.slice(4));

  if (anio < 1900) return false;
  if (mes < 1 || mes > 12) return false;

  return dia >= 1 && dia <= diasDelMes(mes, anio);
}

/** `dd/mm/aaaa` → `aaaa-mm-dd`. Devuelve `''` si la fecha no es válida. */
export function fechaAIso(texto: string | null | undefined): string {
  if (!fechaReal(texto)) return '';

  const digitos = soloDigitos(texto);

  return `${digitos.slice(4)}-${digitos.slice(2, 4)}-${digitos.slice(0, 2)}`;
}

/** `aaaa-mm-dd` → `dd/mm/aaaa`. Devuelve `''` si el ISO no tiene ese formato. */
export function isoAFecha(iso: string | null | undefined): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? '').trim());
  if (!partes) return '';

  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

/**
 * Posición del caret después de `digitos` dígitos dentro del texto enmascarado.
 * Se usa para no mandar el cursor al final mientras se edita en el medio.
 */
export function posicionDelCursor(texto: string, digitos: number): number {
  if (digitos <= 0) return 0;

  let vistos = 0;

  for (let i = 0; i < texto.length; i++) {
    if (/\d/.test(texto[i])) vistos++;
    if (vistos === digitos) return i + 1;
  }

  return texto.length;
}
