import { CategoriaCandy } from './producto-candy.model';

/** Película lista para insertar. `imagen` es el nombre del archivo en Storage. */
export interface NuevaPelicula {
  nombre: string;
  imagen: string;
  sinopsis: string | null;
  duracion: number;
  generos: string[];
  restriccion_edad: string | null;
  precio_preventa: number | null;
  proximamente: boolean;
}

/** Producto de candy listo para insertar. `imagen` es el nombre del archivo en Storage. */
export interface NuevoProductoCandy {
  nombre: string;
  descripcion: string | null;
  categoria: CategoriaCandy;
  precio: number;
  imagen: string;
  stock: number;
}

/** Datos del formulario de película; la imagen se sube por separado. */
export type DatosPelicula = Omit<NuevaPelicula, 'imagen'>;

/** Datos del formulario de producto; la imagen se sube por separado. */
export type DatosProductoCandy = Omit<NuevoProductoCandy, 'imagen'>;

export interface SalidaPelicula {
  datos: DatosPelicula;
  archivo: File;
}

export interface SalidaProductoCandy {
  datos: DatosProductoCandy;
  archivo: File;
}

export interface ResultadoSubida {
  nombreArchivo: string | null;
  error: string | null;
}
