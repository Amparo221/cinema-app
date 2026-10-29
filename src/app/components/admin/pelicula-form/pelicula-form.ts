import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DatosPelicula, SalidaPelicula } from '../../../models/admin.model';
import { fechaHoy } from '../../../models/preventa.model';

const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANIO_MAXIMO = 5 * 1024 * 1024;

/** La fecha de estreno solo es obligatoria si la película es un estreno. */
function validarFechaEstreno(control: AbstractControl): ValidationErrors | null {
  if (control.parent?.get('proximamente')?.value !== true) return null;

  const valor = String(control.value ?? '').trim();
  if (!valor) return { requerido: true };
  if (valor < fechaHoy()) return { pasada: true };

  return null;
}

/** El precio de preventa debe ser mayor a cero si la película es un estreno. */
function validarPrecioPreventa(control: AbstractControl): ValidationErrors | null {
  if (control.parent?.get('proximamente')?.value !== true) return null;

  const valor = Number(control.value);
  if (!Number.isFinite(valor) || valor <= 0) return { requerido: true };

  return null;
}

@Component({
  selector: 'app-pelicula-form',
  imports: [ReactiveFormsModule],
  templateUrl: './pelicula-form.html',
  styleUrl: './pelicula-form.css',
})
export class PeliculaForm {
  private fb = inject(NonNullableFormBuilder);
  private destroyRef = inject(DestroyRef);

  /** Permite precargar el formulario (por ejemplo, desde una propuesta). */
  datosIniciales = input<DatosPelicula | null>(null);
  guardando = input(false);
  /** URL del póster actual; se usa como vista previa al editar sin archivo nuevo. */
  imagenActual = input<string | null>(null);

