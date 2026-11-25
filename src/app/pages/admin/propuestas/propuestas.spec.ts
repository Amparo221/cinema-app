import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PropuestaAdmin } from '../../../models/propuesta.model';
import { SupabaseService } from '../../../services/supabase';
import { AdminPropuestas } from './propuestas';

const PENDIENTE: PropuestaAdmin = {
  id: 5,
  usuario_id: 'usuario-1',
  titulo: 'El viaje de Chihiro',
  descripcion: 'Una nena entra a un mundo de espíritus y rescata a sus papás.',
  motivo: 'Es mi favorita y nunca la dieron acá.',
  estado: 'pendiente',
  nota_admin: null,
  pelicula_id: null,
  creada_at: '2026-11-15T12:00:00Z',
  resuelta_at: null,
  resuelta_por: null,
  usuario_nombre: 'Ana Pérez',
  usuario_email: 'ana@cine.com',
  pelicula: null,
  total: 1,
};

describe('AdminPropuestas', () => {
  let fixture: ComponentFixture<AdminPropuestas>;
  let componente: AdminPropuestas;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let supabaseMock: {
    listarPropuestas: ReturnType<typeof vi.fn>;
    resolverPropuesta: ReturnType<typeof vi.fn>;
  };

  async function montar(): Promise<void> {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [AdminPropuestas],
      providers: [
        { provide: Router, useValue: router },
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPropuestas);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    router = { navigate: vi.fn().mockResolvedValue(true) };
    supabaseMock = {
      listarPropuestas: vi.fn().mockResolvedValue({ data: [PENDIENTE], error: null }),
      resolverPropuesta: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    await montar();
  });

  it('pide la primera página sin filtros', () => {
    expect(supabaseMock.listarPropuestas).toHaveBeenCalledWith('', '', 10, 0);
    expect(componente.total()).toBe(1);
  });

  it('muestra al cliente que propuso y su motivo', () => {
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('El viaje de Chihiro');
    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('ana@cine.com');
  });

  it('filtra por estado desde la primera página', async () => {
    componente.pagina.set(2);
    componente.cambiarEstado('rechazada');
    await fixture.whenStable();

    expect(componente.pagina()).toBe(1);
    expect(supabaseMock.listarPropuestas).toHaveBeenLastCalledWith('rechazada', '', 10, 0);
  });

  it('aplicar la búsqueda vuelve a la primera página', async () => {
    componente.pagina.set(3);
    componente.texto.set('chihiro');
    componente.buscar(new Event('submit'));
    await fixture.whenStable();

    expect(supabaseMock.listarPropuestas).toHaveBeenLastCalledWith('', 'chihiro', 10, 0);
  });

  it('aceptar lleva al alta de película con la propuesta precargada', () => {
    componente.aceptar(PENDIENTE);

    expect(router.navigate).toHaveBeenCalledWith(['/admin/general'], {
      queryParams: { propuesta: 5 },
    });
  });

  it('rechaza sin nota cuando el admin no escribe nada', async () => {
    componente.abrirRechazo(5);
    componente.notaRechazo.set('   ');

    await componente.rechazar(PENDIENTE);

    expect(supabaseMock.resolverPropuesta).toHaveBeenCalledWith(5, 'rechazada', null);
    expect(componente.mensaje()).toContain('Rechazaste la propuesta');
    expect(componente.rechazandoId()).toBeNull();
  });

  it('manda la nota de rechazo recortada', async () => {
    componente.abrirRechazo(5);
    componente.notaRechazo.set('  Ya la tenemos programada.  ');

    await componente.rechazar(PENDIENTE);

    expect(supabaseMock.resolverPropuesta).toHaveBeenCalledWith(
      5,
      'rechazada',
      'Ya la tenemos programada.',
    );
  });

  it('avisa si otra persona ya resolvió la propuesta', async () => {
    supabaseMock.resolverPropuesta.mockResolvedValue({
      data: null,
      error: { message: 'PROPUESTA_YA_RESUELTA' },
    });
    componente.abrirRechazo(5);

    await componente.rechazar(PENDIENTE);

    expect(componente.error()).toContain('ya resolvió');
    expect(componente.resolviendo()).toBeNull();
  });

  it('pagina sobre el total de propuestas', async () => {
    supabaseMock.listarPropuestas.mockResolvedValue({
      data: [{ ...PENDIENTE, total: 25 }],
      error: null,
    });
    await montar();

    expect(componente.totalPaginas()).toBe(3);

    componente.irSiguiente();
    await fixture.whenStable();

    expect(componente.pagina()).toBe(2);
    expect(supabaseMock.listarPropuestas).toHaveBeenLastCalledWith('', '', 10, 10);
  });
});
