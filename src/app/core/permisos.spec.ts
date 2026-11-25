import {
  normalizarSecciones,
  rutaInicial,
  seccionesDeRolSistema,
  tienePermiso,
} from './permisos';

describe('permisos de administración', () => {
  it('da al admin todas las secciones del panel', () => {
    const secciones = seccionesDeRolSistema('admin');

    expect(tienePermiso(secciones, 'general')).toBe(true);
    expect(tienePermiso(secciones, 'escaner')).toBe(true);
    expect(tienePermiso(secciones, 'reporte')).toBe(true);
    expect(tienePermiso(secciones, 'log')).toBe(true);
    expect(tienePermiso(secciones, 'propuestas')).toBe(true);
  });

  it('reserva la administración de roles al dueño', () => {
    expect(tienePermiso(seccionesDeRolSistema('dueno'), 'roles')).toBe(true);
    expect(tienePermiso(seccionesDeRolSistema('admin'), 'roles')).toBe(false);
  });

  it('limita al empleado a la sección de escáner', () => {
    const secciones = seccionesDeRolSistema('empleado');

    expect(tienePermiso(secciones, 'escaner')).toBe(true);
    expect(tienePermiso(secciones, 'general')).toBe(false);
    expect(tienePermiso(secciones, 'reporte')).toBe(false);
    expect(tienePermiso(secciones, 'log')).toBe(false);
  });

  it('no da acceso a usuarios registrados ni anónimos', () => {
    expect(seccionesDeRolSistema('registrado')).toEqual([]);
    expect(seccionesDeRolSistema('anonimo')).toEqual([]);
    expect(tienePermiso([], 'general')).toBe(false);
    expect(tienePermiso(undefined, 'escaner')).toBe(false);
  });

  it('acepta las secciones de un rol propio', () => {
    expect(tienePermiso(['reporte'], 'reporte')).toBe(true);
    expect(tienePermiso(['reporte'], 'general')).toBe(false);
  });

  it('descarta las secciones que el frontend no conoce', () => {
    expect(normalizarSecciones(['general', 'inventada', 'log'])).toEqual(['general', 'log']);
    expect(normalizarSecciones(null)).toEqual([]);
  });

  it('elige la primera pantalla según los permisos', () => {
    expect(rutaInicial(['general', 'log'])).toBe('/admin/general');
    expect(rutaInicial(['log'])).toBe('/admin/log');
    expect(rutaInicial(['escaner'])).toBe('/escaner');
    expect(rutaInicial(['propuestas'])).toBe('/admin/propuestas');
    expect(rutaInicial(['roles'])).toBe('/admin/roles');
    expect(rutaInicial([])).toBe('/main');
  });
});

