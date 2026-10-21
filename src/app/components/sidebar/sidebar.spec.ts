import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra todas las secciones de admin cuando el rol las permite', () => {
    fixture.componentRef.setInput('rol', 'admin');
    fixture.detectChanges();

    expect(component.items.map(item => item.ruta)).toEqual([
      '/admin/general',
      '/admin/escaner',
      '/admin/reporte',
      '/admin/log',
    ]);
  });

  it('no muestra secciones de admin a un empleado', () => {
    fixture.componentRef.setInput('rol', 'empleado');
    fixture.detectChanges();

    expect(component.items).toEqual([
      { label: 'Main', ruta: '/main' },
      { label: 'Escáner', ruta: '/escaner' },
    ]);
  });
});
