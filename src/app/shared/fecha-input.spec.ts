import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { FechaInput } from './fecha-input';

@Component({
  imports: [FechaInput, ReactiveFormsModule],
  template: `<input appFecha [formControl]="control" aria-label="Fecha de nacimiento" />`,
})
class Anfitrion {
  readonly control = new FormControl('', { nonNullable: true });
}

describe('FechaInput', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let input: HTMLInputElement;

  async function escribir(texto: string): Promise<void> {
    input.value = texto;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Anfitrion] }).compileComponents();

    fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();

    input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  });

  it('se comporta como un campo de texto con lugar para 10 caracteres', () => {
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('maxlength')).toBe('10');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.placeholder).toBe('dd/mm/aaaa');
  });

  it('inserta las barras mientras se escribe', async () => {
    await escribir('02112006');

    expect(input.value).toBe('02/11/2006');
    expect(fixture.componentInstance.control.value).toBe('2006-11-02');
  });

  it('descarta las letras', async () => {
    await escribir('ab12cd34ef5678gh');

    expect(input.value).toBe('12/34/5678');
  });

  it('avisa vacío mientras la fecha está incompleta', async () => {
    fixture.componentInstance.control.setValue('2006-11-02');
    fixture.detectChanges();

    await escribir('0211');

    expect(input.value).toBe('02/11');
    expect(fixture.componentInstance.control.value).toBe('');
  });

  it('no borra el texto parcial cuando el control queda vacío', async () => {
    await escribir('021');

    expect(input.value).toBe('02/1');
  });

  it('rechaza una fecha que no existe', async () => {
    await escribir('31022006');

    expect(input.value).toBe('31/02/2006');
    expect(fixture.componentInstance.control.value).toBe('');
  });

  it('muestra la fecha que llega desde el formulario', async () => {
    fixture.componentInstance.control.setValue('1990-05-17');
    fixture.detectChanges();

    expect(input.value).toBe('17/05/1990');
  });

  it('se deshabilita junto con el control', () => {
    fixture.componentInstance.control.disable();
    fixture.detectChanges();

    expect(input.disabled).toBe(true);

    fixture.componentInstance.control.enable();
    fixture.detectChanges();

    expect(input.disabled).toBe(false);
  });
});
