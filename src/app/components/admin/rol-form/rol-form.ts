import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ETIQUETAS_SECCION, SECCIONES_ASIGNABLES, SeccionAdmin } from '../../../models/rol.model';
import {
  DatosRol,
  ErroresRol,
  RolAdmin,
  hayErroresRol,
  validarRol,
} from '../../../models/rol-admin.model';

/**
 * Alta y edición de un rol propio.
 *
 * El nombre es la clave del rol, así que al editar queda deshabilitado.
 * La sección `roles` no se puede marcar: administrar roles es exclusivo
 * del dueño.
 */
@Component({
  selector: 'app-rol-form',
  imports: [ReactiveFormsModule],
  templateUrl: './rol-form.html',
  styleUrl: './rol-form.css',
})
export class RolForm {
  private fb = inject(NonNullableFormBuilder);

  /** Rol en edición; null cuando se crea uno nuevo. */
  datosIniciales = input<RolAdmin | null>(null);
  guardando = input(false);
  /** Error de la RPC, ya traducido por la página. */
  error = input<string | null>(null);

  guardar = output<DatosRol>();
  cancelar = output<void>();

  readonly secciones = SECCIONES_ASIGNABLES;
  readonly seleccionadas = signal<SeccionAdmin[]>([]);
  readonly errores = signal<ErroresRol>({});

  readonly esEdicion = computed(() => this.datosIniciales() !== null);

  form = this.fb.group({
    nombre: '',
    etiqueta: '',
  });

  constructor() {
    effect(() => {
      const rol = this.datosIniciales();
      untracked(() => {
        this.form.setValue({ nombre: rol?.nombre ?? '', etiqueta: rol?.etiqueta ?? '' });
        this.seleccionadas.set([...(rol?.secciones ?? [])]);
        this.errores.set({});
      });
    });
  }

  etiquetaSeccion(seccion: SeccionAdmin): string {
    return ETIQUETAS_SECCION[seccion];
  }

  estaSeleccionada(seccion: SeccionAdmin): boolean {
    return this.seleccionadas().includes(seccion);
  }

  alternarSeccion(seccion: SeccionAdmin): void {
    this.seleccionadas.update((actuales) =>
      actuales.includes(seccion)
        ? actuales.filter((actual) => actual !== seccion)
        : [...actuales, seccion],
    );
    this.limpiarError('secciones');
  }

  limpiarError(campo: keyof ErroresRol): void {
    this.errores.update((actuales) => {
      if (!actuales[campo]) return actuales;
      const copia = { ...actuales };
      delete copia[campo];
      return copia;
    });
  }

  onSubmit(): void {
    if (this.guardando()) return;

    const datos: DatosRol = {
      nombre: this.form.controls.nombre.value.trim().toLowerCase(),
      etiqueta: this.form.controls.etiqueta.value.trim(),
      secciones: this.seleccionadas(),
    };

    const errores = validarRol(datos, this.esEdicion());
    this.errores.set(errores);

    if (hayErroresRol(errores)) return;

    this.guardar.emit(datos);
  }
}