  guardar = output<SalidaPelicula>();
  cancelar = output<void>();

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/)]],
    sinopsis: ['', [Validators.required, Validators.pattern(/\S/)]],
    duracion: [90, [Validators.required, Validators.min(30)]],
    generos: [''],
    restriccion_edad: ['sin_restriccion'],
    precio_preventa: [0, [Validators.min(0), validarPrecioPreventa]],
    fecha_estreno: ['', [validarFechaEstreno]],
    proximamente: [false],
  });

  private readonly valorGeneros = toSignal(this.form.controls.generos.valueChanges, {
    initialValue: this.form.controls.generos.value,
  });

  /** Al cambiar el check, los campos de preventa cambian de obligatorios a opcionales. */
  private readonly valorProximamente = toSignal(
    this.form.controls.proximamente.valueChanges,
    { initialValue: this.form.controls.proximamente.value }
  );

  readonly esEstreno = computed(() => this.valorProximamente() === true);

  /** Con datos precargados el formulario edita; sin ellos, crea. */
  readonly esEdicion = computed(() => this.datosIniciales() !== null);

  /** Texto del botón principal. */
  readonly textoGuardar = computed(() => (this.esEdicion() ? 'Guardar cambios' : 'Crear película'));

  readonly hoy = fechaHoy();

  /** Aviso no bloqueante: más de 20 caracteres sin ninguna coma. */
  readonly recordatorioGeneros = computed(() => {
    const valor = this.valorGeneros().trim();
    return valor.length > 20 && !valor.includes(',');
  });

  archivoImagen = signal<File | null>(null);
  previewImagen = signal<string | null>(null);
  errorImagen = signal<string | null>(null);

  /** Vista previa: el archivo elegido o, al editar sin archivo nuevo, el póster actual. */
  readonly vistaPrevia = computed(() => this.previewImagen() ?? this.imagenActual());

  constructor() {
    this.destroyRef.onDestroy(() => this.revocarPreview());

    // Los campos de preventa dependen del check "Próximamente".
    this.form.controls.proximamente.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(proximamente => this.sincronizarCamposEstreno(proximamente));

    // Sin marcar Próximamente, fecha y precio quedan visibles pero deshabilitados.
    this.sincronizarCamposEstreno(this.form.controls.proximamente.value, false);

    // Al editar, los datos se recargan cuando cambia la película seleccionada.
    effect(() => {
      const inicial = this.datosIniciales();
      untracked(() => this.cargarDatosIniciales(inicial));
    });
  }

  /**
   * Habilita fecha y precio solo cuando la película está marcada como Próximamente.
   * Al desmarcar el check se descartan los datos del estreno anterior.
   */
  private sincronizarCamposEstreno(activo: boolean, limpiar = true) {
    const { precio_preventa, fecha_estreno } = this.form.controls;

    if (activo) {
      precio_preventa.enable({ emitEvent: false });
      fecha_estreno.enable({ emitEvent: false });
    } else {
      if (limpiar) {
        precio_preventa.setValue(0, { emitEvent: false });
        fecha_estreno.setValue('', { emitEvent: false });
      }
      precio_preventa.disable({ emitEvent: false });
      fecha_estreno.disable({ emitEvent: false });
    }

    precio_preventa.updateValueAndValidity({ emitEvent: false });
    fecha_estreno.updateValueAndValidity({ emitEvent: false });
  }

  /** Precarga el formulario cuando se edita; al crear no hay datos iniciales. */
  private cargarDatosIniciales(inicial: DatosPelicula | null) {
    if (!inicial) return;

    this.limpiarImagen();
    this.errorImagen.set(null);

    this.form.patchValue({
      nombre: inicial.nombre,
      sinopsis: inicial.sinopsis ?? '',
      duracion: inicial.duracion,
      generos: inicial.generos.join(', '),
      restriccion_edad: inicial.restriccion_edad ?? 'sin_restriccion',
      precio_preventa: inicial.precio_preventa ?? 0,
      fecha_estreno: inicial.fecha_estreno ?? '',
      proximamente: inicial.proximamente,
    });

    // Respeta lo cargado: solo ajusta si los campos quedan habilitados o no.
    this.sincronizarCamposEstreno(inicial.proximamente, false);
  }

  get nombre() {
    return this.form.controls.nombre;
  }

  get sinopsis() {
    return this.form.controls.sinopsis;
  }

  get duracion() {
    return this.form.controls.duracion;
  }

  get precio() {
    return this.form.controls.precio_preventa;
  }

  get estreno() {
    return this.form.controls.fecha_estreno;
  }

  onImagenSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    this.errorImagen.set(null);

    if (!archivo) return;

    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      input.value = '';
      this.limpiarImagen();
      this.errorImagen.set('Formato no válido. Usá PNG, JPG o WEBP.');
      return;
    }

    if (archivo.size > TAMANIO_MAXIMO) {
      input.value = '';
      this.limpiarImagen();
      this.errorImagen.set('La imagen no puede superar los 5 MB.');
      return;
    }

    this.revocarPreview();
    this.archivoImagen.set(archivo);
    this.previewImagen.set(URL.createObjectURL(archivo));
  }

  quitarImagen(input: HTMLInputElement) {
    input.value = '';
    this.limpiarImagen();
    this.errorImagen.set(null);
  }

  onSubmit() {
    if (this.guardando()) return;

    this.form.markAllAsTouched();

    const archivo = this.archivoImagen();

    // Al editar se puede conservar la imagen actual.
    const faltaImagen = !archivo && !this.esEdicion();
    if (faltaImagen) {
      this.errorImagen.set('La imagen es obligatoria.');
    }

    if (this.form.invalid || faltaImagen) return;

    const valor = this.form.getRawValue();

    this.guardar.emit({
      datos: {
        nombre: valor.nombre.trim(),
        sinopsis: valor.sinopsis.trim() || null,
        duracion: valor.duracion,
        generos: valor.generos
          .split(',')
          .map(genero => genero.trim())
          .filter(Boolean),
        restriccion_edad: valor.restriccion_edad.trim() || null,
        precio_preventa:
          valor.proximamente && valor.precio_preventa > 0 ? valor.precio_preventa : null,
        fecha_estreno: valor.proximamente ? valor.fecha_estreno.trim() || null : null,
        proximamente: valor.proximamente,
      },
      archivo,
    });
  }

  private limpiarImagen() {
    this.archivoImagen.set(null);
    this.revocarPreview();
  }

  private revocarPreview() {
    const url = this.previewImagen();
    if (url) URL.revokeObjectURL(url);
    this.previewImagen.set(null);
  }
}
