/**
 * Secciones del back-office que puede habilitar un rol.
 *
 * El nombre coincide con el valor guardado en `public.roles.secciones`
 * (ver supabase/migrations/20261115120000_roles_permisos.sql).
 */
export type SeccionAdmin = 'general' | 'escaner' | 'reporte' | 'log' | 'propuestas' | 'roles';

/** Todas las secciones, en el orden en que se muestran. */
export const SECCIONES_ADMIN: readonly SeccionAdmin[] = [
  'general',
  'escaner',
  'reporte',
  'log',
  'propuestas',
  'roles',
];

/**
 * Secciones que el dueño puede marcar al crear un rol propio.
 * `roles` queda afuera: solo el dueño administra roles.
 */
export const SECCIONES_ASIGNABLES: readonly SeccionAdmin[] = [
  'general',
  'escaner',
  'reporte',
  'log',
  'propuestas',
];

export const ETIQUETAS_SECCION: Record<SeccionAdmin, string> = {
  general: 'General',
  escaner: 'Escáner',
  reporte: 'Reporte',
  log: 'Log',
  propuestas: 'Propuestas',
  roles: 'Administrar roles',
};

/** Roles que trae el sistema. `anonimo` solo existe en el frontend. */
export type RolSistema = 'anonimo' | 'registrado' | 'empleado' | 'admin' | 'dueno';

/**
 * Nombre del rol tal como viene de `profiles.role`.
 *
 * Los roles propios se crean desde /admin/roles, así que el tipo se abre
 * a cualquier texto; los del sistema quedan en `RolSistema`.
 */
export type Rol = RolSistema | (string & {});
