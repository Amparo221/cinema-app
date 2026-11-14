import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GraficoBarras } from './grafico-barras';

describe('GraficoBarras', () => {
  let fixture: ComponentFixture<GraficoBarras>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GraficoBarras] }).compileComponents();

    fixture = TestBed.createComponent(GraficoBarras);
    fixture.componentRef.setInput('titulo', 'Entradas por película');
    fixture.componentRef.setInput('datos', [
      { etiqueta: 'Duna', valor: 10 },
      { etiqueta: 'Alien', valor: 5 },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('muestra el título y una barra por dato', () => {
    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector('figcaption')?.textContent).toContain('Entradas por película');
    expect(elemento.querySelectorAll('.fila')).toHaveLength(2);
    expect(elemento.textContent).toContain('Duna');
  });

  it('escala la barra más grande al 100%', () => {
    const barras = fixture.nativeElement.querySelectorAll('.barra') as NodeListOf<HTMLElement>;

    expect(barras[0].style.width).toBe('100%');
    expect(barras[1].style.width).toBe('50%');
  });

  it('limita la cantidad de barras con `maximo`', async () => {
    fixture.componentRef.setInput('maximo', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.fila')).toHaveLength(1);
  });

  it('avisa cuando no hay datos', async () => {
    fixture.componentRef.setInput('datos', []);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.fila')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Sin datos');
  });
});
