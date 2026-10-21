import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DatosPelicula, SalidaPelicula } from '../../../models/admin.model';

const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANIO_MAXIMO = 5 * 1024 * 1024;

@Component({
  selector: 'app-pelicula-form',
  imports: [ReactiveFormsModule],
  templateUrl: './pelicula-form.html',
  styleUrl: './pelicula-form.css',
})
export class PeliculaForm implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private destroyRef = inject(DestroyRef);

  /** Permite precargar el formulario (por ejemplo, desde una propuesta). */
  datosIniciales = input<DatosPelicula | null>(null);
  guardando = input(false);

  guardar = output<SalidaPelicula>();
  cancelar = output<void>();

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/)]],
    sinopsis: ['', [Validators.required, Validators.pattern(/\S/)]],
    duracion: [90, [Validators.required, Validators.min(30)]],
    generos: [''],
    restriccion_edad: ['sin_restriccion'],
    precio_preventa: [0, [Validators.min(0)]],
    proximamente: [false],
  });

  private readonly valorGeneros = toSignal(this.form.controls.generos.valueChanges, {
    initialValue: this.form.controls.generos.value,
  });

  /** Aviso no bloqueante: más de 20 caracteres sin ninguna coma. */
  readonly recordatorioGeneros = computed(() => {
    const valor = this.valorGeneros().trim();
    return valor.length > 20 && !valor.includes(',');
  });

  archivoImagen = signal<File | null>(null);
  previewImagen = signal<string | null>(null);
  errorImagen = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.revocarPreview());
  }

  ngOnInit() {
    const inicial = this.datosIniciales();
    if (!inicial) return;

    this.form.patchValue({
      nombre: inicial.nombre,
      sinopsis: inicial.sinopsis ?? '',
      duracion: inicial.duracion,
      generos: inicial.generos.join(', '),
      restriccion_edad: inicial.restriccion_edad ?? 'sin_restriccion',
      precio_preventa: inicial.precio_preventa ?? 0,
      proximamente: inicial.proximamente,
    });
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
    if (!archivo) {
      this.errorImagen.set('La imagen es obligatoria.');
    }

    if (this.form.invalid || !archivo) return;

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
        precio_preventa: valor.precio_preventa > 0 ? valor.precio_preventa : null,
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
