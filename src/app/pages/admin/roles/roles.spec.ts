import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Profile } from '../../../models/profile.model';
import { RolAdmin, UsuarioRol } from '../../../models/rol-admin.model';
import { SessionService } from '../../../services/session';
import { SupabaseService } from '../../../services/supabase';
import { AdminRoles } from './roles';

const DUENO: Profile = {
  id: 'dueno-1',
  email: 'dueno@cine.com',
  nombre: 'Dueña',
  apellido: 'Arcos',
  fecha_nacimiento: '1980-01-01',
  tipo_sangre: 'O+',
  color_ojos: 'marrón',
  dias_vacaciones: 0,
  puntos: 0,
  creditos: 0,
  primera_compra: false,
  role: 'dueno',
};

const ROLES: RolAdmin[] = [
  {
    nombre: 'admin',
    etiqueta: 'Administrador',
    secciones: ['general', 'escaner', 'reporte', 'log', 'propuestas'],
    es_sistema: true,
    usuarios: 2,
  },
  {
    nombre: 'encargado',
    etiqueta: 'Encargado de sala',
    secciones: ['reporte'],
    es_sistema: false,
    usuarios: 0,
  },
];

const USUARIOS: UsuarioRol[] = [
  {
    id: 'dueno-1',
    email: 'dueno@cine.com',
    nombre: 'Dueña',
    apellido: 'Arcos',
    rol: 'dueno',
    rol_etiqueta: 'Dueño',
    total: 2,
  },
  {
    id: 'usuario-2',
    email: 'ana@cine.com',
    nombre: 'Ana',
    apellido: 'Pérez',
    rol: 'registrado',
    rol_etiqueta: 'Registrado',
    total: 2,
  },
];

describe('AdminRoles', () => {
  let fixture: ComponentFixture<AdminRoles>;
  let componente: AdminRoles;
  let supabaseMock: {
    getRoles: ReturnType<typeof vi.fn>;
    getUsuariosDeRol: ReturnType<typeof vi.fn>;
    crearRol: ReturnType<typeof vi.fn>;
    actualizarRol: ReturnType<typeof vi.fn>;
    eliminarRol: ReturnType<typeof vi.fn>;
    asignarRol: ReturnType<typeof vi.fn>;
  };

  async function montar(): Promise<void> {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [AdminRoles],
      providers: [
        { provide: SessionService, useValue: { usuario: signal<Profile | null>(DUENO) } },
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRoles);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    supabaseMock = {
      getRoles: vi.fn().mockResolvedValue({ data: ROLES, error: null }),
      getUsuariosDeRol: vi.fn().mockResolvedValue({ data: USUARIOS, error: null }),
      crearRol: vi.fn().mockResolvedValue({ data: null, error: null }),
      actualizarRol: vi.fn().mockResolvedValue({ data: null, error: null }),
      eliminarRol: vi.fn().mockResolvedValue({ data: null, error: null }),
      asignarRol: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    await montar();
  });

  it('carga los roles y la primera página de usuarios', () => {
    expect(supabaseMock.getRoles).toHaveBeenCalledTimes(1);
    expect(supabaseMock.getUsuariosDeRol).toHaveBeenCalledWith('', 10, 0);
    expect(componente.totalUsuarios()).toBe(2);
  });

  it('muestra los roles y los usuarios con su rol actual', async () => {
    await vi.waitFor(() => expect(componente.usuarios().length).toBe(2));
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Administrador');
    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('Registrado');
  });

  it('deja el rol propio en solo lectura', () => {
    expect(componente.puedeCambiar(USUARIOS[0])).toBe(false);
    expect(componente.puedeCambiar(USUARIOS[1])).toBe(true);
  });

  it('crea un rol propio con las secciones elegidas', async () => {
    componente.abrirFormNuevo();

    await componente.guardarRol({
      nombre: 'encargado',
      etiqueta: 'Encargado de sala',
      secciones: ['reporte', 'log'],
    });

    expect(supabaseMock.crearRol).toHaveBeenCalledWith('encargado', 'Encargado de sala', [
      'reporte',
      'log',
    ]);
    expect(componente.mensaje()).toContain('creado');
    expect(componente.mostrarForm()).toBe(false);
  });

  it('actualiza el rol que se está editando', async () => {
    componente.editarRol(ROLES[1]);

    await componente.guardarRol({
      nombre: 'otro_nombre',
      etiqueta: 'Encargado',
      secciones: ['reporte', 'log'],
    });

    // El nombre es la clave: se manda el del rol original.
    expect(supabaseMock.actualizarRol).toHaveBeenCalledWith('encargado', 'Encargado', [
      'reporte',
      'log',
    ]);
    expect(componente.rolEnEdicion()).toBeNull();
  });

  it('muestra el error de la base al guardar', async () => {
    supabaseMock.crearRol.mockResolvedValue({
      data: null,
      error: { message: 'ROL_EXISTENTE' },
    });
    componente.abrirFormNuevo();

    await componente.guardarRol({ nombre: 'admin', etiqueta: 'Admin', secciones: ['log'] });

    expect(componente.errorForm()).toBe('Ya existe un rol con ese nombre.');
    expect(componente.mostrarForm()).toBe(true);
  });

  it('asigna un rol a otro usuario', async () => {
    componente.abrirCambio(USUARIOS[1]);
    componente.cambiarRolElegido('encargado');

    await componente.asignar(USUARIOS[1]);

    expect(supabaseMock.asignarRol).toHaveBeenCalledWith('usuario-2', 'encargado');
    expect(componente.mensaje()).toContain('Ana Pérez');
    expect(componente.cambiandoId()).toBeNull();
  });

  it('no asigna si no se eligió un rol', async () => {
    componente.abrirCambio(USUARIOS[1]);
    componente.cambiarRolElegido(null);

    await componente.asignar(USUARIOS[1]);

    expect(supabaseMock.asignarRol).not.toHaveBeenCalled();
  });

  it('avisa cuando el backend rechaza el cambio de rol', async () => {
    supabaseMock.asignarRol.mockResolvedValue({
      data: null,
      error: { message: 'ROL_PROPIO' },
    });
    componente.abrirCambio(USUARIOS[1]);
    componente.cambiarRolElegido('admin');

    await componente.asignar(USUARIOS[1]);

    expect(componente.errorUsuarios()).toBe('No podés cambiarte el rol a vos mismo.');
    expect(componente.asignando()).toBeNull();
  });

  it('elimina un rol propio', async () => {
    componente.pedirEliminar('encargado');

    await componente.eliminarRol(ROLES[1]);

    expect(supabaseMock.eliminarRol).toHaveBeenCalledWith('encargado');
    expect(componente.mensaje()).toContain('eliminado');
  });

  it('busca usuarios desde la primera página', async () => {
    componente.paginaUsuarios.set(3);
    componente.textoUsuarios.set('ana');
    componente.buscarUsuarios(new Event('submit'));
    await fixture.whenStable();

    expect(componente.paginaUsuarios()).toBe(1);
    expect(supabaseMock.getUsuariosDeRol).toHaveBeenLastCalledWith('ana', 10, 0);
  });
});
