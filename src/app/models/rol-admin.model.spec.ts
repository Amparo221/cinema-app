import {
  DatosRol,
  esRolProtegido,
  mensajeErrorRol,
  nombreCompleto,
  puedeAsignarRolA,
  puedeEditarRol,
  puedeEliminarRol,
  validarRol,
} from './rol-admin.model';

const VALIDO: DatosRol = {
  nombre: 'encargado_sala',
  etiqueta: 'Encargado de sala',
  secciones: ['reporte', 'log'],
};

describe('rol-admin.model', () => {
  it('acepta un rol propio completo', () => {
    expect(validarRol(VALIDO, false)).toEqual({});
  });

  it('exige el formato del nombre cuando se crea', () => {
    // El formulario baja a minúsculas antes de validar, igual que la base.
    expect(validarRol({ ...VALIDO, nombre: 'Encargado' }, false)).toEqual({});
    expect(validarRol({ ...VALIDO, nombre: 'encargado sala' }, false).nombre).toBeDefined();
    expect(validarRol({ ...VALIDO, nombre: 'ab' }, false).nombre).toBeDefined();
  });

  it('no valida el nombre al editar', () => {
    expect(validarRol({ ...VALIDO, nombre: '' }, true)).toEqual({});
  });

  it('pide etiqueta y al menos una sección', () => {
    const errores = validarRol({ ...VALIDO, etiqueta: '  ', secciones: [] }, true);

    expect(errores.etiqueta).toContain('1 y 40');
    expect(errores.secciones).toContain('al menos una');
  });

  it('explica qué pasó cuando falla la base', () => {
    expect(mensajeErrorRol('ROL_SISTEMA')).toContain('no se pueden editar');
    expect(mensajeErrorRol('ROL_PROTEGIDO')).toContain('base de los permisos');
    expect(mensajeErrorRol('ROL_EN_USO')).toContain('usuarios asignados');
    expect(mensajeErrorRol('ROL_PROPIO')).toBe('No podés cambiarte el rol a vos mismo.');
    expect(mensajeErrorRol('otro')).toBe('No se pudo completar la acción. Intentá nuevamente.');
  });

  it('protege al dueño y a los clientes, pero deja ajustar empleado y admin', () => {
    expect(esRolProtegido({ nombre: 'dueno', es_sistema: true })).toBe(true);
    expect(esRolProtegido({ nombre: 'registrado', es_sistema: true })).toBe(true);
    expect(esRolProtegido({ nombre: 'encargado_sala', es_sistema: false })).toBe(false);

    expect(puedeEditarRol({ nombre: 'empleado', es_sistema: true })).toBe(true);
    expect(puedeEditarRol({ nombre: 'admin', es_sistema: true })).toBe(true);
    expect(puedeEditarRol({ nombre: 'dueno', es_sistema: true })).toBe(false);
    expect(puedeEditarRol({ nombre: 'registrado', es_sistema: true })).toBe(false);
    expect(puedeEditarRol({ nombre: 'encargado_sala', es_sistema: false })).toBe(true);
  });

  it('solo permite borrar los roles creados desde el panel', () => {
    expect(puedeEliminarRol({ es_sistema: true })).toBe(false);
    expect(puedeEliminarRol({ es_sistema: false })).toBe(true);
  });

  it('muestra nombre y apellido, o el email si no los cargó', () => {
    expect(
      nombreCompleto({ nombre: 'Ana', apellido: 'Pérez', email: 'ana@cine.com' }),
    ).toBe('Ana Pérez');
    expect(nombreCompleto({ nombre: '', apellido: '', email: 'ana@cine.com' })).toBe(
      'ana@cine.com',
    );
  });

  it('no deja tocar el rol propio', () => {
    expect(puedeAsignarRolA('usuario-2', 'usuario-1')).toBe(true);
    expect(puedeAsignarRolA('usuario-1', 'usuario-1')).toBe(false);
    expect(puedeAsignarRolA('usuario-1', undefined)).toBe(true);
  });
});
