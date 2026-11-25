import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Profile } from '../../models/profile.model';
import { Propuesta } from '../../models/propuesta.model';
import { SessionService } from '../../services/session';
import { SupabaseService } from '../../services/supabase';
import { Propuestas } from './propuestas';

const PERFIL: Profile = {
  id: 'usuario-1',
  email: 'ana@cine.com',
  nombre: 'Ana',
  apellido: 'Pérez',
  fecha_nacimiento: '1990-01-01',
  tipo_sangre: 'O+',
  color_ojos: 'marrón',
  dias_vacaciones: 0,
  puntos: 0,
  creditos: 0,
  primera_compra: false,
  role: 'registrado',
};

const PENDIENTE: Propuesta = {
  id: 3,
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
};

describe('Propuestas (cliente)', () => {
  let fixture: ComponentFixture<Propuestas>;
  let componente: Propuestas;
  let sessionMock: { usuario: ReturnType<typeof signal<Profile | null>> };
  let supabaseMock: {
    getMisPropuestas: ReturnType<typeof vi.fn>;
    crearPropuesta: ReturnType<typeof vi.fn>;
  };

  async function montar(): Promise<void> {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [Propuestas],
      providers: [
        provideRouter([]),
        { provide: SessionService, useValue: sessionMock },
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Propuestas);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    sessionMock = { usuario: signal<Profile | null>(PERFIL) };
    supabaseMock = {
      getMisPropuestas: vi.fn().mockResolvedValue({ data: [], error: null }),
      crearPropuesta: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    await montar();
  });

  it('pide las propuestas del usuario al entrar', () => {
    expect(supabaseMock.getMisPropuestas).toHaveBeenCalledWith('usuario-1');
  });

  it('invita a iniciar sesión cuando no hay usuario', async () => {
    sessionMock.usuario.set(null);
    supabaseMock.getMisPropuestas.mockClear();
    await montar();

    expect(fixture.nativeElement.textContent).toContain('Tenés que iniciar sesión');
    expect(supabaseMock.getMisPropuestas).not.toHaveBeenCalled();
  });

  it('muestra la propuesta pendiente en lugar del formulario', async () => {
    supabaseMock.getMisPropuestas.mockResolvedValue({ data: [PENDIENTE], error: null });
    await montar();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Tu propuesta está en revisión');
    expect(texto).toContain('El viaje de Chihiro');
    expect(fixture.nativeElement.querySelector('#titulo')).toBeNull();
  });

  it('no envía nada si los datos no son válidos', async () => {
    componente.titulo = 'ab';
    componente.descripcion = 'corta';
    componente.motivo = 'corto';

    await componente.enviar();

    expect(supabaseMock.crearPropuesta).not.toHaveBeenCalled();
    expect(componente.errores().titulo).toBeDefined();
    expect(componente.error()).toBe('Revisá los campos marcados.');
  });

  it('envía la propuesta recortada y recarga la lista', async () => {
    componente.titulo = '  El viaje de Chihiro ';
    componente.descripcion = ' Una nena entra a un mundo de espíritus. ';
    componente.motivo = ' Es mi favorita y nunca la dieron acá. ';

    await componente.enviar();

    expect(supabaseMock.crearPropuesta).toHaveBeenCalledWith({
      usuario_id: 'usuario-1',
      titulo: 'El viaje de Chihiro',
      descripcion: 'Una nena entra a un mundo de espíritus.',
      motivo: 'Es mi favorita y nunca la dieron acá.',
    });
    expect(componente.mensaje()).toContain('quedó en revisión');
    expect(componente.titulo).toBe('');
    expect(supabaseMock.getMisPropuestas).toHaveBeenCalledTimes(2);
  });

  it('muestra el error de la base en castellano', async () => {
    supabaseMock.crearPropuesta.mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint (23505)' },
    });
    componente.titulo = 'El viaje de Chihiro';
    componente.descripcion = ' Una nena entra a un mundo de espíritus. ';
    componente.motivo = ' Es mi favorita y nunca la dieron acá. ';

    await componente.enviar();

    expect(componente.error()).toContain('Ya tenés una propuesta pendiente');
    expect(componente.enviando()).toBe(false);
  });
});
