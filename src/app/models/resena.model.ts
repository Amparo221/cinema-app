export interface Resena {
  id: number;
  usuario_id: string;
  pelicula_id: number;
  estrellas: number;
  comentario: string | null;
  created_at: string;
  profiles?: { nombre: string; apellido: string };
}