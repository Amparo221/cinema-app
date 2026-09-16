export interface Funcion {
  id: number;
  pelicula_id: number;
  sala_id: number;
  fecha: string;
  hora: string;
  formato: string | null;
  idioma: string | null;
  salas?: { nombre: string };
}