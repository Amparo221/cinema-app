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

/** Errores de las RPC de programación de funciones. */
export function mensajeErrorFunciones(mensaje: string): string {
  if (mensaje.includes('NO_AUTORIZADO')) {
    return 'Solo un administrador puede programar funciones.';
  }
  if (mensaje.includes('FUNCION_SOLAPADA')) {
    return 'La sala ya está ocupada en ese horario. Dejá 30 minutos entre funciones.';
  }
  if (mensaje.includes('SIN_SALAS_DISPONIBLES')) {
    return 'No hay salas libres para todos los horarios elegidos. Probá con otra fecha u horario.';
  }
  if (mensaje.includes('RANGO_INVALIDO')) {
    return 'El rango de fechas no es válido para esta película. Revisá desde, hasta y la fecha de estreno.';
  }
  if (mensaje.includes('DIAS_INVALIDOS')) {
    return 'Elegí al menos un día de la semana.';
  }
  if (mensaje.includes('CANTIDAD_INVALIDA')) {
    return 'La cantidad de funciones por día tiene que estar entre 1 y 12.';
  }
  if (mensaje.includes('VENTANA_INVALIDA') || mensaje.includes('VENTANA_INSUFICIENTE')) {
    return 'La ventana horaria no alcanza para la duración de la película más 30 minutos entre funciones.';
  }
  if (mensaje.includes('SIN_TIPOS') || mensaje.includes('TIPO_INVALIDO')) {
    return 'Revisá los idiomas y formatos elegidos: Doblada/Subtitulada y 2D/3D/4D/5D.';
  }
  if (mensaje.includes('SIN_FECHAS') || mensaje.includes('SIN_FUNCIONES')) {
    return 'No hay fechas u horarios para programar.';
  }
  if (mensaje.includes('FUNCION_DUPLICADA')) {
    return 'La película ya tiene una función en ese horario.';
  }
  if (mensaje.includes('FUNCION_EN_PASADO')) {
    return 'Alguna fecha es anterior al mínimo permitido: hoy o la fecha de estreno.';
  }
  if (mensaje.includes('LIMITE_EXCEDIDO')) {
    return 'El lote de funciones es demasiado grande. Achicá el rango o la cantidad de horarios.';
  }
  if (mensaje.includes('PELICULA_INEXISTENTE')) {
    return 'La película ya no existe. Recargá la página y volvé a intentar.';
  }
  if (mensaje.includes('SALA_INEXISTENTE')) {
    return 'La sala elegida ya no existe. Recargá la página y volvé a intentar.';
  }
  if (
    mensaje.includes('generar_funciones_automaticas') ||
    mensaje.includes('crear_funciones_manuales') ||
    mensaje.includes('does not exist')
  ) {
    return 'Falta correr la migración 20261114160000_funciones_programacion.sql en Supabase.';
  }
  if (esErrorDePermisos(mensaje)) {
    return 'No se pudieron programar las funciones: la sesión no tiene permisos de administrador.';
  }

  return `No se pudieron programar las funciones: ${mensaje}`;
}

/** Errores de la RPC `cancelar_funcion`. */
export function mensajeErrorCancelarFuncion(mensaje: string): string {
  if (mensaje.includes('NO_AUTORIZADO')) {
    return 'Solo un administrador puede cancelar funciones.';
  }
  if (mensaje.includes('FUNCION_INEXISTENTE')) {
    return 'La función ya no existe. Recargá la página y volvé a intentar.';
  }
  if (mensaje.includes('FUNCION_YA_CANCELADA')) {
    return 'Esa función ya estaba cancelada.';
  }
  if (mensaje.includes('FUNCION_EN_PASADO')) {
    return 'La función ya comenzó: no se puede cancelar.';
  }
  if (
    mensaje.includes('cancelar_funcion') ||
    mensaje.includes('cancelada_at') ||
    mensaje.includes('does not exist')
  ) {
    return 'Falta correr la migración 20261114170000_cancelar_funcion.sql en Supabase.';
  }
  if (esErrorDePermisos(mensaje)) {
    return 'No se pudo cancelar la función: la sesión no tiene permisos de administrador.';
  }

  return `No se pudo cancelar la función: ${mensaje}`;
}

function esErrorDePermisos(mensaje: string): boolean {
  const texto = mensaje.toLowerCase();
  return (
    texto.includes('row-level security') ||
    texto.includes('permission denied') ||
    texto.includes('no autorizado')
  );
}
