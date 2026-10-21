import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CategoriaCandy } from '../../../models/producto-candy.model';
import {
  DatosProductoCandy,
  SalidaProductoCandy,
} from '../../../models/admin.model';

const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANIO_MAXIMO = 5 * 1024 * 1024;

interface OpcionCategoria {
  valor: CategoriaCandy;
  etiqueta: string;
}

const CATEGORIAS: readonly OpcionCategoria[] = [
  { valor: 'pochoclos', etiqueta: 'Pochoclos' },
  { valor: 'bebidas', etiqueta: 'Bebidas' },
  { valor: 'snacks', etiqueta: 'Snacks' },
  { valor: 'golosinas', etiqueta: 'Golosinas' },
  { valor: 'combos', etiqueta: 'Combos' },
];

@Component({
  selector: 'app-producto-candy-form',
  imports: [ReactiveFormsModule],
  templateUrl: './producto-candy-form.html',
  styleUrl: './producto-candy-form.css',
})
export class ProductoCandyForm implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private destroyRef = inject(DestroyRef);

  /** Permite precargar el formulario (por ejemplo, desde una propuesta). */
  datosIniciales = input<DatosProductoCandy | null>(null);
  guardando = input(false);

  guardar = output<SalidaProductoCandy>();
  cancelar = output<void>();

  categorias = CATEGORIAS;

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/)]],
    descripcion: [''],
    categoria: ['pochoclos' as CategoriaCandy, Validators.required],
    precio: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
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
      descripcion: inicial.descripcion ?? '',
      categoria: inicial.categoria,
      precio: inicial.precio,
      stock: inicial.stock,
    });
  }

  get nombre() {
    return this.form.controls.nombre;
  }

  get precio() {
    return this.form.controls.precio;
  }

  get stock() {
    return this.form.controls.stock;
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
        descripcion: valor.descripcion.trim() || null,
        categoria: valor.categoria,
        precio: valor.precio,
        stock: valor.stock,
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
