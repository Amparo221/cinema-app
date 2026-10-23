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

/** Combo listo para insertar o actualizar. */
export interface NuevoCombo {
  nombre: string;
  descripcion: string | null;
  producto_1_id: number;
  producto_2_id: number;
  puntos: number;
  puntos_plus: number;
  activo: boolean;
}

/** Datos del formulario de combo. */
export type DatosCombo = NuevoCombo;

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
