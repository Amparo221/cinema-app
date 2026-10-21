import { permisosDeRol, tienePermiso } from './permisos';

describe('permisos de administración', () => {
  it('permite al admin acceder a todas las secciones', () => {
    expect(tienePermiso('admin', 'general')).toBe(true);
    expect(tienePermiso('admin', 'escaner')).toBe(true);
    expect(tienePermiso('admin', 'reporte')).toBe(true);
    expect(tienePermiso('admin', 'log')).toBe(true);
  });

  it('limita al empleado a la sección de escáner', () => {
    expect(tienePermiso('empleado', 'escaner')).toBe(true);
    expect(tienePermiso('empleado', 'general')).toBe(false);
    expect(tienePermiso('empleado', 'reporte')).toBe(false);
    expect(tienePermiso('empleado', 'log')).toBe(false);
  });

  it('no da acceso a usuarios registrados ni anónimos', () => {
    expect(permisosDeRol('registrado')).toEqual([]);
    expect(permisosDeRol('anonimo')).toEqual([]);
    expect(tienePermiso('registrado', 'general')).toBe(false);
    expect(tienePermiso('anonimo', 'escaner')).toBe(false);
  });
});
