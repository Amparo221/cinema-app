/**
 * Traduce los fallos de cámara a mensajes para el empleado.
 *
 * `html5-qrcode` casi nunca rechaza con un `Error`: sus fallos son strings
 * ("Error getting userMedia, error = ...", "HTML Element with id=... not
 * found"), así que miramos tanto el `name` de un `DOMException` como el texto.
 */

/** Mensaje de respaldo cuando no reconocemos la causa. */
export const ERROR_CAMARA =
  'No pudimos abrir la cámara. Revisá los permisos del navegador o buscá la entrada con el código manual.';

const SIN_CONTEXTO_SEGURO =
  'El navegador no deja usar la cámara en esta página: abrí la app por https o por localhost y aceptá el permiso.';

const SIN_PERMISO =
  'El navegador bloqueó la cámara. Habilitala desde el candado de la barra de direcciones y volvé a intentar.';

const SIN_CAMARA =
  'No encontramos ninguna cámara conectada. Conectá una y volvé a intentar, o buscá la entrada con el código manual.';

const CAMARA_OCUPADA =
  'Otra aplicación está usando la cámara (Teams, Zoom, Meet). Cerrala y volvé a intentar.';

const CAMARA_INCOMPATIBLE =
  'La cámara no acepta la resolución pedida. Probá con otra cámara o buscá la entrada con el código manual.';

/** `DOMException.name` de cada familia de fallos, siempre en minúsculas. */
const NOMBRES_SIN_CONTEXTO_SEGURO = ['securityerror'];
const NOMBRES_SIN_PERMISO = ['notallowederror', 'permissiondeniederror'];
const NOMBRES_SIN_CAMARA = ['notfounderror', 'devicesnotfounderror'];
const NOMBRES_CAMARA_OCUPADA = ['notreadableerror', 'trackstarterror'];
const NOMBRES_CAMARA_INCOMPATIBLE = ['overconstrainederror', 'constraintnotsatisfiederror'];

/**
 * Restos de los mensajes de la librería y del navegador. Se busca sobre el
 * texto en minúsculas, así que no hacen falta las mayúsculas.
 */
const TEXTOS_SIN_CONTEXTO_SEGURO = [
  'secure context',
  'insecure',
  'requires https',
  'only supported in https',
  'not a secure origin',
  'camera streaming is not supported',
];
const TEXTOS_SIN_PERMISO = ['permission', 'notallowed', 'denied'];
const TEXTOS_SIN_CAMARA = [
  'no camera',
  'camera not found',
  'requested device not found',
  'no video input',
];
const TEXTOS_CAMARA_OCUPADA = [
  'notreadable',
  'could not start video source',
  'trackstart',
  'device in use',
  'in use by another',
];
const TEXTOS_CAMARA_INCOMPATIBLE = ['overconstrained', 'constraint not satisfied'];

/**
 * Devuelve el mensaje que ve el empleado cuando la cámara no arranca.
 * Nunca devuelve un texto vacío: si no reconoce la causa, usa {@link ERROR_CAMARA}.
 */
export function mensajeErrorCamara(causa: unknown): string {
  const nombre = nombreDeError(causa);
  const texto = textoDeError(causa);

  if (coincide(nombre, texto, NOMBRES_SIN_CONTEXTO_SEGURO, TEXTOS_SIN_CONTEXTO_SEGURO)) {
    return SIN_CONTEXTO_SEGURO;
  }
  if (coincide(nombre, texto, NOMBRES_SIN_PERMISO, TEXTOS_SIN_PERMISO)) {
    return SIN_PERMISO;
  }
  if (coincide(nombre, texto, NOMBRES_SIN_CAMARA, TEXTOS_SIN_CAMARA)) {
    return SIN_CAMARA;
  }
  if (coincide(nombre, texto, NOMBRES_CAMARA_OCUPADA, TEXTOS_CAMARA_OCUPADA)) {
    return CAMARA_OCUPADA;
  }
  if (coincide(nombre, texto, NOMBRES_CAMARA_INCOMPATIBLE, TEXTOS_CAMARA_INCOMPATIBLE)) {
    return CAMARA_INCOMPATIBLE;
  }

  return ERROR_CAMARA;
}

function nombreDeError(causa: unknown): string {
  if (typeof causa === 'object' && causa !== null && 'name' in causa) {
    const { name } = causa as { name?: unknown };
    if (typeof name === 'string') return name.toLowerCase();
  }
  return '';
}

function textoDeError(causa: unknown): string {
  if (typeof causa === 'string') return causa.toLowerCase();
  if (causa instanceof Error) return `${causa.name} ${causa.message}`.toLowerCase();
  if (typeof causa === 'object' && causa !== null && 'message' in causa) {
    const { message } = causa as { message?: unknown };
    if (typeof message === 'string') return message.toLowerCase();
  }
  return '';
}

function coincide(nombre: string, texto: string, nombres: string[], textos: string[]): boolean {
  return nombres.includes(nombre) || textos.some((clave) => texto.includes(clave));
}
