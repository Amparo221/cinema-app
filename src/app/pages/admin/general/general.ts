import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../services/supabase';
import { SessionService } from '../../../services/session';
import { Pelicula } from '../../../models/pelicula.model';
import {
  CategoriaCandy,
  ProductoCandy,
} from '../../../models/producto-candy.model';
import { Combo } from '../../../models/combo.model';
import {
  DatosCombo,
  DatosPelicula,
  SalidaCombo,
  SalidaPelicula,
  SalidaProductoCandy,
} from '../../../models/admin.model';
import { Descuentos, descuentosDeConfiguracion } from '../../../models/descuento.model';
import {
  esProximamente,
  estaEnPreventa,
  fechaHoy,
} from '../../../models/preventa.model';
import { PeliculaForm } from '../../../components/admin/pelicula-form/pelicula-form';
import { ProductoCandyForm } from '../../../components/admin/producto-candy-form/producto-candy-form';
import { ComboForm } from '../../../components/admin/combo-form/combo-form';
import { DescuentosForm } from '../../../components/admin/descuentos-form/descuentos-form';
import {
  mensajeErrorCombo,
  mensajeErrorDescuentos,
  mensajeErrorPelicula,
} from './admin-errores';

/** Filas visibles antes de que aparezca el botón "Mostrar todas". */
const FILAS_VISIBLES = 5;

const ETIQUETAS_CATEGORIA: Record<CategoriaCandy, string> = {
  pochoclos: 'Pochoclos',
  bebidas: 'Bebidas',
  snacks: 'Snacks',
  golosinas: 'Golosinas',
  combos: 'Combos',
};

