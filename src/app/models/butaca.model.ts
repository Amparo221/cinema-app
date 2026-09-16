export type TipoButaca = 'normal' | 'accesible' | 'vip';

export interface Butaca {
  codigo: string;     // ej: 'A1', 'J11', 'T30'
  fila: string;       // ej: 'A', 'J', 'T'
  columna: number;    // 1..30
  tipo: TipoButaca;
}