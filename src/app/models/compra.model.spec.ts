import {
  CompraCancelable,
  creditosDeCancelacion,
  horasHastaLaFuncion,
  mensajeErrorCancelacion,
  motivoNoCancelable,
  puedeCancelarCompra,
  textoNoCancelable,
} from './compra.model';

/** Un miércoles a las 20:00, con la función a las 23:00. */
const AHORA = new Date('2026-11-25T20:00:00');

function compra(extra: Partial<CompraCancelable> = {}): CompraCancelable {
  return {
    usuario_id: 'usuario-1',
    estado: 'valida',
    combo_id: null,
    precio_butacas: 10000,
    descuento_primera_compra: 2000,
    descuento_cincuenta: 0,
    funciones: { fecha: '2026-11-25', hora: '23:00:00' },
    ...extra,
  };
}

describe('compra.model (cancelación)', () => {
  it('devuelve el precio de butacas después de los descuentos', () => {
    expect(creditosDeCancelacion(compra())).toBe(8000);
    expect(creditosDeCancelacion(compra({ descuento_cincuenta: 1000 }))).toBe(7000);
  });

  it('no devuelve nada cuando la compra es con combo', () => {
    expect(creditosDeCancelacion(compra({ combo_id: 3 }))).toBe(0);
  });

  it('calcula las horas que faltan para la función', () => {
    expect(horasHastaLaFuncion(compra(), AHORA)).toBe(3);
    expect(horasHastaLaFuncion(compra({ funciones: null }), AHORA)).toBeNull();
  });

  it('solo permite cancelar hasta 2 horas antes de la función', () => {
    expect(puedeCancelarCompra(compra(), 'usuario-1', AHORA)).toBe(true);

    const justo = compra({ funciones: { fecha: '2026-11-25', hora: '22:00:00' } });
    expect(puedeCancelarCompra(justo, 'usuario-1', AHORA)).toBe(true);

    const tarde = compra({ funciones: { fecha: '2026-11-25', hora: '21:59:00' } });
    expect(puedeCancelarCompra(tarde, 'usuario-1', AHORA)).toBe(false);
  });

  it('explica el motivo por el que no se puede cancelar', () => {
    expect(motivoNoCancelable(compra({ combo_id: 3 }), 'usuario-1', AHORA)).toBe('combo');
    expect(motivoNoCancelable(compra({ estado: 'usada' }), 'usuario-1', AHORA)).toBe('estado');
    expect(motivoNoCancelable(compra({ usuario_id: 'otro' }), 'usuario-1', AHORA)).toBe('usuario');
    expect(motivoNoCancelable(compra({ funciones: null }), 'usuario-1', AHORA)).toBe('funcion');
    expect(
      motivoNoCancelable(
        compra({ funciones: { fecha: '2026-11-25', hora: '21:00:00' } }),
        'usuario-1',
        AHORA,
      ),
    ).toBe('tiempo');
    expect(motivoNoCancelable(compra(), 'usuario-1', AHORA)).toBeNull();
  });

  it('traduce los motivos a texto para la pantalla', () => {
    expect(textoNoCancelable('combo')).toContain('combo');
    expect(textoNoCancelable('tiempo')).toContain('2 horas');
    expect(textoNoCancelable('estado')).toContain('ya no se puede cancelar');
  });

  it('traduce los errores de la RPC de cancelación', () => {
    expect(mensajeErrorCancelacion('COMPRA_COMBO_NO_CANCELABLE')).toContain('combo');
    expect(mensajeErrorCancelacion('COMPRA_YA_CANCELADA')).toContain('ya estaba cancelada');
    expect(mensajeErrorCancelacion('NO_AUTORIZADO')).toContain('No podés');
    expect(mensajeErrorCancelacion('cualquier cosa')).toBe(
      'No se pudo cancelar la compra. Intentá nuevamente.',
    );
  });
});
