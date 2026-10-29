import { Component, effect, inject, input, output, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  DESCUENTO_CINCUENTA_DEFAULT,
  DESCUENTO_MAXIMO,
  DESCUENTO_MINIMO,
  DESCUENTO_PRIMERA_COMPRA_DEFAULT,
  Descuentos,
} from '../../../models/descuento.model';

@Component({
  selector: 'app-descuentos-form',
  imports: [ReactiveFormsModule],
  templateUrl: './descuentos-form.html',
  styleUrl: './descuentos-form.css',
})
export class DescuentosForm {
  private fb = inject(NonNullableFormBuilder);

  /** Porcentajes vigentes que se muestran al abrir la sección. */
  datosIniciales = input<Descuentos>({
    primeraCompra: DESCUENTO_PRIMERA_COMPRA_DEFAULT,
    cincuenta: DESCUENTO_CINCUENTA_DEFAULT,
  });
  guardando = input(false);

  guardar = output<Descuentos>();

  minimo = DESCUENTO_MINIMO;
  maximo = DESCUENTO_MAXIMO;

  form = this.fb.group({
    primeraCompra: [
      0,
      [
        Validators.required,
        Validators.min(DESCUENTO_MINIMO),
        Validators.max(DESCUENTO_MAXIMO),
      ],
    ],
    cincuenta: [
      0,
      [
        Validators.required,
        Validators.min(DESCUENTO_MINIMO),
        Validators.max(DESCUENTO_MAXIMO),
      ],
    ],
  });

  constructor() {
    effect(() => {
      const inicial = this.datosIniciales();
      untracked(() => this.form.patchValue(inicial, { emitEvent: false }));
    });
  }

  get primeraCompra() {
    return this.form.controls.primeraCompra;
  }

  get cincuenta() {
    return this.form.controls.cincuenta;
  }

  onSubmit() {
    if (this.guardando()) return;

    this.form.markAllAsTouched();

    if (this.form.invalid) return;

    const valor = this.form.getRawValue();

    this.guardar.emit({
      primeraCompra: Math.round(valor.primeraCompra),
      cincuenta: Math.round(valor.cincuenta),
    });
  }
}
