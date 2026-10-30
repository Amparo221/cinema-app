/**
 * Traduce los errores de las RPC del escáner a mensajes para el empleado.
 * Las funciones son puras para poder testearlas sin tocar la base.
 */
export function mensajeErrorEscaner(mensaje: string): string {
  const texto = mensaje ?? '';

  if (texto.includes('SIN_PERMISO')) {
    return 'Tu usuario no puede validar entradas. Pedile a un administrador que te asigne el rol empleado.';
  }
  if (texto.includes('QR_NO_ENCONTRADO')) {
    return 'Este QR no corresponde a ninguna compra. Revisá que sea el recibo de este cine.';
  }
  if (texto.includes('QR_YA_USADO')) {
    return 'Esta entrada ya fue usada: el QR está desactivado.';
  }
  if (texto.includes('QR_CANCELADA')) {
    return 'Esta compra fue cancelada: no se puede dar paso.';
  }
  if (texto.includes('QR_INVALIDO')) {
    return 'No leímos ningún código. Acercá el QR a la cámara e intentá de nuevo.';
  }
  if (texto.includes('does not exist') || texto.includes('schema cache')) {
    return 'Falta correr la migración 20261029160000_escaner_entradas.sql en Supabase.';
  }
  if (esErrorDePermisos(texto)) {
    return 'No tenés permisos para validar entradas. Volvé a iniciar sesión.';
  }

  return 'No pudimos validar la entrada. Intentá de nuevo.';
}

function esErrorDePermisos(mensaje: string): boolean {
  const texto = mensaje.toLowerCase();
  return (
    texto.includes('row-level security') ||
    texto.includes('permission denied') ||
    texto.includes('no autorizado')
  );
}
