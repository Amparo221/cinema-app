export interface Resena {
  id: number;
  usuario_id: string;
  pelicula_id: number;
  estrellas: number;
  comentario: string | null;
  created_at: string;
  /** Nombre y apellido del autor; lo arma la RPC `resenas_de_pelicula`. */
  autor?: string | null;
  profiles?: { nombre: string; apellido: string };
  peliculas?: { nombre: string; imagen: string | null };
}