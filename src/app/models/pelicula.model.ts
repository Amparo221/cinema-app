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
}