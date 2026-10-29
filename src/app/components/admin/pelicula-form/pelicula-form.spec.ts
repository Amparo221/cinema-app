import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DatosPelicula, SalidaPelicula } from '../../../models/admin.model';
import { PeliculaForm } from './pelicula-form';

/** Fecha `aaaa-mm-dd` a N días de hoy, para que pase la validación de estreno. */
function enDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);

  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

const fechaEstreno = enDias(10);

const datosBase: DatosPelicula = {
  nombre: 'Heidi',
  sinopsis: 'Una nena en los Alpes.',
  duracion: 110,
  generos: ['Aventura', 'Familiar'],
  restriccion_edad: 'sin_restriccion',
  precio_preventa: 40000,
  fecha_estreno: fechaEstreno,
  proximamente: true,
};

describe('PeliculaForm', () => {
  let component: PeliculaForm;
  let fixture: ComponentFixture<PeliculaForm>;
  let emitidos: SalidaPelicula[];

  const nombreArchivo = 'https://cdn.test/storage/v1/object/public/peliculas/heidi.jpg';

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PeliculaForm] }).compileComponents();

    fixture = TestBed.createComponent(PeliculaForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    emitidos = [];
    component.guardar.subscribe(salida => emitidos.push(salida));
  });

  it('al crear exige una imagen antes de emitir', () => {
    component.form.patchValue({ nombre: 'Heidi', sinopsis: 'Una nena en los Alpes.', duracion: 110 });

    component.onSubmit();

    expect(component.esEdicion()).toBe(false);
    expect(component.textoGuardar()).toBe('Crear película');
    expect(component.errorImagen()).toBe('La imagen es obligatoria.');
    expect(emitidos).toHaveLength(0);
  });

  it('al crear emite la película con el archivo elegido', () => {
    const archivo = new File(['poster'], 'heidi.jpg', { type: 'image/jpeg' });
    component.archivoImagen.set(archivo);
    component.form.patchValue({ nombre: 'Heidi', sinopsis: 'Una nena en los Alpes.', duracion: 110 });

    component.onSubmit();

    expect(emitidos).toHaveLength(1);
    expect(emitidos[0].archivo).toBe(archivo);
    expect(emitidos[0].datos).toMatchObject({ nombre: 'Heidi', proximamente: false });
  });

  it('al editar precarga los datos y conserva la imagen actual', async () => {
    fixture.componentRef.setInput('datosIniciales', { ...datosBase });
    fixture.componentRef.setInput('imagenActual', nombreArchivo);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.esEdicion()).toBe(true);
    expect(component.textoGuardar()).toBe('Guardar cambios');
    expect(component.vistaPrevia()).toBe(nombreArchivo);
    expect(component.form.getRawValue()).toMatchObject({
      nombre: 'Heidi',
      generos: 'Aventura, Familiar',
      duracion: 110,
      precio_preventa: 40000,
      fecha_estreno: fechaEstreno,
      proximamente: true,
    });

    component.onSubmit();

    expect(component.errorImagen()).toBeNull();
    expect(emitidos).toHaveLength(1);
    expect(emitidos[0].archivo).toBeNull();
    expect(emitidos[0].datos).toEqual({
      nombre: 'Heidi',
      sinopsis: 'Una nena en los Alpes.',
      duracion: 110,
      generos: ['Aventura', 'Familiar'],
      restriccion_edad: 'sin_restriccion',
      precio_preventa: 40000,
      fecha_estreno: fechaEstreno,
      proximamente: true,
    });
  });

  it('precarga los datos desde el primer render al abrir en modo edición', async () => {
    const nuevo = TestBed.createComponent(PeliculaForm);
    nuevo.componentRef.setInput('datosIniciales', { ...datosBase });
    nuevo.componentRef.setInput('imagenActual', nombreArchivo);
    nuevo.detectChanges();
    await nuevo.whenStable();

    expect(nuevo.componentInstance.form.getRawValue()).toMatchObject({
      nombre: 'Heidi',
      sinopsis: 'Una nena en los Alpes.',
      restriccion_edad: 'sin_restriccion',
      precio_preventa: 40000,
      fecha_estreno: fechaEstreno,
      proximamente: true,
    });

    nuevo.destroy();
  });

  it('recarga los campos si se elige otra película para editar', async () => {
    fixture.componentRef.setInput('datosIniciales', { ...datosBase });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentRef.setInput('datosIniciales', {
      ...datosBase,
      nombre: 'Otra película',
      duracion: 95,
      precio_preventa: null,
      fecha_estreno: null,
      proximamente: false,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.getRawValue()).toMatchObject({
      nombre: 'Otra película',
      duracion: 95,
      proximamente: false,
      fecha_estreno: '',
      precio_preventa: 0,
    });
    expect(component.form.controls.fecha_estreno.disabled).toBe(true);
  });
});