@Component({
  selector: 'app-admin-general',
  imports: [PeliculaForm, ProductoCandyForm, ComboForm, DescuentosForm],
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

  private formatoNumero = new Intl.NumberFormat('es-AR');

  peliculas = signal<Pelicula[]>([]);
  productos = signal<ProductoCandy[]>([]);
  combos = signal<Combo[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  mostrarFormPelicula = signal(false);
  mostrarFormCandy = signal(false);
  mostrarFormCombo = signal(false);
  guardandoPelicula = signal(false);
  guardandoCandy = signal(false);
  guardandoCombo = signal(false);
  guardandoDescuentos = signal(false);

  /** Recompensa en edición; null cuando el formulario crea una nueva. */
  comboEnEdicion = signal<Combo | null>(null);

  /** Id de la recompensa cuyo estado (activa / pausada) se está cambiando. */
  comboActualizando = signal<number | null>(null);

  /** Claves de `configuracion`: precios y porcentajes de descuento. */
  configuracion = signal<Record<string, number>>({});

  /** Las tablas arrancan colapsadas en las primeras 5 filas. */
  peliculasExpandidas = signal(false);
  productosExpandidos = signal(false);
  combosExpandidos = signal(false);

  /** Película que se está editando; null cuando el formulario crea una nueva. */
  peliculaEnEdicion = signal<Pelicula | null>(null);

  /** Datos con los que se precarga el formulario al editar. */
  readonly datosInicialesPelicula = computed<DatosPelicula | null>(() => {
    const pelicula = this.peliculaEnEdicion();
    if (!pelicula) return null;

    return {
      nombre: pelicula.nombre,
      sinopsis: pelicula.sinopsis,
      duracion: pelicula.duracion,
      generos: pelicula.generos,
      restriccion_edad: pelicula.restriccion_edad,
      precio_preventa: pelicula.precio_preventa,
      fecha_estreno: pelicula.fecha_estreno,
      proximamente: pelicula.proximamente,
    };
  });

  /** Póster actual, para la vista previa del formulario de edición. */
  readonly imagenActualPelicula = computed(() => {
    const pelicula = this.peliculaEnEdicion();
    return pelicula?.imagen ? this.supabase.getPeliculaImageUrl(pelicula.imagen) : null;
  });

  /** Datos con los que se precarga el formulario al editar una recompensa. */
  readonly datosInicialesCombo = computed<DatosCombo | null>(() => {
    const combo = this.comboEnEdicion();
    if (!combo) return null;

    return {
      nombre: combo.nombre,
      descripcion: combo.descripcion,
      producto_1_id: combo.producto_1_id,
      producto_2_id: combo.producto_2_id,
      puntos: combo.puntos,
      puntos_plus: combo.puntos_plus,
      activo: combo.activo,
    };
  });

  /** Porcentajes de descuento vigentes, con los valores por defecto. */
  readonly descuentosVigentes = computed<Descuentos>(() =>
    descuentosDeConfiguracion(this.configuracion())
  );

  readonly peliculasVisibles = computed(() =>
    recortar(this.peliculas(), this.peliculasExpandidas())
  );
  readonly productosVisibles = computed(() =>
    recortar(this.productos(), this.productosExpandidos())
  );
  readonly combosVisibles = computed(() => recortar(this.combos(), this.combosExpandidos()));

  readonly hayMasPeliculas = computed(() => this.peliculas().length > FILAS_VISIBLES);
  readonly hayMasProductos = computed(() => this.productos().length > FILAS_VISIBLES);
  readonly hayMasCombos = computed(() => this.combos().length > FILAS_VISIBLES);

  /** Fecha de hoy congelada al abrir la página. */
  readonly hoy = fechaHoy();

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

    const [peliculasRes, productosRes, combosRes, configuracion] = await Promise.all([
      this.supabase.getTodasLasPeliculas(),
      this.supabase.getProductosCandy(),
      this.supabase.getTodosLosCombos(),
      this.supabase.getConfiguracion(),
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

    if (combosRes.error) {
      errores.push(`No se pudieron cargar las recompensas: ${combosRes.error.message}`);
    } else if (combosRes.data) {
      this.combos.set(combosRes.data as unknown as Combo[]);
    }

    this.configuracion.set(configuracion);

    if (errores.length > 0) {
      this.error.set(errores.join(' '));
    }

    this.cargando.set(false);
  }

  abrirFormPelicula() {
    this.error.set(null);
    this.mensaje.set(null);
    this.peliculaEnEdicion.set(null);
    this.mostrarFormPelicula.set(true);
  }

  editarPelicula(pelicula: Pelicula) {
    this.error.set(null);
    this.mensaje.set(null);
    this.peliculaEnEdicion.set(pelicula);
    this.mostrarFormPelicula.set(true);
    // La fila editada tiene que quedar a la vista aunque esté fuera de las primeras.
    this.peliculasExpandidas.set(true);
  }

  cerrarFormPelicula() {
    this.mostrarFormPelicula.set(false);
    this.peliculaEnEdicion.set(null);
  }

  abrirFormCandy() {
    this.error.set(null);
    this.mensaje.set(null);
    this.mostrarFormCandy.set(true);
  }

  cerrarFormCandy() {
    this.mostrarFormCandy.set(false);
  }

  abrirFormCombo() {
    this.error.set(null);
    this.mensaje.set(null);
    this.comboEnEdicion.set(null);
    this.mostrarFormCombo.set(true);
  }

  editarCombo(combo: Combo) {
    this.error.set(null);
    this.mensaje.set(null);
    this.comboEnEdicion.set(combo);
    this.mostrarFormCombo.set(true);
    this.combosExpandidos.set(true);
  }

  cerrarFormCombo() {
    this.mostrarFormCombo.set(false);
    this.comboEnEdicion.set(null);
  }

  alternarPeliculas() {
    this.peliculasExpandidas.update(expandido => !expandido);
  }

  alternarProductos() {
    this.productosExpandidos.update(expandido => !expandido);
  }

  alternarCombos() {
    this.combosExpandidos.update(expandido => !expandido);
  }

  /**
   * Sirve para crear y para editar: si hay película en edición se actualiza,
   * y la imagen solo se sube cuando el admin elige una nueva.
   */
  async guardarPelicula({ datos, archivo }: SalidaPelicula) {
    if (this.guardandoPelicula()) return;

    this.guardandoPelicula.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    const enEdicion = this.peliculaEnEdicion();

    try {
      let nombreImagen = enEdicion?.imagen ?? null;

      if (archivo) {
        const subida = await this.supabase.subirImagen('peliculas', archivo);
        if (!subida.nombreArchivo) {
          this.error.set(`No se pudo subir la imagen: ${subida.error ?? 'error desconocido'}`);
          return;
        }
        nombreImagen = subida.nombreArchivo;
      }

      if (!nombreImagen) {
        this.error.set('La imagen es obligatoria.');
        return;
      }

      const datosCompletos = { ...datos, imagen: nombreImagen };
      const { error } = enEdicion
        ? await this.supabase.actualizarPelicula(enEdicion.id, datosCompletos)
        : await this.supabase.crearPelicula(datosCompletos);

      if (error) {
        this.error.set(mensajeErrorPelicula(error.message));
        return;
      }

      this.mostrarFormPelicula.set(false);
      this.peliculaEnEdicion.set(null);
      this.mensaje.set(
        enEdicion ? 'Película actualizada correctamente.' : 'Película creada correctamente.'
      );
      await this.cargarDatos();
    } catch {
      this.error.set('No se pudo guardar la película. Intentá nuevamente.');
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

  /** Sirve para crear y para editar una recompensa (combo de puntos). */
  async guardarCombo({ datos }: SalidaCombo) {
    if (this.guardandoCombo()) return;

    this.guardandoCombo.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    const enEdicion = this.comboEnEdicion();

    try {
      const { error } = enEdicion
        ? await this.supabase.actualizarCombo(enEdicion.id, datos)
        : await this.supabase.crearCombo(datos);

      if (error) {
        this.error.set(mensajeErrorCombo(error.message));
        return;
      }

      this.mostrarFormCombo.set(false);
      this.comboEnEdicion.set(null);
      this.mensaje.set(
        enEdicion ? 'Recompensa actualizada correctamente.' : 'Recompensa creada correctamente.'
      );
      await this.cargarDatos();
    } catch {
      this.error.set('No se pudo guardar la recompensa. Intentá nuevamente.');
    } finally {
      this.guardandoCombo.set(false);
    }
  }

  /** Pausa o reactiva una recompensa sin borrarla. */
  async alternarActivoCombo(combo: Combo) {
    if (this.comboActualizando() !== null) return;

    this.comboActualizando.set(combo.id);
    this.error.set(null);
    this.mensaje.set(null);

    try {
      const { error } = await this.supabase.cambiarActivoCombo(combo.id, !combo.activo);

      if (error) {
        this.error.set(mensajeErrorCombo(error.message));
        return;
      }

      this.mensaje.set(
        combo.activo
          ? `"${combo.nombre}" quedó pausada: no se puede canjear.`
          : `"${combo.nombre}" quedó activa de nuevo.`
      );
      await this.cargarDatos();
    } catch {
      this.error.set('No se pudo cambiar el estado de la recompensa. Intentá nuevamente.');
    } finally {
      this.comboActualizando.set(null);
    }
  }

  /** Guarda los porcentajes de descuento en `configuracion` (RPC). */
  async guardarDescuentos(descuentos: Descuentos) {
    if (this.guardandoDescuentos()) return;

    this.guardandoDescuentos.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    try {
      const { error } = await this.supabase.guardarDescuentos(
        descuentos.primeraCompra,
        descuentos.cincuenta
      );

      if (error) {
        this.error.set(mensajeErrorDescuentos(error.message));
        return;
      }

      this.configuracion.set(await this.supabase.getConfiguracion());
      this.mensaje.set('Descuentos actualizados correctamente.');
    } catch {
      this.error.set('No se pudieron guardar los descuentos. Intentá nuevamente.');
    } finally {
      this.guardandoDescuentos.set(false);
    }
  }

  /** Nombres de los dos productos incluidos, para la tabla de recompensas. */
  etiquetaProductosCombo(combo: Combo): string {
    const nombres = [combo.producto_1?.nombre, combo.producto_2?.nombre].filter(
      (nombre): nombre is string => Boolean(nombre)
    );

    return nombres.length > 0 ? nombres.join(' + ') : '—';
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

  /** Puntos del combo con separador de miles (18000 → 18.000). */
  formatearPuntos(valor: number): string {
    return this.formatoNumero.format(valor);
  }

  etiquetaCategoria(categoria: CategoriaCandy): string {
    return ETIQUETAS_CATEGORIA[categoria] ?? categoria;
  }

  etiquetaRestriccion(restriccion: string | null): string {
    if (!restriccion) return '—';
    return restriccion === 'sin_restriccion' ? 'Sin restricción' : restriccion;
  }

  formatearFechaEstreno(fecha: string | null): string {
    if (!fecha) return '—';
    const valor = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(valor.getTime())) return '—';
    return valor.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  estadoTexto(pelicula: Pelicula): string {
    if (estaEnPreventa(pelicula, this.hoy)) return 'Preventa abierta';
    if (esProximamente(pelicula, this.hoy)) return 'Próximamente';
    return 'En cartelera';
  }

  estadoClase(pelicula: Pelicula): string {
    if (estaEnPreventa(pelicula, this.hoy)) return 'preventa';
    if (esProximamente(pelicula, this.hoy)) return 'proximamente';
    return 'cartelera';
  }
}

/** Las tablas muestran las primeras filas hasta que el admin las expande. */
function recortar<T>(filas: readonly T[], expandido: boolean): T[] {
  return expandido ? [...filas] : filas.slice(0, FILAS_VISIBLES);
}
