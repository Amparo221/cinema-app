/**
 * Traduce los errores de Postgres/Supabase a mensajes entendibles para el
 * admin de /admin/general. Las funciones son puras para poder testearlas
 * sin tocar la base.
 */

/** Errores de crear/editar películas (triggers de preventa y check de edad). */
export function mensajeErrorPelicula(mensaje: string): string {
  if (mensaje.includes('SIN_SALAS_DISPONIBLES')) {
    return 'No hay salas libres para las funciones del estreno. Probá con otra fecha.';
  }
  if (mensaje.includes('FUNCIONES_CON_VENTAS')) {
    return 'No se puede mover la fecha de estreno: esas funciones ya tienen butacas vendidas o bloqueadas.';
  }
  if (mensaje.includes('PRECIO_PREVENTA_REQUERIDO')) {
    return 'El precio de preventa tiene que ser mayor a cero.';
  }
  if (mensaje.includes('PRECIO_PREVENTA_INVALIDO')) {
    return 'El precio de preventa tiene que ser mayor al precio normal de la butaca.';
  }
  if (mensaje.includes('peliculas_restriccion_edad_check')) {
    return 'La clasificación elegida no es válida. Usá sin restricción, 13+, 16+ o 18+.';
  }
  if (mensaje.includes('PELICULA_NO_ACTUALIZADA')) {
    return 'No se pudo guardar la película: la sesión no tiene permisos de administrador. Volvé a iniciar sesión.';
  }
  if (esErrorDePermisos(mensaje)) {
    return 'No se pudo guardar la película: la sesión no tiene permisos de administrador.';
  }

  return `No se pudo guardar la película: ${mensaje}`;
}

/** Errores de crear/editar recompensas (combos). */
export function mensajeErrorCombo(mensaje: string): string {
  if (mensaje.includes('combos_puntos_check')) {
    return 'Revisá los puntos: el costo Plus tiene que superar al normal y los dos productos deben ser distintos.';
  }
  if (mensaje.includes('23503')) {
    return 'El producto elegido ya no existe. Recargá la página y volvé a intentar.';
  }
  if (mensaje.includes('COMBO_NO_ACTUALIZADO')) {
    return 'No se pudo guardar la recompensa: la sesión no tiene permisos de administrador. Volvé a iniciar sesión.';
  }
  if (esErrorDePermisos(mensaje)) {
    return 'No se pudo guardar la recompensa: la sesión no tiene permisos de administrador.';
  }

  return `No se pudo guardar la recompensa: ${mensaje}`;
}

/** Errores de la RPC `guardar_descuentos`. */
export function mensajeErrorDescuentos(mensaje: string): string {
  if (mensaje.includes('NO_AUTORIZADO')) {
    return 'Solo un administrador puede cambiar los descuentos.';
  }
  if (mensaje.includes('DESCUENTO_INVALIDO')) {
    return 'Los descuentos tienen que ser porcentajes entre 0 y 100.';
  }
  if (mensaje.includes('guardar_descuentos') || mensaje.includes('does not exist')) {
    return 'Falta correr la migración 20261029150000_admin_descuentos.sql en Supabase.';
  }
  if (esErrorDePermisos(mensaje)) {
    return 'No se pudieron guardar los descuentos: la sesión no tiene permisos de administrador.';
  }

  return `No se pudieron guardar los descuentos: ${mensaje}`;
}

function esErrorDePermisos(mensaje: string): boolean {
  const texto = mensaje.toLowerCase();
  return (
    texto.includes('row-level security') ||
    texto.includes('permission denied') ||
    texto.includes('no autorizado')
  );
}
