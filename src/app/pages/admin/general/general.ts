import { Component, OnInit, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../services/supabase';
import { SessionService } from '../../../services/session';
import { Pelicula } from '../../../models/pelicula.model';
import {
  CategoriaCandy,
  ProductoCandy,
} from '../../../models/producto-candy.model';
import {
  SalidaPelicula,
  SalidaProductoCandy,
} from '../../../models/admin.model';
import { PeliculaForm } from '../../../components/admin/pelicula-form/pelicula-form';
import { ProductoCandyForm } from '../../../components/admin/producto-candy-form/producto-candy-form';

const ETIQUETAS_CATEGORIA: Record<CategoriaCandy, string> = {
  pochoclos: 'Pochoclos',
  bebidas: 'Bebidas',
  snacks: 'Snacks',
  golosinas: 'Golosinas',
  combos: 'Combos',
};

@Component({
  selector: 'app-admin-general',
  imports: [PeliculaForm, ProductoCandyForm],
  templateUrl: './general.html',
  styleUrl: './general.css',
})
export class AdminGeneral implements OnInit {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);

  private formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  peliculas = signal<Pelicula[]>([]);
  productos = signal<ProductoCandy[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  mostrarFormPelicula = signal(false);
  mostrarFormCandy = signal(false);
  guardandoPelicula = signal(false);
  guardandoCandy = signal(false);

  async ngOnInit() {
    if (!this.session.usuario()) {
      this.cargando.set(false);
      return;
    }
    await this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.error.set(null);

    const [peliculasRes, productosRes] = await Promise.all([
      this.supabase.getTodasLasPeliculas(),
      this.supabase.getProductosCandy(),
    ]);

    const errores: string[] = [];

    if (peliculasRes.error) {
      errores.push(`No se pudieron cargar las películas: ${peliculasRes.error.message}`);
    } else if (peliculasRes.data) {
      this.peliculas.set(peliculasRes.data as Pelicula[]);
    }

    if (productosRes.error) {
      errores.push(`No se pudieron cargar los productos: ${productosRes.error.message}`);
    } else if (productosRes.data) {
      this.productos.set(productosRes.data as ProductoCandy[]);
    }

    if (errores.length > 0) {
      this.error.set(errores.join(' '));
    }

    this.cargando.set(false);
  }

  abrirFormPelicula() {
    this.error.set(null);
    this.mensaje.set(null);
    this.mostrarFormPelicula.set(true);
  }

  cerrarFormPelicula() {
    this.mostrarFormPelicula.set(false);
  }

  abrirFormCandy() {
    this.error.set(null);
    this.mensaje.set(null);
    this.mostrarFormCandy.set(true);
  }

  cerrarFormCandy() {
    this.mostrarFormCandy.set(false);
  }

  async guardarPelicula({ datos, archivo }: SalidaPelicula) {
    if (this.guardandoPelicula()) return;

    this.guardandoPelicula.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    try {
      const subida = await this.supabase.subirImagen('peliculas', archivo);
      if (!subida.nombreArchivo) {
        this.error.set(`No se pudo subir la imagen: ${subida.error ?? 'error desconocido'}`);
        return;
      }

      const { error } = await this.supabase.crearPelicula({
        ...datos,
        imagen: subida.nombreArchivo,
      });

      if (error) {
        this.error.set(`No se pudo crear la película: ${error.message}`);
        return;
      }

      this.mostrarFormPelicula.set(false);
      this.mensaje.set('Película creada correctamente.');
      await this.cargarDatos();
    } catch {
      this.error.set('No se pudo crear la película. Intentá nuevamente.');
    } finally {
      this.guardandoPelicula.set(false);
    }
  }

  async guardarProducto({ datos, archivo }: SalidaProductoCandy) {
    if (this.guardandoCandy()) return;

    this.guardandoCandy.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    try {
      const subida = await this.supabase.subirImagen('candy', archivo);
      if (!subida.nombreArchivo) {
        this.error.set(`No se pudo subir la imagen: ${subida.error ?? 'error desconocido'}`);
        return;
      }

      const { error } = await this.supabase.crearProductoCandy({
        ...datos,
        imagen: subida.nombreArchivo,
      });

      if (error) {
        this.error.set(`No se pudo crear el producto: ${error.message}`);
        return;
      }

      this.mostrarFormCandy.set(false);
      this.mensaje.set('Producto creado correctamente.');
      await this.cargarDatos();
    } catch {
      this.error.set('No se pudo crear el producto. Intentá nuevamente.');
    } finally {
      this.guardandoCandy.set(false);
    }
  }

  getImagenPelicula(nombreArchivo: string | null): string {
    return this.supabase.getPeliculaImageUrl(nombreArchivo);
  }

  getImagenProducto(nombreArchivo: string | null): string {
    return this.supabase.getCandyImageUrl(nombreArchivo);
  }

  formatearPrecio(valor: number | null): string {
    return valor === null ? '—' : this.formatoMoneda.format(valor);
  }

  etiquetaCategoria(categoria: CategoriaCandy): string {
    return ETIQUETAS_CATEGORIA[categoria] ?? categoria;
  }

  etiquetaRestriccion(restriccion: string | null): string {
    if (!restriccion) return '—';
    return restriccion === 'sin_restriccion' ? 'Sin restricción' : restriccion;
  }
}
