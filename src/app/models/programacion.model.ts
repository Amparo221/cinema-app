/**
 * Programación de funciones desde /admin/general.
 *
 * Los helpers son puros para poder testearlos sin tocar Supabase y
 * replican las reglas de las RPC `generar_funciones_automaticas` y
 * `crear_funciones_manuales`.
 */

export const FORMATOS_FUNCION = ['2D', '3D', '4D', '5D'] as const;
export const IDIOMAS_FUNCION = ['castellano', 'subtitulada'] as const;

/** Minutos de limpieza que necesita una sala entre funciones. */
export const MARGEN_ENTRE_FUNCIONES = 30;

/** Máximo de funciones por lote (mismo tope que las RPC). */
export const MAXIMO_FUNCIONES_AUTOMATICAS = 200;
export const MAXIMO_FUNCIONES_MANUALES = 100;

export type FormatoFuncion = (typeof FORMATOS_FUNCION)[number];
export type IdiomaFuncion = (typeof IDIOMAS_FUNCION)[number];
export type ModoProgramacion = 'automatica' | 'manual';

export interface TipoFuncion {
  formato: FormatoFuncion;
  idioma: IdiomaFuncion;
}

/** Una función concreta elegida a mano. */
export interface FuncionProgramada {
  fecha: string;
  hora: string;
  formato: FormatoFuncion;
  idioma: IdiomaFuncion;
}

export interface SolicitudAutomatica {
  modo: 'automatica';
  desde: string;
  hasta: string;
  /** 0 = domingo … 6 = sábado, igual que `extract(dow)`. */
  diasSemana: number[];
  /** Funciones por cada día seleccionado. */
  porDia: number;
  horaInicio: string;
  horaFin: string;
  tipos: TipoFuncion[];
}

export interface SolicitudManual {
  modo: 'manual';
  funciones: FuncionProgramada[];
}

export type SolicitudFunciones = SolicitudAutomatica | SolicitudManual;

export interface FuncionCreada {
  id: number;
  fecha: string;
  hora: string;
  sala: string | null;
  formato: string | null;
  idioma: string | null;
}

export interface FuncionOmitida {
  fecha: string;
  hora: string;
  motivo: 'YA_EXISTE' | 'SIN_SALA' | string;
}

export interface ResultadoFunciones {
  creadas: FuncionCreada[];
  omitidas: FuncionOmitida[];
  desde_efectivo?: string | null;
}

/** Función existente que puede chocar con una propuesta. */
export interface FuncionOcupada {
  id: number;
  fecha: string;
  hora: string;
  sala_id: number;
  salas?: { nombre: string } | null;
  peliculas?: { nombre: string; duracion: number | null } | null;
}

export interface ConflictoFuncion {
  funcion: FuncionProgramada;
  mensaje: string;
}

export interface DiaSemana {
  valor: number;
  corto: string;
  largo: string;
}

/** Orden lunes a domingo; `valor` es el día de `extract(dow)`. */
export const DIAS_SEMANA: readonly DiaSemana[] = [
  { valor: 1, corto: 'Lun', largo: 'lunes' },
  { valor: 2, corto: 'Mar', largo: 'martes' },
  { valor: 3, corto: 'Mié', largo: 'miércoles' },
  { valor: 4, corto: 'Jue', largo: 'jueves' },
  { valor: 5, corto: 'Vie', largo: 'viernes' },
  { valor: 6, corto: 'Sáb', largo: 'sábado' },
  { valor: 0, corto: 'Dom', largo: 'domingo' },
];

export const ETIQUETAS_IDIOMA: Record<IdiomaFuncion, string> = {
  castellano: 'Doblada',
  subtitulada: 'Subtitulada',
};

/** “Doblada 2D”, “Subtitulada 3D”, etc. */
export function etiquetaTipo(tipo: TipoFuncion): string {
  return `${ETIQUETAS_IDIOMA[tipo.idioma]} ${tipo.formato}`;
}

/** Etiqueta legible de lo que viene de la base (`castellano`, `subtitulada`). */
export function etiquetaIdioma(idioma: string | null): string {
  if (idioma === 'castellano') return ETIQUETAS_IDIOMA.castellano;
  if (idioma === 'subtitulada') return ETIQUETAS_IDIOMA.subtitulada;
  return idioma ?? '—';
}

/** “20:30” a partir de `HH:mm` o `HH:mm:ss`. */
export function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

/** Minutos desde medianoche; null si el texto no es una hora válida. */
export function minutosDeHora(hora: string): number | null {
  const partes = /^(\d{1,2}):(\d{2})/.exec(hora.trim());
  if (!partes) return null;

  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  if (horas > 23 || minutos > 59) return null;

  return horas * 60 + minutos;
}

export function horaDeMinutos(minutos: number): string {
  const horas = Math.floor(minutos / 60) % 24;
  const resto = minutos % 60;
  return `${String(horas).padStart(2, '0')}:${String(resto).padStart(2, '0')}`;
}

