import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminGeneral } from './general';

describe('AdminGeneral', () => {
  let component: AdminGeneral;
  let fixture: ComponentFixture<AdminGeneral>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminGeneral],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminGeneral);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no carga datos si no hay sesión', () => {
    expect(component.cargando()).toBe(false);
    expect(component.peliculas()).toEqual([]);
    expect(component.productos()).toEqual([]);
  });

  it('formatea precios y valores nulos', () => {
    expect(component.formatearPrecio(null)).toBe('—');
    expect(component.formatearPrecio(15000)).toContain('15');
  });

  it('traduce las restricciones de edad', () => {
    expect(component.etiquetaRestriccion(null)).toBe('—');
    expect(component.etiquetaRestriccion('sin_restriccion')).toBe('Sin restricción');
    expect(component.etiquetaRestriccion('18+')).toBe('18+');
  });

  it('abre y cierra el formulario de películas', () => {
    component.abrirFormPelicula();
    expect(component.mostrarFormPelicula()).toBe(true);

    component.cerrarFormPelicula();
    expect(component.mostrarFormPelicula()).toBe(false);
  });
});
