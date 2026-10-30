/** Estado de la entrada del cliente una vez que el empleado escanea el QR. */
export type EstadoEntradaQr = 'valida' | 'usada' | 'cancelada';

/**
 * Respuesta de las RPC `consultar_entrada_qr` (solo consulta) y
 * `validar_entrada_qr` (consume la entrada).
 */
export interface EntradaQr {
  compra_id: string;
  qr_code: string;
  estado: EstadoEntradaQr;
  pelicula: string | null;
  fecha: string | null;
  hora: string | null;
  sala: string | null;
  cantidad_butacas: number;
  butacas: string[];
  combo_nombre: string | null;
  usada_at: string | null;
  /** `true` solo cuando la entrada todavía no se usó. */
  puede_ingresar: boolean;
  /** `true` si esta respuesta viene de haber dado paso recién ahora. */
  validada_ahora: boolean;
}
