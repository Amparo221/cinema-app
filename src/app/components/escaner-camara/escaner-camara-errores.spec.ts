import { describe, expect, it } from 'vitest';
import { ERROR_CAMARA, mensajeErrorCamara } from './escaner-camara-errores';

describe('escaner-camara-errores', () => {
  it('explica cuando el navegador bloqueó la cámara', () => {
    const causa = new DOMException('Permission denied', 'NotAllowedError');

    expect(mensajeErrorCamara(causa)).toContain('bloqueó la cámara');
  });

  it('entiende los errores que html5-qrcode rechaza como string', () => {
    expect(
      mensajeErrorCamara('Error getting userMedia, error = NotAllowedError: Permission denied')
    ).toContain('bloqueó la cámara');
  });

  it('avisa cuando no hay ninguna cámara conectada', () => {
    expect(
      mensajeErrorCamara('Error getting userMedia, error = NotFoundError: Requested device not found')
    ).toContain('ninguna cámara conectada');
  });

  it('avisa cuando otra aplicación está usando la cámara', () => {
    const causa = new DOMException('Could not start video source', 'NotReadableError');

    expect(mensajeErrorCamara(causa)).toContain('Otra aplicación');
  });

  it('avisa cuando la cámara rechaza la resolución pedida', () => {
    const causa = new DOMException('constraint', 'OverconstrainedError');

    expect(mensajeErrorCamara(causa)).toContain('resolución');
  });

  it('pide https cuando el navegador no soporta el streaming', () => {
    expect(mensajeErrorCamara('Camera streaming is not supported in this browser.')).toContain(
      'https o por localhost'
    );
  });

  it('no confunde un problema del DOM con un problema de permisos', () => {
    const mensaje = mensajeErrorCamara('HTML Element with id=escaner-abc not found');

    expect(mensaje).toBe(ERROR_CAMARA);
    expect(mensaje).toContain('permisos del navegador');
  });

  it('deja un mensaje genérico con causas desconocidas', () => {
    expect(mensajeErrorCamara(undefined)).toBe(ERROR_CAMARA);
    expect(mensajeErrorCamara({})).toBe(ERROR_CAMARA);
    expect(mensajeErrorCamara(new Error('boom'))).toBe(ERROR_CAMARA);
  });
});
