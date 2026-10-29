/**
 * Descuentos sobre las butacas. Se guardan en `configuracion` con las
 * claves `descuento_primera_compra` y `descuento_cincuenta` y se editan
 * desde /admin/general.
 */
export interface Descuentos {
  /** Porcentaje para la primera compra del usuario registrado. */
  primeraCompra: number;
  /** Porcentaje para mayores de 50 años. */
  cincuenta: number;
}

/** Claves de `configuracion` que se editan en /admin/general. */
export const CLAVE_DESCUENTO_PRIMERA_COMPRA = 'descuento_primera_compra';
export const CLAVE_DESCUENTO_CINCUENTA = 'descuento_cincuenta';

/** Porcentajes por defecto cuando la clave no existe en `configuracion`. */
export const DESCUENTO_PRIMERA_COMPRA_DEFAULT = 20;
export const DESCUENTO_CINCUENTA_DEFAULT = 15;

export const DESCUENTO_MINIMO = 0;
export const DESCUENTO_MAXIMO = 100;

/** Arma los descuentos vigentes a partir de la tabla `configuracion`. */
export function descuentosDeConfiguracion(config: Record<string, number>): Descuentos {
  return {
    primeraCompra:
      config[CLAVE_DESCUENTO_PRIMERA_COMPRA] ?? DESCUENTO_PRIMERA_COMPRA_DEFAULT,
    cincuenta: config[CLAVE_DESCUENTO_CINCUENTA] ?? DESCUENTO_CINCUENTA_DEFAULT,
  };
}

/** Un porcentaje válido es un número entero entre 0 y 100. */
export function esPorcentajeValido(valor: number | null | undefined): boolean {
  if (valor === null || valor === undefined) return false;
  if (!Number.isFinite(valor)) return false;
  return valor >= DESCUENTO_MINIMO && valor <= DESCUENTO_MAXIMO;
}
