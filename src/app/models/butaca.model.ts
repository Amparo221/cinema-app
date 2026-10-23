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
