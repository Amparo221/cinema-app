import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistroActividad } from '../../../models/actividad.model';
import { ActividadService } from '../../../services/actividad';
import { AdminLog } from './log';

const REGISTRO: RegistroActividad = {
  id: 7,
  created_at: '2026-11-14T12:30:00Z',
  usuario_nombre: 'Ana Pérez',
  rol: 'admin',
  accion: 'candy_modificado',
  entidad: 'productos_candy',
  entidad_id: '5',
  detalle: { precio: { antes: 1000, despues: 1200 } },
  total: 30,
};

function crearMock() {
  return {
    listar: vi
      .fn()
      .mockResolvedValue({ pagina: { registros: [REGISTRO], total: 30 }, error: null }),
  };
}

describe('AdminLog', () => {
  let fixture: ComponentFixture<AdminLog>;
  let componente: AdminLog;
  let actividad: ReturnType<typeof crearMock>;

  async function montar(): Promise<void> {
    actividad = crearMock();

    await TestBed.configureTestingModule({
      imports: [AdminLog],
      providers: [{ provide: ActividadService, useValue: actividad }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLog);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => montar());

  it('pide la primera página sin filtros', () => {
    expect(actividad.listar).toHaveBeenCalledWith(
      { desde: '', hasta: '', accion: '', usuario: '' },
      1,
      25,
    );
  });

  it('muestra quién hizo el cambio, cuándo y qué cambió', () => {
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('Producto de candy modificado');
    expect(texto).toContain('#5');
    expect(texto).toContain('precio: 1.000 → 1.200');
    expect(texto).toContain('30 registros');
  });

  it('pagina sobre el total que devuelve la RPC', async () => {
    expect(componente.totalPaginas()).toBe(2);

    componente.irSiguiente();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(actividad.listar).toHaveBeenLastCalledWith(expect.anything(), 2, 25);
    expect(fixture.nativeElement.textContent).toContain('Página 2 de 2');
  });

  it('filtra por acción y vuelve a la primera página', async () => {
    const select = fixture.nativeElement.querySelector('#log-accion') as HTMLSelectElement;
    select.value = 'qr_validado';
    select.dispatchEvent(new Event('change'));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(actividad.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ accion: 'qr_validado' }),
      1,
      25,
    );
  });

  it('aplica el buscador por usuario al enviar el formulario', async () => {
    const input = fixture.nativeElement.querySelector('#log-usuario') as HTMLInputElement;
    input.value = 'Ana';
    input.dispatchEvent(new Event('input'));

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(actividad.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ usuario: 'Ana' }),
      1,
      25,
    );
  });

  it('limpia los filtros', async () => {
    componente.accion.set('qr_validado');
    componente.limpiarFiltros();
    await fixture.whenStable();

    expect(componente.accion()).toBe('');
    expect(actividad.listar).toHaveBeenLastCalledWith(
      { desde: '', hasta: '', accion: '', usuario: '' },
      1,
      25,
    );
  });

  it('muestra el estado vacío cuando no hay registros', async () => {
    actividad.listar.mockResolvedValue({ pagina: { registros: [], total: 0 }, error: null });

    componente.limpiarFiltros();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay registros con estos filtros.');
  });

  it('traduce el error de la RPC', async () => {
    actividad.listar.mockResolvedValue({
      pagina: { registros: [], total: 0 },
      error: 'NO_AUTORIZADO',
    });

    componente.limpiarFiltros();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(componente.error()).toContain('Solo un administrador');
  });
});
