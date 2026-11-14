/** Traduce los errores de las RPC de reportes a mensajes para el admin. */
export function mensajeErrorReporte(mensaje: string): string {
  if (mensaje.includes('NO_AUTORIZADO')) {
    return 'Solo un administrador puede ver los reportes.';
  }
  if (mensaje.includes('RANGO_INVALIDO')) {
    return 'El rango de fechas no es válido.';
  }
  if (mensaje.includes('AGRUPACION_INVALIDA')) {
    return 'La agrupación tiene que ser semanal o mensual.';
  }
  if (mensaje.includes('PGRST202') || mensaje.includes('Could not find the function')) {
    return 'Faltan aplicar las migraciones de reportes en Supabase (20261114120000_reportes_admin.sql).';
  }
  if (mensaje.includes('Failed to fetch') || mensaje.includes('fetch failed')) {
    return 'No se pudo conectar con Supabase. Revisá la conexión e intentá de nuevo.';
  }
  return `No se pudieron cargar los reportes: ${mensaje}`;
}
