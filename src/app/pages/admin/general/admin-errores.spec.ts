import { describe, expect, it } from 'vitest';
import {
  mensajeErrorCombo,
  mensajeErrorDescuentos,
  mensajeErrorPelicula,
} from './admin-errores';

describe('admin-errores', () => {
  describe('mensajeErrorPelicula', () => {
    it('explica el choque de salas al mover el estreno', () => {
      expect(mensajeErrorPelicula('SIN_SALAS_DISPONIBLES')).toContain('No hay salas libres');
    });

    it('explica cuando la preventa ya tiene ventas', () => {
      expect(mensajeErrorPelicula('FUNCIONES_CON_VENTAS')).toContain(
        'butacas vendidas o bloqueadas'
      );
    });

    it('explica el check de clasificación', () => {
      expect(
        mensajeErrorPelicula('new row violates check constraint "peliculas_restriccion_edad_check"')
      ).toContain('13+');
    });

    it('detecta un update bloqueado por RLS', () => {
      expect(mensajeErrorPelicula('PELICULA_NO_ACTUALIZADA')).toContain(
        'permisos de administrador'
      );
      expect(mensajeErrorPelicula('new row violates row-level security policy')).toContain(
        'permisos de administrador'
      );
    });

    it('deja el mensaje crudo cuando no lo reconoce', () => {
      expect(mensajeErrorPelicula('timeout')).toBe('No se pudo guardar la película: timeout');
    });
  });

  describe('mensajeErrorCombo', () => {
    it('explica el check de puntos y productos', () => {
      expect(mensajeErrorCombo('violates check constraint "combos_puntos_check"')).toContain(
        'Revisá los puntos'
      );
    });

    it('explica una foreign key rota', () => {
      expect(mensajeErrorCombo('insert or update violates foreign key constraint (23503)')).toContain(
        'ya no existe'
      );
    });

    it('detecta un update bloqueado por RLS', () => {
      expect(mensajeErrorCombo('COMBO_NO_ACTUALIZADO')).toContain('permisos de administrador');
    });
  });

  describe('mensajeErrorDescuentos', () => {
    it('explica el rechazo de la RPC por rol', () => {
      expect(mensajeErrorDescuentos('NO_AUTORIZADO')).toBe(
        'Solo un administrador puede cambiar los descuentos.'
      );
    });

    it('explica porcentajes inválidos', () => {
      expect(mensajeErrorDescuentos('DESCUENTO_INVALIDO')).toContain('entre 0 y 100');
    });

    it('avisa si falta la migración', () => {
      expect(
        mensajeErrorDescuentos('function public.guardar_descuentos(numeric, numeric) does not exist')
      ).toContain('20261029150000_admin_descuentos.sql');
    });
  });
});
