import { describe, expect, it } from 'vitest';
import {
  mensajeErrorCancelarFuncion,
  mensajeErrorCombo,
  mensajeErrorDescuentos,
  mensajeErrorFunciones,
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

  describe('mensajeErrorFunciones', () => {
    it('explica el choque de sala', () => {
      expect(mensajeErrorFunciones('FUNCION_SOLAPADA')).toContain('30 minutos');
    });

    it('explica que no hay salas libres', () => {
      expect(mensajeErrorFunciones('SIN_SALAS_DISPONIBLES')).toContain('No hay salas libres');
    });

    it('explica una ventana horaria insuficiente', () => {
      expect(mensajeErrorFunciones('VENTANA_INSUFICIENTE')).toContain('ventana horaria');
    });

    it('explica el rechazo por rol', () => {
      expect(mensajeErrorFunciones('NO_AUTORIZADO')).toBe(
        'Solo un administrador puede programar funciones.'
      );
    });

    it('avisa si falta la migración', () => {
      expect(
        mensajeErrorFunciones('function public.crear_funciones_manuales(bigint, jsonb) does not exist')
      ).toContain('20261114160000_funciones_programacion.sql');
    });
  });

  describe('mensajeErrorCancelarFuncion', () => {
    it('explica el rechazo por rol', () => {
      expect(mensajeErrorCancelarFuncion('NO_AUTORIZADO')).toBe(
        'Solo un administrador puede cancelar funciones.'
      );
    });

    it('explica que la función ya empezó', () => {
      expect(mensajeErrorCancelarFuncion('FUNCION_EN_PASADO')).toBe(
        'La función ya comenzó: no se puede cancelar.'
      );
    });

    it('explica que la función ya estaba cancelada', () => {
      expect(mensajeErrorCancelarFuncion('FUNCION_YA_CANCELADA')).toContain('ya estaba cancelada');
    });

    it('avisa si falta la migración', () => {
      expect(
        mensajeErrorCancelarFuncion('function public.cancelar_funcion(bigint) does not exist')
      ).toContain('20261114170000_cancelar_funcion.sql');
    });
  });
});
