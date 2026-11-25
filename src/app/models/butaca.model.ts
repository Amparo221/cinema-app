export type TipoButaca = 'normal' | 'accesible' | 'vip';
export const FILAS_ACCESIBLES = ['J', 'K'] as const;
export const FILAS_VIP = ['R', 'S', 'T'] as const;

/** Tipo de butaca a partir de la letra de la fila. */
export function tipoButacaPorFila(fila: string): TipoButaca {
  const letra = fila.trim().toUpperCase();
  if ((FILAS_ACCESIBLES as readonly string[]).includes(letra)) return 'accesible';
  if ((FILAS_VIP as readonly string[]).includes(letra)) return 'vip';
  return 'normal';
}

/** true si el codigo (ej. 'R12') pertenece a una fila VIP. */
export function esButacaVip(codigo: string): boolean {
  if (!codigo) return false;
  return tipoButacaPorFila(codigo.charAt(0)) === 'vip';
}



export interface Butaca {
  codigo: string;     // ej: 'A1', 'J11', 'T30'
  fila: string;       // ej: 'A', 'J', 'T'
  columna: number;    // 1..30
  tipo: TipoButaca;
}

/** Filas de la sala, de la A a la T. */
export const FILAS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
  'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
] as const;

/** Butacas de una fila comun: 4 + 20 + 4 (pasillo en 5 y 26). */
function columnasNormales(): number[] {
  const columnas: number[] = [];
  for (let col = 1; col <= 4; col++) columnas.push(col);
  for (let col = 6; col <= 25; col++) columnas.push(col);
  for (let col = 27; col <= 30; col++) columnas.push(col);
  return columnas;
}

/** Filas accesibles (J y K): 2 + 10 + 2 butacas, sin las del medio. */
function columnasAccesibles(): number[] {
  return [2, 3, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 28, 29];
}

/**
 * Layout completo de la sala. Es la unica fuente de verdad: el mapa de
 * butacas y la seleccion masiva de prueba salen de aca.
 */
export function generarButacas(): Butaca[] {
  const butacas: Butaca[] = [];

  for (const fila of FILAS) {
    const tipo = tipoButacaPorFila(fila);
    const columnas = tipo === 'accesible' ? columnasAccesibles() : columnasNormales();

    for (const columna of columnas) {
      butacas.push({ codigo: `${fila}${columna}`, fila, columna, tipo });
    }
  }

  return butacas;
}

/** Todas las butacas de la sala, generadas una sola vez. */
export const BUTACAS: readonly Butaca[] = generarButacas();

/** Total de butacas de la sala (532). */
export const TOTAL_BUTACAS = BUTACAS.length;

/**
 * Codigos de las butacas que siguen libres: descuenta las vendidas y las
 * reservadas por otras personas.
 */
export function butacasLibres(
  vendidas: readonly string[],
  reservadas: readonly string[] = [],
): string[] {
  const ocupadas = new Set<string>([...vendidas, ...reservadas]);
  return BUTACAS.filter((butaca) => !ocupadas.has(butaca.codigo)).map(
    (butaca) => butaca.codigo,
  );
}

export type EstadoButaca = 'bloqueada' | 'vendida';

/** Fila que devuelve la RPC estado_butacas. */
export interface FilaEstadoButaca {
  codigo_butaca: string;
  estado: EstadoButaca;
  propia: boolean;
  expira_at: string | null;
}

/** Estado ya separado para pintar el mapa. */
export interface OcupacionButacas {
  vendidas: string[];
  reservadas: string[];
  propias: string[];
}

/**
 * Convierte la respuesta plana de Postgres en listas faciles de usar.
 * Los bloqueos vencidos se ignoran aunque la fila todavia exista.
 */
export function mapearOcupacion(
  filas: FilaEstadoButaca[],
  ahora: number = Date.now()
): OcupacionButacas {
  const vendidas = new Set<string>();
  const reservadas = new Set<string>();
  const propias = new Set<string>();

  for (const fila of filas) {
    if (fila.estado === 'vendida') {
      vendidas.add(fila.codigo_butaca);
      continue;
    }

    const vencida = fila.expira_at !== null && new Date(fila.expira_at).getTime() <= ahora;
    if (vencida) continue;

    if (fila.propia) {
      propias.add(fila.codigo_butaca);
    } else {
      reservadas.add(fila.codigo_butaca);
    }
  }

  return {
    vendidas: [...vendidas],
    reservadas: [...reservadas],
    propias: [...propias],
  };
}
