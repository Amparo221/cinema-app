import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeliculaForm } from './pelicula-form';
import { SalidaPelicula } from '../../../models/admin.model';

function prepararFormularioValido(component: PeliculaForm) {
  component.archivoImagen.set(new File(['imagen'], 'poster.png', { type: 'image/png' }));
  component.form.patchValue({
    nombre: 'Matrix',
    sinopsis: 'Una hacker descubre la verdad.',
    duracion: 120,
    generos: 'Acción',
    precio_preventa: 15000,
  });
}

describe('PeliculaForm', () => {
  let component: PeliculaForm;
  let fixture: ComponentFixture<PeliculaForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeliculaForm],
    }).compileComponents();

    fixture = TestBed.createComponent(PeliculaForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no emite si falta la imagen obligatoria', () => {
    let emitido: SalidaPelicula | undefined;
    component.guardar.subscribe(valor => (emitido = valor));

    component.form.patchValue({
      nombre: 'Matrix',
      sinopsis: 'Una hacker descubre la verdad.',
      duracion: 120,
    });
    component.onSubmit();

    expect(emitido).toBeUndefined();
    expect(component.errorImagen()).toBe('La imagen es obligatoria.');
  });

  it('emite los datos normalizados y el archivo cuando el formulario es válido', () => {
    let emitido: SalidaPelicula | undefined;
    component.guardar.subscribe(valor => (emitido = valor));

    const archivo = new File(['imagen'], 'poster.png', { type: 'image/png' });
    component.archivoImagen.set(archivo);
    component.form.patchValue({
      nombre: '  Matrix  ',
      sinopsis: '  Una hacker descubre la verdad.  ',
      duracion: 120,
      generos: 'Acción, Ciencia ficción',
      precio_preventa: 15000,
    });

    component.onSubmit();

    expect(emitido).toBeDefined();
    expect(emitido?.datos.nombre).toBe('Matrix');
    expect(emitido?.datos.generos).toEqual(['Acción', 'Ciencia ficción']);
    expect(emitido?.datos.precio_preventa).toBe(15000);
    expect(emitido?.datos.sinopsis).toBe('Una hacker descubre la verdad.');
    expect(emitido?.datos.restriccion_edad).toBe('sin_restriccion');
    expect(emitido?.archivo).toBe(archivo);
  });

  it('rechaza una duración menor a 30 minutos', () => {
    let emitido: SalidaPelicula | undefined;
    component.guardar.subscribe(valor => (emitido = valor));

    prepararFormularioValido(component);
    component.form.controls.duracion.setValue(29);
    component.onSubmit();

    expect(component.duracion.hasError('min')).toBe(true);
    expect(emitido).toBeUndefined();
  });

  it('acepta exactamente 30 minutos', () => {
    let emitido: SalidaPelicula | undefined;
    component.guardar.subscribe(valor => (emitido = valor));

    prepararFormularioValido(component);
    component.form.controls.duracion.setValue(30);
    component.onSubmit();

    expect(component.duracion.valid).toBe(true);
    expect(emitido?.datos.duracion).toBe(30);
  });

  it('rechaza una sinopsis vacía o con solo espacios', () => {
    let emitido: SalidaPelicula | undefined;
    component.guardar.subscribe(valor => (emitido = valor));

    prepararFormularioValido(component);
    component.form.controls.sinopsis.setValue('   ');
    component.onSubmit();

    expect(component.sinopsis.hasError('pattern')).toBe(true);
    expect(emitido).toBeUndefined();
  });

  it('muestra un recordatorio si hay más de 20 caracteres sin coma', () => {
    component.form.controls.generos.setValue('A'.repeat(21));

    expect(component.recordatorioGeneros()).toBe(true);
  });

  it('no muestra el recordatorio con 20 caracteres o si hay una coma', () => {
    component.form.controls.generos.setValue('A'.repeat(20));
    expect(component.recordatorioGeneros()).toBe(false);

    component.form.controls.generos.setValue('Acción, Aventura y Ciencia ficción');
    expect(component.recordatorioGeneros()).toBe(false);
  });

  it('renderiza el recordatorio de géneros sin bloquear el guardado', () => {
    let emitido: SalidaPelicula | undefined;
    component.guardar.subscribe(valor => (emitido = valor));

    prepararFormularioValido(component);
    component.form.controls.generos.setValue('A'.repeat(21));
    fixture.detectChanges();

    const aviso = fixture.nativeElement.querySelector('#pelicula-generos-recordatorio');
    expect(aviso?.getAttribute('role')).toBe('status');
    expect(aviso?.textContent).toContain('comas');

    component.onSubmit();
    expect(emitido?.datos.generos).toEqual(['A'.repeat(21)]);
  });

  it('rechaza imágenes que no son PNG, JPG o WEBP', () => {
    const input = document.createElement('input');
    const archivo = new File(['imagen'], 'poster.gif', { type: 'image/gif' });
    Object.defineProperty(input, 'files', { value: [archivo] });

    component.onImagenSeleccionada({ target: input } as unknown as Event);

    expect(component.archivoImagen()).toBeNull();
    expect(component.errorImagen()).toBe('Formato no válido. Usá PNG, JPG o WEBP.');
  });
});
