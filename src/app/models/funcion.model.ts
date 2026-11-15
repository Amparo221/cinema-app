export interface Funcion {
  id: number;
  pelicula_id: number;
  sala_id: number;
  fecha: string;
  hora: string;
  formato: string | null;
  idioma: string | null;
  salas?: { nombre: string };
  /** Datos de la película; `getFuncionesEnRango` los trae para prevalidar choques. */
  peliculas?: { nombre: string; duracion: number | null } | null;
  /**
   * Fecha en la que el admin canceló la función. Las funciones canceladas no
   * se muestran ni se pueden comprar, pero la fila se conserva para auditoría.
   */
  cancelada_at?: string | null;
}