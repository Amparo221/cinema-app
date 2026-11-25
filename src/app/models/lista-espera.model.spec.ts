import { describe, expect, it } from 'vitest';
import {
  EsperaButaca,
  MINUTOS_RECLAMO,
  esperaEnCola,
  mensajeErrorListaEspera,
  minutosRestantesReclamo,
  reclamoVigente,
  textoEstadoEspera,
} from './lista-espera.model';

const AHORA = new Date('2026-11-24T12:00:00.000Z').getTime();

function espera(cambios: Partial<EsperaButaca> = {}): EsperaButaca {
  return {
    id: 1,
    funcion_id: 7,
    usuario_id: 'usuario-1',
    estado: 'esperando',
    butaca_reservada: null,
    notificado_at: null,
    reclamo_expira_at: null,
    created_at: '2026-11-24T11:00:00.000Z',
    ...cambios,
  };
}

describe('esperaEnCola', () => {
  it('solo cuenta esperando y notificado', () => {
    expect(esperaEnCola(espera())).toBe(true);
    expect(esperaEnCola(espera({ estado: 'notificado' }))).toBe(true);
    expect(esperaEnCola(espera({ estado: 'reclamado' }))).toBe(false);
    expect(esperaEnCola(espera({ estado: 'vencido' }))).toBe(false);
    expect(esperaEnCola(espera({ estado: 'cancelado' }))).toBe(false);
    expect(esperaEnCola(null)).toBe(false);
  });
});

describe('reclamoVigente', () => {
  it('exige estado notificado y fecha futura', () => {
    const vigente = espera({
      estado: 'notificado',
      reclamo_expira_at: new Date(AHORA + 5 * 60000).toISOString(),
    });

    expect(reclamoVigente(vigente, AHORA)).toBe(true);
    expect(reclamoVigente(espera({ estado: 'esperando' }), AHORA)).toBe(false);
    expect(reclamoVigente(espera({ estado: 'notificado' }), AHORA)).toBe(false);
  });

  it('vence justo en la fecha limite', () => {
    const vencida = espera({
      estado: 'notificado',
      reclamo_expira_at: new Date(AHORA).toISOString(),
    });

    expect(reclamoVigente(vencida, AHORA)).toBe(false);
  });
});

describe('minutosRestantesReclamo', () => {
  it('redondea hacia arriba los minutos que quedan', () => {
    const aviso = espera({
      estado: 'notificado',
      reclamo_expira_at: new Date(AHORA + 4.5 * 60000).toISOString(),
    });

    expect(minutosRestantesReclamo(aviso, AHORA)).toBe(5);
    expect(MINUTOS_RECLAMO).toBe(10);
  });

  it('devuelve 0 sin aviso o con el aviso vencido', () => {
    expect(minutosRestantesReclamo(null, AHORA)).toBe(0);
    expect(minutosRestantesReclamo(espera(), AHORA)).toBe(0);

    const vencida = espera({
      estado: 'notificado',
      reclamo_expira_at: new Date(AHORA - 60000).toISOString(),
    });

    expect(minutosRestantesReclamo(vencida, AHORA)).toBe(0);
  });
});

describe('textoEstadoEspera', () => {
  it('describe cada estado', () => {
    expect(textoEstadoEspera(null)).toBe('');
    expect(textoEstadoEspera(espera())).toContain('lista de espera');
    expect(textoEstadoEspera(espera({ estado: 'notificado' }))).toContain('lugar');
    expect(
      textoEstadoEspera(espera({ estado: 'reclamado', butaca_reservada: 'R12' })),
    ).toContain('R12');
    expect(textoEstadoEspera(espera({ estado: 'vencido' }))).toContain('venció');
    expect(textoEstadoEspera(espera({ estado: 'cancelado' }))).toContain('Saliste');
  });
});

describe('mensajeErrorListaEspera', () => {
  it('traduce los codigos de las RPC', () => {
    expect(mensajeErrorListaEspera('HAY_BUTACAS_LIBRES')).toContain('butacas libres');
    expect(mensajeErrorListaEspera('USUARIO_REQUERIDO')).toContain('Iniciá sesión');
    expect(mensajeErrorListaEspera('TURNO_VENCIDO')).toContain('venció');
    expect(mensajeErrorListaEspera('SIN_BUTACAS')).toContain('Seguís en la lista');
  });

  it('tolera errores de Postgres y respuestas vacias', () => {
    expect(mensajeErrorListaEspera('PGRST202: could not find the function')).toContain(
      'No pudimos completar',
    );
    expect(mensajeErrorListaEspera(null)).toContain('No pudimos completar');
  });
});
