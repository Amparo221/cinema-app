import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportesService } from '../../../services/reportes';
import { AdminReporte } from './reporte';

const FACTURACION = {
  dia: '2026-11-10',
  compras: 2,
  entradas: 3,
  entradas_usadas: 1,
  dinero_butacas: 3000,
  dinero_candy: 500,
  total_cobrado: 3200,
  puntos_usados: 0,
  creditos_usados: 300,
  canceladas: 1,
  monto_cancelado: 900,
};

const PELICULA = {
  periodo: '2026-11-09',
  periodo_inicio: '2026-11-09',
  pelicula_id: 1,
  pelicula: 'Duna',
  entradas: 3,
  ingresos: 3000,
};

const CANDY = {
  producto_id: 1,
  producto: 'Pochoclo',
  cantidad: 4,
  ingresos: 400,
  combos: 1,
  extras: 3,
};

function crearMock() {
  return {
    facturacion: vi.fn().mockResolvedValue({ filas: [FACTURACION], error: null }),
    peliculas: vi.fn().mockResolvedValue({ filas: [PELICULA], error: null }),
    candy: vi.fn().mockResolvedValue({ filas: [CANDY], error: null }),
    compras: vi.fn().mockResolvedValue({ filas: [], error: null }),
  };
}

describe('AdminReporte', () => {
  let fixture: ComponentFixture<AdminReporte>;
  let componente: AdminReporte;
  let reportes: ReturnType<typeof crearMock>;

  async function cargarTodo(): Promise<void> {
    // Las RPC son promesas: hay que dejar correr los microtasks y repintar.
    await new Promise((resolver) => setTimeout(resolver, 0));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function montar(): Promise<void> {
    reportes = crearMock();

    await TestBed.configureTestingModule({
      imports: [AdminReporte],
      providers: [{ provide: ReportesService, useValue: reportes }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminReporte);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    await cargarTodo();
  }

  beforeEach(() => montar());

  it('pide los cuatro reportes con el rango de los últimos 7 días', () => {
    const rango = { desde: componente.desde(), hasta: componente.hasta() };

    expect(reportes.facturacion).toHaveBeenCalledWith(rango);
    expect(reportes.peliculas).toHaveBeenCalledWith(rango, 'semana');
    expect(reportes.candy).toHaveBeenCalledWith(rango);
    expect(reportes.compras).toHaveBeenCalledWith(rango);
    expect(componente.dias()).toHaveLength(7);
  });

  it('suma los totales y arma las series de los gráficos', () => {
    expect(componente.totales().total_cobrado).toBe(3200);
    expect(componente.totales().canceladas).toBe(1);
    expect(componente.barrasPeliculas()[0].etiqueta).toBe('Duna');
    expect(componente.barrasCandy()[0].etiqueta).toBe('Pochoclo');
    expect(componente.mejor()?.producto).toBe('Pochoclo');
  });

  it('muestra el total cobrado en la tarjeta del resumen', () => {
    const tarjetas = fixture.nativeElement.querySelectorAll('.tarjeta dd');

    expect(tarjetas[0].textContent).toContain('3.200');
  });

  it('vuelve a pedir el ranking al cambiar la agrupación a mes', async () => {
    const select = fixture.nativeElement.querySelector('#reporte-agrupacion') as HTMLSelectElement;
    select.value = 'mes';
    select.dispatchEvent(new Event('change'));

    await cargarTodo();

    expect(componente.agrupacion()).toBe('mes');
    expect(reportes.peliculas).toHaveBeenLastCalledWith(expect.anything(), 'mes');
  });

  it('traduce el error de la RPC y no muestra datos', async () => {
    reportes.facturacion.mockResolvedValue({ filas: [], error: 'NO_AUTORIZADO' });

    componente.ngOnInit();
    await cargarTodo();

    expect(componente.error()).toContain('Solo un administrador');
    expect(componente.dias()).toHaveLength(7);
    expect(componente.totales().total_cobrado).toBe(0);
  });

  it('no consulta si el rango está al revés', async () => {
    const input = fixture.nativeElement.querySelector('#reporte-desde') as HTMLInputElement;
    reportes.facturacion.mockClear();

    input.value = '2030-01-01';
    input.dispatchEvent(new Event('change'));
    await cargarTodo();

    expect(componente.error()).toContain('no puede ser anterior');
    expect(reportes.facturacion).not.toHaveBeenCalled();
  });
});
