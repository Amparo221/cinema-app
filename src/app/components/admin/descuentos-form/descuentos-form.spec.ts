import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Descuentos } from '../../../models/descuento.model';
import { DescuentosForm } from './descuentos-form';

describe('DescuentosForm', () => {
  let component: DescuentosForm;
  let fixture: ComponentFixture<DescuentosForm>;
  let emitidos: Descuentos[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DescuentosForm] }).compileComponents();

    fixture = TestBed.createComponent(DescuentosForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    emitidos = [];
    component.guardar.subscribe(descuentos => emitidos.push(descuentos));
  });

  it('arranca con los valores por defecto', () => {
    expect(component.form.getRawValue()).toEqual({ primeraCompra: 20, cincuenta: 15 });
  });

  it('emite los porcentajes como enteros', () => {
    component.form.patchValue({ primeraCompra: 25, cincuenta: 12.4 });

    component.onSubmit();

    expect(emitidos).toEqual([{ primeraCompra: 25, cincuenta: 12 }]);
  });

  it('no emite porcentajes fuera de 0 a 100', () => {
    component.form.patchValue({ primeraCompra: 120, cincuenta: -1 });

    expect(component.form.invalid).toBe(true);

    component.onSubmit();
    expect(emitidos).toHaveLength(0);
  });

  it('precarga los porcentajes vigentes', async () => {
    fixture.componentRef.setInput('datosIniciales', { primeraCompra: 30, cincuenta: 10 });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.getRawValue()).toEqual({ primeraCompra: 30, cincuenta: 10 });
  });
});
