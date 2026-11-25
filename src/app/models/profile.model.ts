import { Rol } from './rol.model';

export interface Profile {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number;
  puntos: number;
  creditos: number;
  primera_compra: boolean;
  /** Nombre del rol (`public.roles.nombre`); puede ser uno propio del dueño. */
  role: Rol;
}

export interface RegistroMetadata {
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number;
}