export interface Pelicula {
  id: number;
  nombre: string;
  imagen: string | null;
  sinopsis: string | null;
  duracion: number;
  generos: string[];
  restriccion_edad: string | null;
  precio_preventa: number | null;
  puntuacion_promedio: number;
  proximamente: boolean;
  /** Fecha de estreno (yyyy-mm-dd). Null mientras no esté programada. */
  fecha_estreno: string | null;
}