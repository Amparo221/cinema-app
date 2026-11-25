import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase';
import { SessionService } from '../../../services/session';
import { Pelicula } from '../../../models/pelicula.model';
import {
  Propuesta,
  datosPeliculaDesdePropuesta,
  mensajeErrorPropuesta,
} from '../../../models/propuesta.model';
import { CategoriaCandy, ProductoCandy } from '../../../models/producto-candy.model';
import { Combo } from '../../../models/combo.model';
import {
  DatosCombo,
  DatosPelicula,
  SalidaCombo,
  SalidaPelicula,
  SalidaProductoCandy,
} from '../../../models/admin.model';
import { Descuentos, descuentosDeConfiguracion } from '../../../models/descuento.model';
import { esProximamente, estaEnPreventa, fechaHoy } from '../../../models/preventa.model';
import { Funcion } from '../../../models/funcion.model';
import {
  ResultadoCancelacionFuncion,
  ResultadoFunciones,
  SolicitudFunciones,
  etiquetaIdioma,
  horaCorta,
  puedeCancelarFuncion,
  resumenCancelacion,
  resumenGeneracion,
} from '../../../models/programacion.model';
import { PeliculaForm } from '../../../components/admin/pelicula-form/pelicula-form';
import { ProductoCandyForm } from '../../../components/admin/producto-candy-form/producto-candy-form';
import { ComboForm } from '../../../components/admin/combo-form/combo-form';
import { DescuentosForm } from '../../../components/admin/descuentos-form/descuentos-form';
import { ProgramacionFunciones } from '../../../components/admin/programacion-funciones/programacion-funciones';
import { ListaEsperaPanel } from '../../../components/admin/lista-espera-panel/lista-espera-panel';
import { RecortarTexto } from '../../../shared/recortar-texto';
import {
  mensajeErrorCancelarFuncion,
  mensajeErrorCombo,
  mensajeErrorDescuentos,
  mensajeErrorFunciones,
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

/**
 * Normaliza un título para compararlo con el catálogo: sin acentos, sin
 * comillas tipográficas y con los espacios colapsados.
 */
function normalizarTitulo(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Datos mínimos para reintentar el cierre de una propuesta ya aceptada. */
interface PropuestaSinCerrar {
  id: number;
  titulo: string;
  peliculaId: number;
}

@Component({
  selector: 'app-admin-general',
  imports: [
    PeliculaForm,
    ProductoCandyForm,
    ComboForm,
    DescuentosForm,
    ProgramacionFunciones,
    ListaEsperaPanel,
    RecortarTexto,
  ],
  templateUrl: './general.html',
  styleUrl: './general.css',
})
export class AdminGeneral implements OnInit {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

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

  /**
   * Propuesta de película que se está aceptando (llega por `?propuesta=`).
   * Se marca como aceptada recién cuando la película se guarda.
   */
  propuestaOrigen = signal<Propuesta | null>(null);
  resolviendoPropuesta = signal(false);

  /**
   * Propuesta cuya película ya se creó pero que no se pudo marcar como
   * aceptada. Guarda lo mínimo para reintentar sin crear otra película.
   */
  propuestaSinCerrar = signal<PropuestaSinCerrar | null>(null);

  /**
   * Película del catálogo que ya se llama igual que la propuesta abierta.
   * Si existe, aceptar la propuesta no puede crear otra: el título es único.
   */
  peliculaCoincidente = signal<Pelicula | null>(null);
  /** Película cuyo panel “Reponer funciones” está abierto. */
  peliculaReponiendo = signal<Pelicula | null>(null);
  funcionesExistentes = signal<Funcion[]>([]);
  cargandoFunciones = signal(false);
  generandoFunciones = signal(false);
  errorFunciones = signal<string | null>(null);
  resultadoFunciones = signal<ResultadoFunciones | null>(null);

  /** Función elegida en el panel para cancelarla; null si no hay confirmación abierta. */
  funcionSeleccionada = signal<Funcion | null>(null);
  cancelandoFuncion = signal(false);
  resultadoCancelacion = signal<ResultadoCancelacionFuncion | null>(null);

  /** Helpers puros que usa la plantilla. */
  readonly horaCorta = horaCorta;
  readonly resumenFunciones = resumenGeneracion;
  readonly resumenCancelacionFuncion = resumenCancelacion;

  /** Datos con los que se precarga el formulario al editar. */
  readonly datosInicialesPelicula = computed<DatosPelicula | null>(() => {
    const pelicula = this.peliculaEnEdicion();
    if (pelicula) {
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
    }

    // Al aceptar una propuesta el alta arranca con lo que pidió el cliente.
    const propuesta = this.propuestaOrigen();
    return propuesta ? datosPeliculaDesdePropuesta(propuesta) : null;
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
    descuentosDeConfiguracion(this.configuracion()),
  );

  readonly peliculasVisibles = computed(() =>
    recortar(this.peliculas(), this.peliculasExpandidas()),
  );
  readonly productosVisibles = computed(() =>
    recortar(this.productos(), this.productosExpandidos()),
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
    await this.cargarPropuestaDeQuery();
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

  /**
   * Deja de precargar el alta con la propuesta. La propuesta sigue
   * pendiente y se puede retomar desde /admin/propuestas.
   */
  async descartarPropuesta() {
    this.propuestaOrigen.set(null);
    this.cerrarFormPelicula();
    await this.limpiarQueryPropuesta();
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
    this.peliculaCoincidente.set(null);
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
    this.peliculasExpandidas.update((expandido) => !expandido);
  }

  alternarProductos() {
    this.productosExpandidos.update((expandido) => !expandido);
  }

  alternarCombos() {
    this.combosExpandidos.update((expandido) => !expandido);
  }

  /** Si se llegó desde /admin/propuestas, precarga el alta con esa propuesta. */
  private async cargarPropuestaDeQuery() {
    const id = Number(this.route.snapshot.queryParamMap.get('propuesta'));
    if (!Number.isInteger(id) || id <= 0) return;

    const { data, error } = await this.supabase.getPropuesta(id);

    if (error || !data) {
      this.error.set('No se pudo cargar la propuesta seleccionada.');
      return;
    }

    const propuesta = data as Propuesta;

    if (propuesta.estado !== 'pendiente') {
      this.error.set('Esa propuesta ya fue resuelta.');
      await this.limpiarQueryPropuesta();
      return;
    }

    this.propuestaOrigen.set(propuesta);
    this.peliculaCoincidente.set(this.buscarPeliculaCoincidente(propuesta.titulo));
    this.abrirFormPelicula();
  }

  /** Marca la propuesta como aceptada, ya con la película creada. */
  private async cerrarPropuestaAceptada(pelicula: Pelicula) {
    const propuesta = this.propuestaOrigen();
    if (!propuesta) return;

    this.resolviendoPropuesta.set(true);

    const { error } = await this.supabase.resolverPropuesta(
      propuesta.id,
      'aceptada',
      null,
      pelicula.id,
    );

    this.resolviendoPropuesta.set(false);

    if (error) {
      // La película ya existe: se cierra el formulario (para no crearla dos
      // veces) y se ofrece reintentar solo el cierre de la propuesta.
      this.propuestaOrigen.set(null);
      this.cerrarFormPelicula();
      this.propuestaSinCerrar.set({
        id: propuesta.id,
        titulo: propuesta.titulo,
        peliculaId: pelicula.id,
      });
      this.error.set(
        `La película «${pelicula.nombre}» se creó, pero la propuesta «${propuesta.titulo}» no se pudo cerrar: ${mensajeErrorPropuesta(error.message)}`,
      );
      await this.limpiarQueryPropuesta();
      return;
    }

    this.propuestaOrigen.set(null);
    this.peliculaCoincidente.set(null);
    this.propuestaSinCerrar.set(null);
    this.mensaje.set(
      `Película creada y propuesta de «${propuesta.titulo}» aceptada. El cliente ya tiene el aviso.`,
    );
    await this.limpiarQueryPropuesta();
  }

  /** Película del catálogo con el mismo título normalizado, si existe. */
  private buscarPeliculaCoincidente(titulo: string): Pelicula | null {
    const buscado = normalizarTitulo(titulo);
    return this.peliculas().find((p) => normalizarTitulo(p.nombre) === buscado) ?? null;
  }

  /**
   * Cierra la propuesta usando una película que ya está en el catálogo.
   * Destraba el caso en que la película se creó pero la propuesta quedó
   * pendiente, sin duplicar el alta ni perder el aviso al cliente.
   */
  async cerrarPropuestaConExistente() {
    const propuesta = this.propuestaOrigen();
    const pelicula = this.peliculaCoincidente();
    if (!propuesta || !pelicula || this.resolviendoPropuesta()) return;

    this.resolviendoPropuesta.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    const { error } = await this.supabase.resolverPropuesta(
      propuesta.id,
      'aceptada',
      null,
      pelicula.id,
    );

    this.resolviendoPropuesta.set(false);

    if (error) {
      this.error.set(
        `No se pudo aceptar la propuesta «${propuesta.titulo}»: ${mensajeErrorPropuesta(error.message)}`,
      );
      return;
    }

    this.propuestaOrigen.set(null);
    this.peliculaCoincidente.set(null);
    this.propuestaSinCerrar.set(null);
    this.cerrarFormPelicula();
    this.mensaje.set(
      `Propuesta de «${propuesta.titulo}» aceptada con la película «${pelicula.nombre}». El cliente ya tiene el aviso.`,
    );
    await this.limpiarQueryPropuesta();
  }

  /**
   * Reintenta el cierre de una propuesta cuya película ya se creó.
   * No vuelve a tocar el catálogo: solo marca la propuesta y avisa al cliente.
   */
  async reintentarAceptacionPropuesta() {
    const pendiente = this.propuestaSinCerrar();
    if (!pendiente || this.resolviendoPropuesta()) return;

    this.resolviendoPropuesta.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    const { error } = await this.supabase.resolverPropuesta(
      pendiente.id,
      'aceptada',
      null,
      pendiente.peliculaId,
    );

    this.resolviendoPropuesta.set(false);

    if (error) {
      this.error.set(
        `Todavía no se pudo cerrar la propuesta «${pendiente.titulo}»: ${mensajeErrorPropuesta(error.message)}`,
      );
      return;
    }

    this.propuestaSinCerrar.set(null);
    this.mensaje.set(`Propuesta de «${pendiente.titulo}» aceptada. El cliente ya tiene el aviso.`);
    await this.cargarDatos();
  }

  /** Oculta el aviso. La propuesta sigue pendiente y se puede resolver después. */
  olvidarPropuestaSinCerrar() {
    this.propuestaSinCerrar.set(null);
    this.error.set(null);
  }

  /** Saca `?propuesta=` de la URL para que un refresh no la vuelva a abrir. */
  private async limpiarQueryPropuesta() {
    await this.router.navigate(['/admin/general'], { replaceUrl: true });
  }

  /**
   * Sirve para crear y para editar: si hay película en edición se actualiza,
   * y la imagen solo se sube cuando el admin elige una nueva.
   */
  async guardarPelicula({ datos, archivo, funciones }: SalidaPelicula) {
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
      const { data, error } = enEdicion
        ? await this.supabase.actualizarPelicula(enEdicion.id, datosCompletos)
        : await this.supabase.crearPelicula(datosCompletos);

      if (error) {
        this.error.set(mensajeErrorPelicula(error.message));
        return;
      }

      const creada = enEdicion ? null : ((data as Pelicula | null) ?? null);

      this.mostrarFormPelicula.set(false);
      this.peliculaEnEdicion.set(null);
      this.mensaje.set(
        enEdicion ? 'Película actualizada correctamente.' : 'Película creada correctamente.',
      );
      await this.cargarDatos();

      // Si el alta venía de una propuesta, recién ahora se puede cerrar.
      if (creada) {
        await this.cerrarPropuestaAceptada(creada);
      }

      // La programación elegida en el alta se genera después de crear la
      // película: la RPC necesita su id.
      if (creada && funciones) {
        await this.generarFuncionesAlCrear(creada, funciones);
      }
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
        enEdicion ? 'Recompensa actualizada correctamente.' : 'Recompensa creada correctamente.',
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
          : `"${combo.nombre}" quedó activa de nuevo.`,
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
        descuentos.cincuenta,
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

  /**
   * Abre o cierra el panel de funciones. Al abrirlo se cargan las
   * próximas funciones de la película.
   */
  async alternarReponer(pelicula: Pelicula) {
    if (this.peliculaReponiendo()?.id === pelicula.id) {
      this.cerrarReponer();
      return;
    }

    this.error.set(null);
    this.mensaje.set(null);
    await this.abrirReponer(pelicula);
  }

  cerrarReponer() {
    this.peliculaReponiendo.set(null);
    this.funcionesExistentes.set([]);
    this.errorFunciones.set(null);
    this.resultadoFunciones.set(null);
    this.funcionSeleccionada.set(null);
    this.resultadoCancelacion.set(null);
  }

  private async abrirReponer(pelicula: Pelicula) {
    this.peliculaReponiendo.set(pelicula);
    this.peliculasExpandidas.set(true);
    this.errorFunciones.set(null);
    this.resultadoFunciones.set(null);
    this.funcionSeleccionada.set(null);
    this.resultadoCancelacion.set(null);
    this.funcionesExistentes.set([]);
    await this.cargarFuncionesDePelicula(pelicula.id);
  }

  /** Genera el lote que armó el panel (automático o manual). */
  async generarFunciones(pelicula: Pelicula, solicitud: SolicitudFunciones) {
    if (this.generandoFunciones()) return;

    this.generandoFunciones.set(true);
    this.errorFunciones.set(null);
    this.resultadoFunciones.set(null);

    try {
      const respuesta = await this.ejecutarGeneracion(pelicula.id, solicitud);

      if (respuesta.error) {
        this.errorFunciones.set(mensajeErrorFunciones(respuesta.error.message));
        return;
      }

      const resultado = (respuesta.data ?? { creadas: [], omitidas: [] }) as ResultadoFunciones;
      this.resultadoFunciones.set(resultado);
      this.mensaje.set(resumenGeneracion(resultado));
      await this.cargarFuncionesDePelicula(pelicula.id);
    } catch {
      this.errorFunciones.set('No se pudieron generar las funciones. Intentá nuevamente.');
    } finally {
      this.generandoFunciones.set(false);
    }
  }

  /** Después del alta: deja el panel abierto con el resultado a la vista. */
  private async generarFuncionesAlCrear(pelicula: Pelicula, solicitud: SolicitudFunciones) {
    await this.abrirReponer(pelicula);

    try {
      const respuesta = await this.ejecutarGeneracion(pelicula.id, solicitud);

      if (respuesta.error) {
        this.error.set(
          `Película creada, pero no se generaron las funciones: ${mensajeErrorFunciones(respuesta.error.message)}`,
        );
        return;
      }

      const resultado = (respuesta.data ?? { creadas: [], omitidas: [] }) as ResultadoFunciones;
      this.resultadoFunciones.set(resultado);
      this.mensaje.set(`Película creada. ${resumenGeneracion(resultado)}`);
      await this.cargarFuncionesDePelicula(pelicula.id);
    } catch {
      this.error.set('Película creada, pero no se pudieron generar las funciones.');
    }
  }

  /** `true` si la función todavía no empezó y se puede cancelar. */
  puedeCancelar(funcion: Funcion): boolean {
    return puedeCancelarFuncion(funcion);
  }

  /** Abre la confirmación; volver a tocar el mismo chip la cierra. */
  seleccionarFuncion(funcion: Funcion) {
    if (this.cancelandoFuncion() || !this.puedeCancelar(funcion)) return;

    if (this.funcionSeleccionada()?.id === funcion.id) {
      this.descartarSeleccion();
      return;
    }

    this.errorFunciones.set(null);
    this.resultadoCancelacion.set(null);
    this.funcionSeleccionada.set(funcion);
  }

  descartarSeleccion() {
    this.funcionSeleccionada.set(null);
  }

  /** RPC: cancela la función elegida, acredita a los compradores y recarga. */
  async cancelarFuncionSeleccionada() {
    const funcion = this.funcionSeleccionada();
    const pelicula = this.peliculaReponiendo();

    if (!funcion || !pelicula || this.cancelandoFuncion()) return;

    this.cancelandoFuncion.set(true);
    this.errorFunciones.set(null);
    this.resultadoCancelacion.set(null);

    try {
      const respuesta = await this.supabase.cancelarFuncion(funcion.id);

      if (respuesta.error) {
        this.errorFunciones.set(mensajeErrorCancelarFuncion(respuesta.error.message));
        return;
      }

      const resultado = (respuesta.data ?? {
        compras: 0,
        entradas: 0,
        usuarios: 0,
        anonimas: 0,
        credito: 0,
        puntos_devueltos: 0,
        puntos_ganados: 0,
      }) as ResultadoCancelacionFuncion;

      this.resultadoCancelacion.set(resultado);
      this.mensaje.set(resumenCancelacion(resultado));
      this.funcionSeleccionada.set(null);
      this.resultadoFunciones.set(null);
      await this.cargarFuncionesDePelicula(pelicula.id);
    } catch {
      this.errorFunciones.set('No se pudo cancelar la función. Intentá nuevamente.');
    } finally {
      this.cancelandoFuncion.set(false);
    }
  }

  private ejecutarGeneracion(peliculaId: number, solicitud: SolicitudFunciones) {
    return solicitud.modo === 'automatica'
      ? this.supabase.generarFuncionesAutomaticas(peliculaId, solicitud)
      : this.supabase.crearFuncionesManuales(peliculaId, solicitud.funciones);
  }

  private async cargarFuncionesDePelicula(peliculaId: number) {
    this.cargandoFunciones.set(true);

    try {
      const { data, error } = await this.supabase.getFuncionesDePelicula(peliculaId);

      if (error) {
        this.errorFunciones.set(`No se pudieron cargar las funciones: ${error.message}`);
        this.funcionesExistentes.set([]);
        return;
      }

      this.funcionesExistentes.set((data ?? []) as unknown as Funcion[]);
    } catch {
      this.errorFunciones.set('No se pudieron cargar las funciones. Intentá nuevamente.');
    } finally {
      this.cargandoFunciones.set(false);
    }
  }

  /** Primera fecha programable: la del estreno si todavía no se estrenó. */
  fechaMinimaPelicula(pelicula: Pelicula): string {
    if (esProximamente(pelicula, this.hoy) && pelicula.fecha_estreno) {
      return pelicula.fecha_estreno;
    }

    return this.hoy;
  }

  /** “Doblada · 2D” para la lista de funciones existentes. */
  etiquetaFuncion(funcion: Funcion): string {
    return `${etiquetaIdioma(funcion.idioma)} · ${funcion.formato ?? '2D'}`;
  }

  /** Nombres de los dos productos incluidos, para la tabla de recompensas. */
  etiquetaProductosCombo(combo: Combo): string {
    const nombres = [combo.producto_1?.nombre, combo.producto_2?.nombre].filter(
      (nombre): nombre is string => Boolean(nombre),
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
