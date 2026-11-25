import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DatosRol, RolAdmin } from '../../../models/rol-admin.model';
import { RolForm } from './rol-form';

const ROL: RolAdmin = {
  nombre: 'encargado_sala',
  etiqueta: 'Encargado de sala',
  secciones: ['reporte'],
  es_sistema: false,
  usuarios: 0,
};

describe('RolForm', () => {
  let component: RolForm;
  let fixture: ComponentFixture<RolForm>;
  let emitidos: DatosRol[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RolForm] }).compileComponents();

    fixture = TestBed.createComponent(RolForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    emitidos = [];
    component.guardar.subscribe((datos) => emitidos.push(datos));
  });

  it('no emite nada si falta completar los campos', () => {
    component.onSubmit();

    expect(emitidos).toHaveLength(0);
    expect(component.errores().nombre).toBeDefined();
    expect(component.errores().etiqueta).toBeDefined();
    expect(component.errores().secciones).toBeDefined();
  });

  it('emite el nombre normalizado y las secciones elegidas', () => {
    component.form.setValue({ nombre: ' Encargado_Sala ', etiqueta: ' Encargado de sala ' });
    component.alternarSeccion('reporte');
    component.alternarSeccion('log');

    component.onSubmit();

    expect(emitidos).toEqual([
      {
        nombre: 'encargado_sala',
        etiqueta: 'Encargado de sala',
        secciones: ['reporte', 'log'],
      },
    ]);
  });

  it('quita una sección al destildarla', () => {
    component.alternarSeccion('reporte');
    component.alternarSeccion('log');
    component.alternarSeccion('reporte');

    expect(component.seleccionadas()).toEqual(['log']);
    expect(component.estaSeleccionada('reporte')).toBe(false);
  });

  it('no deja marcar la sección de administrar roles', () => {
    expect(component.secciones).not.toContain('roles');
  });

  it('precarga el rol en edición y bloquea el nombre', async () => {
    fixture.componentRef.setInput('datosIniciales', ROL);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.getRawValue()).toEqual({
      nombre: 'encargado_sala',
      etiqueta: 'Encargado de sala',
    });
    expect(component.seleccionadas()).toEqual(['reporte']);

    const nombre = fixture.nativeElement.querySelector('#rol-nombre') as HTMLInputElement;
    expect(nombre.readOnly).toBe(true);
  });

  it('no emite mientras se está guardando', () => {
    fixture.componentRef.setInput('guardando', true);
    fixture.detectChanges();
    component.form.setValue({ nombre: 'encargado_sala', etiqueta: 'Encargado' });
    component.alternarSeccion('reporte');

    component.onSubmit();

    expect(emitidos).toHaveLength(0);
  });

  it('avisa cuando el rol ya existe', () => {
    fixture.componentRef.setInput('error', 'Ya existe un rol con ese nombre.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ya existe un rol con ese nombre.');
  });
});
