import { Rol, SECCIONES_ADMIN, SeccionAdmin } from '../models/rol.model';

export { ETIQUETAS_SECCION, SECCIONES_ADMIN, SECCIONES_ASIGNABLES } from '../models/rol.model';
export type { RolSistema, SeccionAdmin } from '../models/rol.model';

/**
 * Secciones de los roles del sistema.
 *
 * Es solo un respaldo: la verdad la tiene `public.roles` y la carga
 * `SessionService` al iniciar sesión. Se usa cuando la consulta falla,
 * así la app sigue funcionando aunque el back-office no responda.
 */
const SECCIONES_POR_ROL_SISTEMA: Readonly<Record<string, readonly SeccionAdmin[]>> = {
  anonimo: [],
  registrado: [],
  empleado: ['escaner'],
  admin: ['general', 'escaner', 'reporte', 'log', 'propuestas'],
  dueno: SECCIONES_ADMIN,
};

/** Ruta a la que entra cada sección, en orden de preferencia. */
const DESTINOS: readonly { seccion: SeccionAdmin; ruta: string }[] = [
  { seccion: 'general', ruta: '/admin/general' },
  { seccion: 'escaner', ruta: '/escaner' },
  { seccion: 'propuestas', ruta: '/admin/propuestas' },
  { seccion: 'reporte', ruta: '/admin/reporte' },
  { seccion: 'log', ruta: '/admin/log' },
  { seccion: 'roles', ruta: '/admin/roles' },
];

/** Secciones de un rol del sistema (respaldo y tests). */
export function seccionesDeRolSistema(rol: Rol): readonly SeccionAdmin[] {
  return SECCIONES_POR_ROL_SISTEMA[rol] ?? [];
}

/**
 * Deja solo las secciones conocidas.
 * La base puede traer valores de versiones nuevas; el frontend ignora
 * lo que no sabe dibujar en vez de romperse.
 */
export function normalizarSecciones(
  valores: readonly string[] | null | undefined,
): SeccionAdmin[] {
  return (valores ?? []).filter((valor): valor is SeccionAdmin =>
    (SECCIONES_ADMIN as readonly string[]).includes(valor),
  );
}

export function tienePermiso(
  secciones: readonly SeccionAdmin[] | null | undefined,
  seccion: SeccionAdmin,
): boolean {
  return (secciones ?? []).includes(seccion);
}

/** Primera pantalla que le corresponde al usuario según sus permisos. */
export function rutaInicial(secciones: readonly SeccionAdmin[] | null | undefined): string {
  return DESTINOS.find((destino) => tienePermiso(secciones, destino.seccion))?.ruta ?? '/main';
}

