import { describe, expect, it } from 'vitest';
import { RegistroActividad } from '../../../models/actividad.model';
import {
  claseAccion,
  cambiosDe,
  entidadLegible,
  etiquetaAccion,
  mensajeErrorActividad,
  referencia,
  resumenCambio,
  totalPaginas,
  valorLegible,
} from './log-datos';

function registro(parcial: Partial<RegistroActividad> = {}): RegistroActividad {
  return {
    id: 1,
    created_at: '2026-11-14T12:30:00Z',
    usuario_nombre: 'Ana Pérez',
    rol: 'admin',
    accion: 'candy_modificado',
    entidad: 'productos_candy',
    entidad_id: '5',
    detalle: {},
    total: 42,
    ...parcial,
  };
}

describe('log-datos', () => {
  describe('etiquetas', () => {
    it('traduce las acciones conocidas', () => {
      expect(etiquetaAccion('qr_validado')).toBe('QR validado');
      expect(etiquetaAccion('funcion_creada')).toBe('Función creada');
    });

    it('deja legible una acción desconocida', () => {
      expect(etiquetaAccion('precio_actualizado')).toBe('precio actualizado');
    });

    it('agrupa las acciones por tipo para el color del badge', () => {
      expect(claseAccion('funcion_creada')).toBe('alta');
      expect(claseAccion('candy_modificado')).toBe('edicion');
      expect(claseAccion('pelicula_eliminada')).toBe('baja');
      expect(claseAccion('qr_validado')).toBe('validacion');
      expect(claseAccion('compra_cancelada')).toBe('cancelacion');
    });

    it('nombra las entidades en castellano', () => {
      expect(entidadLegible('funciones')).toBe('Función');
      expect(entidadLegible('otra_cosa')).toBe('otra_cosa');
    });
  });

  describe('detalle del cambio', () => {
    const conCambios = registro({
      detalle: {
        precio: { antes: 1000, despues: 1200 },
        nombre: { antes: 'Pochoclo', despues: 'Pochoclo grande' },
      },
    });

    it('lista solo las columnas que cambiaron', () => {
      expect(cambiosDe(conCambios.detalle).map((cambio) => cambio.campo)).toEqual([
        'precio',
        'nombre',
      ]);
    });

    it('ignora `nuevo` y `anterior`', () => {
      const alta = registro({ detalle: { nuevo: { nombre: 'Pochoclo', precio: 100 } } });

      expect(cambiosDe(alta.detalle)).toHaveLength(0);
    });

    it('resume la edición como antes → después', () => {
      expect(resumenCambio(conCambios)).toContain('precio: 1.000 → 1.200');
    });

    it('resume el alta con los campos más importantes', () => {
      const alta = registro({
        accion: 'candy_creado',
        detalle: { nuevo: { id: 9, nombre: 'Pochoclo', precio: 100, stock: 30 } },
      });

      expect(resumenCambio(alta)).toBe('nombre: Pochoclo · precio: 100 · stock: 30');
    });

    it('devuelve vacío si el detalle no tiene datos', () => {
      expect(resumenCambio(registro())).toBe('');
    });

    it('formatea nulos, booleanos y números', () => {
      expect(valorLegible(null)).toBe('—');
      expect(valorLegible('')).toBe('—');
      expect(valorLegible(true)).toBe('Sí');
      expect(valorLegible(1234)).toBe('1.234');
      expect(valorLegible(['a', 'b'])).toBe('a, b');
      expect(valorLegible({ a: 1 })).toBe('{"a":1}');
    });
  });

  describe('referencia', () => {
    it('usa el id de la fila', () => {
      expect(referencia(registro())).toBe('#5');
    });

    it('muestra la clave de configuración', () => {
      const configuracion = registro({
        entidad: 'configuracion',
        entidad_id: null,
        detalle: { nuevo: { clave: 'descuento_cincuenta', valor: 15 } },
      });

      expect(referencia(configuracion)).toBe('clave descuento_cincuenta');
    });
  });

  describe('paginación y errores', () => {
    it('calcula el total de páginas', () => {
      expect(totalPaginas(0)).toBe(1);
      expect(totalPaginas(25)).toBe(1);
      expect(totalPaginas(26)).toBe(2);
    });

    it('explica cuando falta la migración', () => {
      expect(mensajeErrorActividad('PGRST202 could not find')).toContain('20261114130000');
    });

    it('traduce el error de permisos', () => {
      expect(mensajeErrorActividad('NO_AUTORIZADO')).toContain('Solo un administrador');
    });
  });
});