/** Fecha ISO en UTC para evitar corrimientos por zona horaria. */
function fechaUTC(fecha: string): Date | null {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) return null;

  const valor = new Date(Date.UTC(anio, mes - 1, dia));
  if (Number.isNaN(valor.getTime())) return null;

  // Rechaza fechas imposibles tipo 2026-02-31.
  if (valor.getUTCMonth() !== mes - 1 || valor.getUTCDate() !== dia) return null;

  return valor;
}

export function sumarDias(fecha: string, dias: number): string {
  const valor = fechaUTC(fecha);
  if (!valor) return fecha;

  valor.setUTCDate(valor.getUTCDate() + dias);
  return valor.toISOString().slice(0, 10);
}

/** Día de la semana (0 = domingo) de una fecha ISO. */
export function diaSemanaDe(fecha: string): number | null {
  return fechaUTC(fecha)?.getUTCDay() ?? null;
}

/** Fechas del rango que caen en alguno de los días elegidos. */
export function fechasEnRango(
  desde: string,
  hasta: string,
  diasSemana: readonly number[]
): string[] {
  const inicio = fechaUTC(desde);
  const fin = fechaUTC(hasta);
  if (!inicio || !fin || inicio > fin) return [];

  const dias = new Set(diasSemana);
  const fechas: string[] = [];
  const cursor = new Date(inicio.getTime());

  // Tope defensivo: un año. La RPC valida el mismo límite.
  while (cursor <= fin && fechas.length < 366) {
    if (dias.has(cursor.getUTCDay())) {
      fechas.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return fechas;
}

export interface OpcionesHorarios {
  duracion: number;
  porDia: number;
  horaInicio: string;
  horaFin: string;
}

/**
 * Horarios que se van a generar en cada día.
 *
 * La última función tiene que terminar antes de `horaFin` y entre
 * dos funciones tienen que pasar la duración + 30 minutos. Devuelve
 * una lista vacía si la ventana no alcanza.
 */
export function horariosDelDia(opciones: OpcionesHorarios): string[] {
  const inicio = minutosDeHora(opciones.horaInicio);
  const fin = minutosDeHora(opciones.horaFin);
  if (inicio === null || fin === null || inicio >= fin) return [];

  const duracion = Math.max(30, opciones.duracion || 0);
  const porDia = Math.floor(opciones.porDia);
  if (!Number.isFinite(porDia) || porDia < 1) return [];

  const disponible = fin - inicio - duracion;
  if (disponible < 0) return [];

  if (porDia === 1) return [horaDeMinutos(inicio)];

  const paso = Math.floor(disponible / (porDia - 1) / 5) * 5;
  if (paso < duracion + MARGEN_ENTRE_FUNCIONES) return [];

  return Array.from({ length: porDia }, (_, indice) =>
    horaDeMinutos(inicio + indice * paso)
  );
}

/** Producto cartesiano de idiomas y formatos elegidos. */
export function combinarTipos(
  idiomas: readonly IdiomaFuncion[],
  formatos: readonly FormatoFuncion[]
): TipoFuncion[] {
  const tipos: TipoFuncion[] = [];

  for (const idioma of IDIOMAS_FUNCION) {
    if (!idiomas.includes(idioma)) continue;

    for (const formato of FORMATOS_FUNCION) {
      if (!formatos.includes(formato)) continue;
      tipos.push({ idioma, formato });
    }
  }

  return tipos;
}

/**
 * Todas las funciones del modo manual: cada fecha × cada horario.
 * Los tipos se reparten en orden para alternar doblada/subtitulada.
 */
export function combinarFuncionesManuales(
  fechas: readonly string[],
  horas: readonly string[],
  tipos: readonly TipoFuncion[]
): FuncionProgramada[] {
  if (tipos.length === 0) return [];

  const funciones: FuncionProgramada[] = [];
  let indice = 0;

  for (const fecha of [...fechas].sort()) {
    for (const hora of [...horas].sort()) {
      const tipo = tipos[indice % tipos.length];
      indice += 1;
      if (!tipo) continue;

      funciones.push({ fecha, hora, formato: tipo.formato, idioma: tipo.idioma });
    }
  }

  return funciones;
}

export function claveFuncion(funcion: FuncionProgramada): string {
  return `${funcion.fecha}|${funcion.hora}|${funcion.formato}|${funcion.idioma}`;
}

/** Minutos absolutos desde epoch para comparar fechas + horas. */
function inicioEnMinutos(fecha: string, hora: string): number | null {
  const dia = fechaUTC(fecha);
  const minutos = minutosDeHora(hora);
  if (!dia || minutos === null) return null;

  return dia.getTime() / 60000 + minutos;
}

/**
 * Choques de las propuestas contra las funciones ya programadas.
 * Respeta el margen de 30 minutos de la sala.
 */
export function detectarConflictos(
  propuestas: readonly FuncionProgramada[],
  ocupadas: readonly FuncionOcupada[],
  duracion: number
): ConflictoFuncion[] {
  const duracionPropia = Math.max(30, duracion || 0);
  const conflictos: ConflictoFuncion[] = [];

  for (const propuesta of propuestas) {
    const inicio = inicioEnMinutos(propuesta.fecha, propuesta.hora);
    if (inicio === null) continue;

    const fin = inicio + duracionPropia + MARGEN_ENTRE_FUNCIONES;

    const choque = ocupadas.find(ocupada => {
      const inicioOcupado = inicioEnMinutos(ocupada.fecha, ocupada.hora);
      if (inicioOcupado === null) return false;

      const duracionOcupada = Math.max(30, ocupada.peliculas?.duracion ?? 90);
      const finOcupado = inicioOcupado + duracionOcupada + MARGEN_ENTRE_FUNCIONES;

      return inicio < finOcupado && fin > inicioOcupado;
    });

    if (!choque) continue;

    const sala = choque.salas?.nombre ?? `Sala ${choque.sala_id}`;
    const pelicula = choque.peliculas?.nombre ?? 'otra película';

    conflictos.push({
      funcion: propuesta,
      mensaje:
        `Se superpone con "${pelicula}" (${sala}, ${horaCorta(choque.hora)}). ` +
        'Dejá 30 minutos entre funciones.',
    });
  }

  return conflictos;
}

/** Texto del aviso posterior a la generación. */
export function resumenGeneracion(resultado: ResultadoFunciones): string {
  const creadas = resultado.creadas.length;
  const omitidas = resultado.omitidas.length;

  if (creadas === 0 && omitidas === 0) {
    return 'No se creó ninguna función.';
  }

  if (creadas === 0) {
    return `No se pudo crear ninguna función: ${omitidas} horarios quedaron sin sala libre.`;
  }

  const base = creadas === 1 ? 'Se creó 1 función.' : `Se crearon ${creadas} funciones.`;
  if (omitidas === 0) return base;

  return `${base} ${omitidas} ${omitidas === 1 ? 'quedó' : 'quedaron'} sin sala libre.`;
}

/** Lo que devuelve la RPC `cancelar_funcion`. */
export interface ResultadoCancelacionFuncion {
  /** Compras afectadas (registradas y anónimas). */
  compras: number;
  /** Butacas liberadas. */
  entradas: number;
  /** Cuentas que recibieron el crédito. */
  usuarios: number;
  /** Compras anónimas: no tienen cuenta para acreditar. */
  anonimas: number;
  /** Dinero y créditos usados que se devolvieron como crédito. */
  credito: number;
  /** Puntos de combos que volvieron al perfil. */
  puntos_devueltos: number;
  /** Puntos que se habían ganado con la compra y se descuentan. */
  puntos_ganados: number;
}

export interface FuncionCancelable {
  fecha: string;
  hora: string;
}

const formatoCredito = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatoEntero = new Intl.NumberFormat('es-AR');

/**
 * `true` si la función todavía no empezó. El admin no puede cancelar una
 * función en curso: los compradores ya estarían en la sala.
 */
export function puedeCancelarFuncion(funcion: FuncionCancelable, ahora = new Date()): boolean {
  const hora = funcion.hora.length >= 5 ? funcion.hora.slice(0, 5) : funcion.hora;
  const inicio = new Date(`${funcion.fecha}T${hora}`);

  if (Number.isNaN(inicio.getTime())) return false;

  return inicio.getTime() > ahora.getTime();
}

/** Texto del aviso posterior a la cancelación de una función. */
export function resumenCancelacion(resultado: ResultadoCancelacionFuncion): string {
  const compras = numero(resultado.compras);
  const entradas = numero(resultado.entradas);
  const usuarios = numero(resultado.usuarios);
  const anonimas = numero(resultado.anonimas);
  const credito = Number(resultado.credito) || 0;
  const puntosDevueltos = numero(resultado.puntos_devueltos);
  const puntosGanados = numero(resultado.puntos_ganados);

  if (compras === 0) {
    return 'Función cancelada. No había compras para esa función.';
  }

  if (usuarios === 0) {
    return (
      'Función cancelada. Las compras eran anónimas: no hay cuenta para acreditar,' +
      ' pero las butacas quedaron libres.'
    );
  }

  const cuentas = usuarios === 1 ? '1 cuenta' : `${formatoEntero.format(usuarios)} cuentas`;
  const butacas = entradas === 1 ? '1 butaca' : `${formatoEntero.format(entradas)} butacas`;

  let mensaje =
    `Función cancelada. Se acreditaron ${formatoCredito.format(credito)}` +
    ` en ${cuentas} (${butacas}).`;

  if (puntosDevueltos > 0) {
    mensaje += ` Se devolvieron ${formatoEntero.format(puntosDevueltos)} puntos de combos.`;
  }

  if (puntosGanados > 0) {
    mensaje +=
      ` Se descontaron ${formatoEntero.format(puntosGanados)} puntos` +
      ' ganados con esa compra.';
  }

  if (anonimas > 0) {
    mensaje +=
      ` ${anonimas === 1 ? 'Quedó 1 compra anónima' : `Quedaron ${anonimas} compras anónimas`}` +
      ' sin acreditar.';
  }

  return mensaje;
}

/** Postgres puede devolver los conteos como string. */
function numero(valor: unknown): number {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? Math.trunc(convertido) : 0;
}
