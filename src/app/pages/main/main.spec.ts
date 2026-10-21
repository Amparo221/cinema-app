import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Main } from './main';
import { SupabaseService } from '../../services/supabase';
import { Pelicula } from '../../models/pelicula.model';

const PELICULAS: Pelicula[] = [
  {
    id: 1,
    nombre: 'Oppenheimer',
    imagen: 'oppenheimer.jpg',
    sinopsis: null,
    duracion: 180,
    generos: ['Drama'],
    restriccion_edad: '+16',
    precio_preventa: 8000,
    puntuacion_promedio: 4.5,
    proximamente: false,
  },
  {
    id: 2,
    nombre: 'Dune: Parte 2',
    imagen: 'dune.jpg',
    sinopsis: null,
    duracion: 166,
    generos: ['Ciencia ficción'],
    restriccion_edad: '+13',
    precio_preventa: 8000,
    puntuacion_promedio: 4.2,
    proximamente: false,
  },
  {
    id: 3,
    nombre: 'Barbie',
    imagen: 'barbie.jpg',
    sinopsis: null,
    duracion: 114,
    generos: ['Comedia'],
    restriccion_edad: '+13',
    precio_preventa: 7500,
    puntuacion_promedio: 4.1,
    proximamente: false,
  },
  {
    id: 4,
    nombre: 'El Padrino',
    imagen: 'padrino.jpg',
    sinopsis: null,
    duracion: 175,
    generos: ['Drama'],
    restriccion_edad: '+16',
    precio_preventa: 7000,
    puntuacion_promedio: 4.8,
    proximamente: false,
  },
  {
    id: 5,
    nombre: 'Spider-Man',
    imagen: 'spiderman.jpg',
    sinopsis: null,
    duracion: 140,
    generos: ['Acción'],
    restriccion_edad: '+13',
    precio_preventa: 8000,
    puntuacion_promedio: 4.0,
    proximamente: false,
  },
  {
    id: 6,
    nombre: 'Heidi',
    imagen: 'heidi.jpg',
    sinopsis: null,
    duracion: 110,
    generos: ['Familiar'],
    restriccion_edad: 'ATP',
    precio_preventa: 6000,
    puntuacion_promedio: 0,
    proximamente: true,
  },
];

const ASIENTOS_VENDIDOS = new Map<number, number>([
  [1, 1],
  [2, 1],
  [3, 0],
  [4, 0],
  [5, 4],
]);

const supabaseMock = {
  getTodasLasPeliculas: vi.fn<() => Promise<{ data: Pelicula[]; error: null }>>(),
  getAsientosVendidosPorPelicula: vi.fn<() => Promise<Map<number, number>>>(),
  getPeliculaImageUrl: vi.fn<(nombreArchivo: string | null) => string>(),
};

describe('Main', () => {
  let component: Main;
  let fixture: ComponentFixture<Main>;

  function textoSeccion(idTitulo: string): string {
    const seccion = fixture.nativeElement
      .querySelector(`#${idTitulo}`)
      ?.closest('section') as HTMLElement | null;
    return seccion?.textContent ?? '';
  }

  beforeEach(async () => {
    supabaseMock.getTodasLasPeliculas.mockResolvedValue({
      data: PELICULAS,
      error: null,
    });
    supabaseMock.getAsientosVendidosPorPelicula.mockResolvedValue(ASIENTOS_VENDIDOS);
    supabaseMock.getPeliculaImageUrl.mockReturnValue('https://example.com/poster.jpg');

    await TestBed.configureTestingModule({
      imports: [Main],
      providers: [
        provideRouter([]),
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Main);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await vi.waitFor(() => expect(component.cargando()).toBe(false));
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('ordena las 3 más vendidas por asientos y desempata por puntuación', () => {
    expect(component.masVendidas().map(item => item.pelicula.id)).toEqual([5, 1, 2]);
  });

  it('excluye las películas próximas del listado y de las más vendidas', () => {
    expect(component.proximas().map(pelicula => pelicula.id)).toEqual([6]);
    expect(component.masVendidas().some(item => item.pelicula.id === 6)).toBe(false);
    expect(component.peliculasFiltradas().some(pelicula => pelicula.id === 6)).toBe(false);
    expect(component.generosDisponibles()).not.toContain('Familiar');
  });

  it('muestra Próximamente debajo de Las 3 más vendidas', () => {
    const titulos = Array.from(
      fixture.nativeElement.querySelectorAll('section h2') as NodeListOf<HTMLElement>
    ).map(titulo => titulo.textContent?.trim());

    expect(titulos).toEqual([
      'Las 3 más vendidas',
      'Próximamente',
      'Listado de películas',
      'Combos especiales',
    ]);
    expect(textoSeccion('titulo-proximamente')).toContain('Heidi');
    expect(textoSeccion('titulo-listado')).not.toContain('Heidi');
  });

  it('muestra la cantidad de entradas vendidas en el ranking', () => {
    const seccion = fixture.nativeElement
      .querySelector('#titulo-mas-vendidas')
      ?.closest('section') as HTMLElement;
    const tarjetas = seccion.querySelectorAll('.pelicula-card');

    expect(tarjetas).toHaveLength(3);
    expect(tarjetas[0].textContent).toContain('Spider-Man');
    expect(tarjetas[0].textContent).toContain('4 entradas vendidas');
    expect(tarjetas[1].textContent).toContain('Oppenheimer');
  });

  it('muestra Sin ventas cuando una película no tiene asientos vendidos', () => {
    component.asientosVendidos.set(new Map());
    fixture.detectChanges();

    const seccion = fixture.nativeElement
      .querySelector('#titulo-mas-vendidas')
      ?.closest('section') as HTMLElement;

    expect(seccion.textContent).toContain('Sin ventas');
    expect(seccion.textContent).not.toContain('entradas vendidas');
  });

  it('filtra el listado por género', () => {
    component.generoFiltro.set('Ciencia ficción');
    fixture.detectChanges();

    const seccion = fixture.nativeElement
      .querySelector('#titulo-listado')
      ?.closest('section') as HTMLElement;
    const tarjetas = seccion.querySelectorAll('.pelicula-card');

    expect(tarjetas).toHaveLength(1);
    expect(tarjetas[0].textContent).toContain('Dune: Parte 2');
  });
});
