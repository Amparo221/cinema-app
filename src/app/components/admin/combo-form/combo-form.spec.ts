import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SalidaCombo } from '../../../models/admin.model';
import { ProductoCandy } from '../../../models/producto-candy.model';
import { ComboForm } from './combo-form';

const productos: ProductoCandy[] = [
  {
    id: 1,
    nombre: 'Pochoclo grande',
    descripcion: null,
    categoria: 'pochoclos',
    precio: 8000,
    imagen: null,
    stock: 20,
  },
  {
    id: 2,
    nombre: 'Bebida grande',
    descripcion: null,
    categoria: 'bebidas',
    precio: 6000,
    imagen: null,
    stock: 20,
  },
];

const comboBase = {
  nombre: 'Combo pochoclo + bebida',
  descripcion: 'Una butaca y dos productos',
  producto_1_id: 1,
  producto_2_id: 2,
  puntos: 14000,
  puntos_plus: 18000,
  activo: true,
};

describe('ComboForm', () => {
  let component: ComboForm;
  let fixture: ComponentFixture<ComboForm>;
  let emitidos: SalidaCombo[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ComboForm] }).compileComponents();

    fixture = TestBed.createComponent(ComboForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('productos', productos);
    fixture.detectChanges();
    await fixture.whenStable();

    emitidos = [];
    component.guardar.subscribe(salida => emitidos.push(salida));
  });

  it('no emite si los dos productos son el mismo', () => {
    component.form.patchValue({ nombre: 'Combo', producto_1_id: 1, producto_2_id: 1 });
    component.form.controls.puntos.setValue(14000);
    component.form.controls.puntos_plus.setValue(18000);

    expect(component.productoDos.hasError('repetido')).toBe(true);

    component.onSubmit();
    expect(emitidos).toHaveLength(0);
  });

  it('no emite si los puntos Plus no superan a los normales', () => {
    component.form.patchValue({
      nombre: 'Combo',
      producto_1_id: 1,
      producto_2_id: 2,
      puntos: 14000,
      puntos_plus: 14000,
    });

    expect(component.puntosPlus.hasError('plusMenor')).toBe(true);

    component.onSubmit();
    expect(emitidos).toHaveLength(0);
  });

  it('emite la recompensa cuando el formulario es válido', () => {
    component.form.patchValue(comboBase);

    component.onSubmit();

    expect(emitidos).toHaveLength(1);
    expect(emitidos[0].datos).toEqual(comboBase);
  });

  it('sugiere puntos a partir del precio de los productos elegidos', () => {
    expect(component.puntosSugeridos()).toBe(0);

    component.form.patchValue({ producto_1_id: 1, producto_2_id: 2 });

    expect(component.puntosSugeridos()).toBe(14000);
  });

  it('al editar precarga los datos de la recompensa', async () => {
    fixture.componentRef.setInput('datosIniciales', { ...comboBase, activo: false });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.esEdicion()).toBe(true);
    expect(component.textoGuardar()).toBe('Guardar cambios');
    expect(component.form.getRawValue()).toMatchObject({ ...comboBase, activo: false });
  });
});
