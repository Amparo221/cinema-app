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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DatosCombo, SalidaCombo } from '../../../models/admin.model';
import { ProductoCandy } from '../../../models/producto-candy.model';

/** Los dos productos del combo tienen que ser distintos (`combos_puntos_check`). */
function validarProductosDistintos(control: AbstractControl): ValidationErrors | null {
  const grupo = control.parent;
  if (!grupo) return null;

  const otro = control === grupo.get('producto_1_id')
    ? grupo.get('producto_2_id')
    : grupo.get('producto_1_id');

  const valor = Number(control.value);
  const valorOtro = Number(otro?.value);

  if (control.value === null || otro?.value === null) return null;
  if (!Number.isFinite(valor) || !Number.isFinite(valorOtro)) return null;

  return valor === valorOtro ? { repetido: true } : null;
}

/** Los puntos Plus tienen que superar al costo base (`combos_puntos_check`). */
function validarPuntosPlus(control: AbstractControl): ValidationErrors | null {
  const base = Number(control.parent?.get('puntos')?.value);
  const plus = Number(control.value);

  if (!Number.isFinite(base) || !Number.isFinite(plus)) return null;

  return plus > base ? null : { plusMenor: true };
}

@Component({
  selector: 'app-combo-form',
  imports: [ReactiveFormsModule],
  templateUrl: './combo-form.html',
  styleUrl: './combo-form.css',
})
export class ComboForm {
  private fb = inject(NonNullableFormBuilder);
  private destroyRef = inject(DestroyRef);

  /** Permite precargar el formulario al editar una recompensa. */
  datosIniciales = input<DatosCombo | null>(null);
  guardando = input(false);
  /** Productos de candy disponibles para armar el combo. */
  productos = input<ProductoCandy[]>([]);

  guardar = output<SalidaCombo>();
  cancelar = output<void>();

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/)]],
    descripcion: [''],
    producto_1_id: this.fb.control<number | null>(null, [
      Validators.required,
      validarProductosDistintos,
    ]),
    producto_2_id: this.fb.control<number | null>(null, [
      Validators.required,
      validarProductosDistintos,
    ]),
    puntos: [0, [Validators.required, Validators.min(1)]],
    puntos_plus: [0, [Validators.required, Validators.min(1), validarPuntosPlus]],
    activo: [true],
  });

  /** Con datos precargados el formulario edita; sin ellos, crea. */
  readonly esEdicion = computed(() => this.datosIniciales() !== null);

  readonly textoGuardar = computed(() =>
    this.esEdicion() ? 'Guardar cambios' : 'Crear recompensa'
  );

  /**
   * Sugerencia de costo: 1 peso = 1 punto, así que el precio de los dos
   * productos del combo es el piso razonable de puntos.
   */
  readonly puntosSugeridos = computed(() => {
    // Depende de `revalidar` para recalcular cuando cambian los selects.
    this.revalidar();

    const productos = this.productos();
    const ids = [
      this.form.controls.producto_1_id.value,
      this.form.controls.producto_2_id.value,
    ];
    if (ids.some(id => id === null)) return 0;

    let total = 0;
    for (const id of ids) {
      const producto = productos.find(p => p.id === id);
      if (!producto) return 0;
      total += producto.precio;
    }

    return Math.round(total);
  });

  /** Se incrementa ante cualquier cambio del formulario para recalcular la sugerencia. */
  private readonly revalidar = signal(0);

  constructor() {
    effect(() => {
      const inicial = this.datosIniciales();
      untracked(() => this.cargarDatosIniciales(inicial));
    });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.form.controls.producto_1_id.updateValueAndValidity({ emitEvent: false });
      this.form.controls.producto_2_id.updateValueAndValidity({ emitEvent: false });
      this.form.controls.puntos_plus.updateValueAndValidity({ emitEvent: false });
      this.revalidar.update(valor => valor + 1);
    });
  }

  get nombre() {
    return this.form.controls.nombre;
  }

  get productoUno() {
    return this.form.controls.producto_1_id;
  }

  get productoDos() {
    return this.form.controls.producto_2_id;
  }

  get puntos() {
    return this.form.controls.puntos;
  }

  get puntosPlus() {
    return this.form.controls.puntos_plus;
  }

  get activo() {
    return this.form.controls.activo;
  }

  onSubmit() {
    if (this.guardando()) return;

    this.form.markAllAsTouched();

    if (this.form.invalid) return;

    const valor = this.form.getRawValue();

    this.guardar.emit({
      datos: {
        nombre: valor.nombre.trim(),
        descripcion: valor.descripcion.trim() || null,
        producto_1_id: Number(valor.producto_1_id),
        producto_2_id: Number(valor.producto_2_id),
        puntos: valor.puntos,
        puntos_plus: valor.puntos_plus,
        activo: valor.activo,
      },
    });
  }

  /** Precarga el formulario cuando se edita; al crear no hay datos iniciales. */
  private cargarDatosIniciales(inicial: DatosCombo | null) {
    if (!inicial) return;

    this.form.patchValue({
      nombre: inicial.nombre,
      descripcion: inicial.descripcion ?? '',
      producto_1_id: inicial.producto_1_id,
      producto_2_id: inicial.producto_2_id,
      puntos: inicial.puntos,
      puntos_plus: inicial.puntos_plus,
      activo: inicial.activo,
    });
  }
}
