import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductoCandyForm } from './producto-candy-form';
import { SalidaProductoCandy } from '../../../models/admin.model';

describe('ProductoCandyForm', () => {
  let component: ProductoCandyForm;
  let fixture: ComponentFixture<ProductoCandyForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductoCandyForm],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductoCandyForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no emite si falta la imagen obligatoria', () => {
    let emitido: SalidaProductoCandy | undefined;
    component.guardar.subscribe(valor => (emitido = valor));

    component.form.patchValue({ nombre: 'Pochoclos grandes', precio: 5000 });
    component.onSubmit();

    expect(emitido).toBeUndefined();
    expect(component.errorImagen()).toBe('La imagen es obligatoria.');
  });

  it('emite los datos y el archivo cuando el formulario es válido', () => {
    let emitido: SalidaProductoCandy | undefined;
    component.guardar.subscribe(valor => (emitido = valor));

    const archivo = new File(['imagen'], 'pochoclos.png', { type: 'image/png' });
    component.archivoImagen.set(archivo);
    component.form.patchValue({
      nombre: '  Pochoclos grandes  ',
      descripcion: '  Con manteca  ',
      categoria: 'pochoclos',
      precio: 5000,
      stock: 20,
    });

    component.onSubmit();

    expect(emitido).toBeDefined();
    expect(emitido?.datos.nombre).toBe('Pochoclos grandes');
    expect(emitido?.datos.descripcion).toBe('Con manteca');
    expect(emitido?.datos.categoria).toBe('pochoclos');
    expect(emitido?.datos.precio).toBe(5000);
    expect(emitido?.datos.stock).toBe(20);
    expect(emitido?.archivo).toBe(archivo);
  });

  it('rechaza imágenes de más de 5 MB', () => {
    const input = document.createElement('input');
    const archivo = new File(['x'], 'grande.png', { type: 'image/png' });
    Object.defineProperty(archivo, 'size', { value: 5 * 1024 * 1024 + 1 });
    Object.defineProperty(input, 'files', { value: [archivo] });

    component.onImagenSeleccionada({ target: input } as unknown as Event);

    expect(component.archivoImagen()).toBeNull();
    expect(component.errorImagen()).toBe('La imagen no puede superar los 5 MB.');
  });
});
