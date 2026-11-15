import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { OpcionSelect, Select } from './select';

const OPCIONES: readonly OpcionSelect[] = [
  { valor: 'pochoclos', etiqueta: 'Pochoclos' },
  { valor: 'bebidas', etiqueta: 'Bebidas' },
  { valor: 'dulces', etiqueta: 'Dulces' },
];

@Component({
  imports: [Select, ReactiveFormsModule],
  template: `
    <label for="categoria">Categoría</label>
    <app-select
      id="categoria"
      [opciones]="opciones"
      [formControl]="control"
      [invalido]="true"
      ayudaId="categoria-ayuda"
    />
    <button type="button" class="afuera">Afuera</button>
  `,
})
class Anfitrion {
  readonly opciones = OPCIONES;
  readonly control = new FormControl<string | null>(null);
}

describe('Select', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let boton: HTMLButtonElement;

  function opciones(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="option"]')) as HTMLElement[];
  }

  async function abrir(): Promise<void> {
    boton.click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function elegir(etiqueta: string): Promise<void> {
    const opcion = opciones().find(elemento => elemento.textContent?.trim() === etiqueta);
    opcion?.click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function tecla(key: string): Promise<void> {
    boton.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Anfitrion] }).compileComponents();

    fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();

    boton = fixture.nativeElement.querySelector('#categoria') as HTMLButtonElement;
  });

  it('mueve el id del host al botón para que el label lo enfoque', () => {
    const host = fixture.nativeElement.querySelector('app-select') as HTMLElement;

    expect(host.getAttribute('id')).toBeNull();
    expect(boton.tagName).toBe('BUTTON');
    expect(boton.getAttribute('role')).toBe('combobox');
  });

  it('muestra el placeholder y abre la lista con el clic', async () => {
    expect(boton.textContent).toContain('Elegí una opción');
    expect(boton.getAttribute('aria-expanded')).toBe('false');

    await abrir();

    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(opciones()).toHaveLength(3);
  });

  it('expone el error y el texto de ayuda en el botón', () => {
    expect(boton.getAttribute('aria-invalid')).toBe('true');
    expect(boton.getAttribute('aria-describedby')).toBe('categoria-ayuda');
  });

  it('escribe el valor elegido en el formulario y cierra la lista', async () => {
    await abrir();
    await elegir('Dulces');

    expect(fixture.componentInstance.control.value).toBe('dulces');
    expect(boton.textContent).toContain('Dulces');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
  });

  it('muestra el valor que llega desde el formulario', async () => {
    fixture.componentInstance.control.setValue('bebidas');
    fixture.detectChanges();

    expect(boton.textContent).toContain('Bebidas');
  });

  it('se maneja con las flechas y Enter', async () => {
    await tecla('ArrowDown');
    expect(boton.getAttribute('aria-expanded')).toBe('true');

    await tecla('ArrowDown');
    await tecla('Enter');

    expect(fixture.componentInstance.control.value).toBe('bebidas');
  });

  it('cierra la lista con Escape sin cambiar el valor', async () => {
    await abrir();
    await tecla('Escape');

    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.control.value).toBeNull();
  });

  it('cierra la lista al hacer clic afuera', async () => {
    await abrir();

    const afuera = fixture.nativeElement.querySelector('.afuera') as HTMLButtonElement;
    afuera.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(boton.getAttribute('aria-expanded')).toBe('false');
  });

  it('se deshabilita junto con el control', () => {
    fixture.componentInstance.control.disable();
    fixture.detectChanges();

    expect(boton.disabled).toBe(true);

    fixture.componentInstance.control.enable();
    fixture.detectChanges();

    expect(boton.disabled).toBe(false);
  });
});
