import {
  DatosPropuesta,
  datosPeliculaDesdePropuesta,
  etiquetaEstadoPropuesta,
  mensajeErrorPropuesta,
  puedeEnviarPropuesta,
  validarPropuesta,
} from './propuesta.model';

const VALIDA: DatosPropuesta = {
  titulo: 'El viaje de Chihiro',
  descripcion: 'Una nena entra a un mundo de espíritus y tiene que rescatar a sus papás.',
  motivo: 'Nunca la dieron en el cine de acá y es mi favorita.',
};

describe('propuesta.model', () => {
  it('acepta una propuesta completa', () => {
    expect(validarPropuesta(VALIDA)).toEqual({});
  });

  it('pide un título de al menos 3 caracteres', () => {
    expect(validarPropuesta({ ...VALIDA, titulo: '  ab ' }).titulo).toContain('al menos 3');
  });

  it('pide descripción y motivo de al menos 10 caracteres', () => {
    const errores = validarPropuesta({ ...VALIDA, descripcion: 'corta', motivo: 'corto' });

    expect(errores.descripcion).toContain('al menos 10');
    expect(errores.motivo).toContain('al menos 10');
  });

  it('no deja superar los máximos de la tabla', () => {
    const errores = validarPropuesta({
      ...VALIDA,
      titulo: 'a'.repeat(121),
      descripcion: 'b'.repeat(1001),
    });

    expect(errores.titulo).toContain('120');
    expect(errores.descripcion).toContain('1000');
  });

  it('no deja enviar con una propuesta pendiente', () => {
    expect(puedeEnviarPropuesta(VALIDA, false)).toBe(true);
    expect(puedeEnviarPropuesta(VALIDA, true)).toBe(false);
    expect(puedeEnviarPropuesta({ ...VALIDA, motivo: '' }, false)).toBe(false);
  });

  it('traduce el estado para mostrarlo', () => {
    expect(etiquetaEstadoPropuesta('pendiente')).toBe('Pendiente');
    expect(etiquetaEstadoPropuesta('aceptada')).toBe('Aceptada');
    expect(etiquetaEstadoPropuesta('rechazada')).toBe('Rechazada');
    expect(etiquetaEstadoPropuesta('otro')).toBe('otro');
  });

  it('explica qué pasó cuando falla la base', () => {
    expect(mensajeErrorPropuesta('duplicate key value (23505)')).toContain('pendiente');
    expect(mensajeErrorPropuesta('PROPUESTA_YA_RESUELTA')).toContain('ya resolvió');
    expect(mensajeErrorPropuesta('PELICULA_REQUERIDA')).toContain('Primero creá la película');
    expect(mensajeErrorPropuesta('there is no unique or exclusion constraint')).toContain(
      'Reintentá la aceptación',
    );
    // El error real se muestra: sin él, la propuesta pendiente era invisible.
    expect(mensajeErrorPropuesta('there is no unique or exclusion constraint')).toContain(
      'there is no unique or exclusion constraint',
    );
    expect(mensajeErrorPropuesta('cualquier cosa')).toBe(
      'No se pudo completar la acción. Intentá nuevamente. (cualquier cosa)',
    );
  });

  it('recorta el detalle técnico para que entre en la alerta', () => {
    const largo = 'x'.repeat(400);

    expect(mensajeErrorPropuesta(largo)).toContain('x'.repeat(157) + '...');
    expect(mensajeErrorPropuesta(largo)).not.toContain('x'.repeat(158));
    expect(mensajeErrorPropuesta('   ')).toBe(
      'No se pudo completar la acción. Intentá nuevamente.',
    );
  });

  it('precarga el alta de película con lo que propuso el cliente', () => {
    const datos = datosPeliculaDesdePropuesta(VALIDA);

    expect(datos.nombre).toBe(VALIDA.titulo);
    expect(datos.sinopsis).toBe(VALIDA.descripcion);
    expect(datos.generos).toEqual([]);
    expect(datos.proximamente).toBe(false);
  });
});
