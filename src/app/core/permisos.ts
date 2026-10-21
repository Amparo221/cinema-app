import { Rol } from '../models/rol.model';

export type SeccionAdmin = 'general' | 'escaner' | 'reporte' | 'log';

export const SECCIONES_ADMIN: readonly SeccionAdmin[] = [
  'general',
  'escaner',
  'reporte',
  'log',
];

/**
 * Permisos por rol.
 *
 * Por ahora viven en el frontend porque los roles son fijos. Cuando el admin
 * pueda configurar permisos desde la base de datos, este mapa se reemplazará
 * por la consulta correspondiente sin cambiar la firma de `tienePermiso`.
 */
const PERMISOS_POR_ROL: Record<Rol, readonly SeccionAdmin[]> = {
  anonimo: [],
  registrado: [],
  empleado: ['escaner'],
  admin: SECCIONES_ADMIN,
};

export function permisosDeRol(rol: Rol): readonly SeccionAdmin[] {
  return PERMISOS_POR_ROL[rol] ?? [];
}

export function tienePermiso(rol: Rol, seccion: SeccionAdmin): boolean {
  return permisosDeRol(rol).includes(seccion);
}
