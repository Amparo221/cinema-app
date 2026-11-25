import { SeccionAdmin } from './rol.model';

/**
 * Tipos del administrador de roles (/admin/roles).
 *
 * Solo el dueño (rol con la sección `roles`) puede usar estas RPC.
 * Ver supabase/migrations/20261115120000_roles_permisos.sql.
 */

/** Fila de `public.roles` con la cantidad de usuarios asignados. */
export interface RolAdmin {
  nombre: string;
  etiqueta: string;
  secciones: SeccionAdmin[];
  /**
   * Los roles del sistema no se renombran ni se eliminan. `empleado` y
   * `admin` sí admiten cambios de etiqueta y secciones (ver
   * `puedeEditarRol`).
   */
  es_sistema: boolean;
  usuarios: number;
}

/** Usuario de la tabla de asignación (RPC `listar_usuarios`). */
export interface UsuarioRol {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  rol_etiqueta: string;
  /** Total de filas que cumplen la búsqueda (viene repetido en cada fila). */
  total: number;
}

/** Campos del formulario de rol. */
export interface DatosRol {
  nombre: string;
  etiqueta: string;
  secciones: SeccionAdmin[];
}

export type ErroresRol = Partial<Record<keyof DatosRol, string>>;

/** Mismo formato que valida la base en `crear_rol`. */
export const NOMBRE_ROL_REGEX = /^[a-z][a-z0-9_]{2,29}$/;

export const USUARIOS_POR_PAGINA = 10;

/**
 * Roles del sistema que no se pueden editar: el dueño siempre entra y
 * `registrado` es el rol de los clientes (no ve el panel).
 */
export const ROLES_PROTEGIDOS: readonly string[] = ['dueno', 'registrado'];

/** `true` cuando el rol es del sistema y además es intocable. */
export function esRolProtegido(rol: Pick<RolAdmin, 'nombre' | 'es_sistema'>): boolean {
  return rol.es_sistema && ROLES_PROTEGIDOS.includes(rol.nombre);
}

/** `empleado`, `admin` y los roles propios se pueden editar. */
export function puedeEditarRol(rol: Pick<RolAdmin, 'nombre' | 'es_sistema'>): boolean {
  return !esRolProtegido(rol);
}

/** Eliminar sigue estando reservado a los roles creados por el dueño. */
export function puedeEliminarRol(rol: Pick<RolAdmin, 'es_sistema'>): boolean {
  return !rol.es_sistema;
}

export function validarRol(datos: DatosRol, esEdicion: boolean): ErroresRol {
  const errores: ErroresRol = {};

  // El nombre es la clave primaria: al editar no se toca.
  if (!esEdicion && !NOMBRE_ROL_REGEX.test(datos.nombre.trim().toLowerCase())) {
    errores.nombre =
      'De 3 a 30 caracteres en minúsculas, números o guión bajo, empezando con una letra.';
  }

  const etiqueta = datos.etiqueta.trim();
  if (etiqueta.length < 1 || etiqueta.length > 40) {
    errores.etiqueta = 'La etiqueta necesita entre 1 y 40 caracteres.';
  }

  if (datos.secciones.length === 0) {
    errores.secciones = 'Elegí al menos una sección.';
  }

  return errores;
}

export function hayErroresRol(errores: ErroresRol): boolean {
  return Object.keys(errores).length > 0;
}

/** Traduce los errores de Postgres a algo legible. */
export function mensajeErrorRol(mensaje: string): string {
  const codigo = mensaje.toUpperCase();

  if (codigo.includes('ROL_EXISTENTE')) {
    return 'Ya existe un rol con ese nombre.';
  }

  if (codigo.includes('ROL_PROTEGIDO')) {
    return 'Ese rol es la base de los permisos: no se puede editar ni eliminar.';
  }

  if (codigo.includes('ROL_SISTEMA')) {
    return 'Los roles del sistema no se pueden editar ni eliminar.';
  }

  if (codigo.includes('ROL_EN_USO')) {
    return 'El rol tiene usuarios asignados. Cambiales el rol antes de eliminarlo.';
  }

  if (codigo.includes('ROL_NO_EXISTE')) {
    return 'El rol ya no existe. Recargá la lista.';
  }

  if (codigo.includes('ROL_PROPIO')) {
    return 'No podés cambiarte el rol a vos mismo.';
  }

  if (codigo.includes('USUARIO_NO_EXISTE')) {
    return 'El usuario ya no existe. Recargá la lista.';
  }

  if (codigo.includes('SECCIONES_INVALIDAS')) {
    return 'Elegí al menos una sección válida.';
  }

  if (codigo.includes('NOMBRE_INVALIDO')) {
    return 'El nombre del rol no es válido.';
  }

  if (codigo.includes('ETIQUETA_INVALIDA')) {
    return 'La etiqueta del rol no es válida.';
  }

  if (codigo.includes('NO_AUTORIZADO')) {
    return 'Solo el dueño puede administrar roles.';
  }

  return 'No se pudo completar la acción. Intentá nuevamente.';
}

/** Nombre legible del usuario; cae al email cuando no cargó nombre. */
export function nombreCompleto(
  usuario: Pick<UsuarioRol, 'nombre' | 'apellido' | 'email'>,
): string {
  const nombre = `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.trim();
  return nombre || usuario.email;
}

/** Para la tabla de usuarios: nunca se puede tocar el rol propio. */
export function puedeAsignarRolA(usuarioId: string, usuarioActualId: string | undefined): boolean {
  return usuarioId !== usuarioActualId;
}
