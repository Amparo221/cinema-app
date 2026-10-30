import { describe, expect, it } from 'vitest';
import { mensajeErrorEscaner } from './escaner-errores';

describe('escaner-errores', () => {
  it('explica cuando el usuario no tiene rol para escanear', () => {
    expect(mensajeErrorEscaner('SIN_PERMISO')).toContain('rol empleado');
  });

  it('explica cuando el QR no pertenece a ninguna compra', () => {
    expect(mensajeErrorEscaner('QR_NO_ENCONTRADO')).toContain('no corresponde a ninguna compra');
  });

  it('explica que la entrada ya fue usada', () => {
    expect(mensajeErrorEscaner('QR_YA_USADO')).toContain('ya fue usada');
  });

  it('explica que la compra fue cancelada', () => {
    expect(mensajeErrorEscaner('QR_CANCELADA')).toContain('cancelada');
  });

  it('explica cuando la cámara no leyó nada', () => {
    expect(mensajeErrorEscaner('QR_INVALIDO')).toContain('No leímos ningún código');
  });

  it('avisa si falta correr la migración', () => {
    expect(mensajeErrorEscaner('function public.consultar_entrada_qr does not exist')).toContain(
      '20261029160000_escaner_entradas.sql'
    );
    expect(mensajeErrorEscaner('Could not find the function in the schema cache')).toContain(
      '20261029160000_escaner_entradas.sql'
    );
  });

  it('detecta errores de permisos de Postgres', () => {
    expect(mensajeErrorEscaner('permission denied for function validar_entrada_qr')).toContain(
      'Volvé a iniciar sesión'
    );
  });

  it('deja un mensaje genérico cuando no reconoce el error', () => {
    expect(mensajeErrorEscaner('timeout')).toBe('No pudimos validar la entrada. Intentá de nuevo.');
    expect(mensajeErrorEscaner('')).toBe('No pudimos validar la entrada. Intentá de nuevo.');
  });
});
